import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// Works both from src/ (tsx) and dist/ (compiled): ../data relative to this file.
const dataDir = path.resolve(here, "..", "data");

/** Expands a leading "~" or "$HOME" so DB_PATH can point into the hosting user's home directory. */
function expandHome(p: string): string {
  const home = os.homedir();
  if (p === "~" || p.startsWith("~/") || p.startsWith("~\\")) return path.join(home, p.slice(1));
  return p.replace(/^\$HOME(?=[\\/])/, home);
}

// On Vercel (read-only bundle) without a Turso database, fall back to /tmp so the app still runs
// (data is ephemeral there until TURSO_DATABASE_URL is configured).
export const DB_PATH = process.env.DB_PATH
  ? expandHome(process.env.DB_PATH)
  : process.env.VERCEL
    ? "/tmp/pydatamaster.db"
    : path.join(dataDir, "pydatamaster.db");

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

interface Driver {
  all(sql: string, params: any[]): Promise<Record<string, any>[]>;
  get(sql: string, params: any[]): Promise<Record<string, any> | undefined>;
  run(sql: string, params: any[]): Promise<RunResult>;
  exec(sql: string): Promise<void>;
}

// Tolerate the env-var names used by different Turso/Vercel integrations.
const TURSO_URL = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || "";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || undefined;

/** True when the libSQL (Turso) driver is active instead of the local node:sqlite file. */
export const isLibsql = !!TURSO_URL;

async function createLibsqlDriver(): Promise<Driver> {
  const { createClient } = await import("@libsql/client");
  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });
  // PRAGMAs are managed by the libSQL server; apply best-effort and ignore failures.
  try {
    await client.execute("PRAGMA foreign_keys = ON");
  } catch {
    // Not supported over this protocol; Turso enforces its own defaults.
  }
  return {
    async all(sql, params) {
      const result = await client.execute({ sql, args: params });
      return result.rows as unknown as Record<string, any>[];
    },
    async get(sql, params) {
      const result = await client.execute({ sql, args: params });
      return result.rows[0] as unknown as Record<string, any> | undefined;
    },
    async run(sql, params) {
      const result = await client.execute({ sql, args: params });
      return {
        changes: Number(result.rowsAffected) || 0,
        lastInsertRowid: result.lastInsertRowid === undefined ? 0 : Number(result.lastInsertRowid),
      };
    },
    async exec(sql) {
      await client.executeMultiple(sql);
    },
  };
}

async function createNodeSqliteDriver(): Promise<Driver> {
  const { DatabaseSync } = await import("node:sqlite");
  // Serverless bundles are read-only; only the DB_PATH parent (e.g. /tmp) must be writable.
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  } catch {
    // Directory may already exist or the filesystem is read-only; DatabaseSync will surface real errors.
  }
  const db = new DatabaseSync(DB_PATH);
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
  } catch {
    // PRAGMA support varies between builds; never fatal.
  }
  return {
    all(sql, params) {
      return Promise.resolve(db.prepare(sql).all(...(params as any[])) as Record<string, any>[]);
    },
    get(sql, params) {
      return Promise.resolve(db.prepare(sql).get(...(params as any[])) as Record<string, any> | undefined);
    },
    run(sql, params) {
      const result = db.prepare(sql).run(...(params as any[]));
      return Promise.resolve({
        changes: Number(result.changes),
        lastInsertRowid: Number(result.lastInsertRowid),
      });
    },
    exec(sql) {
      db.exec(sql);
      return Promise.resolve();
    },
  };
}

const driver: Driver = isLibsql ? await createLibsqlDriver() : await createNodeSqliteDriver();

/** Async query facade over the active driver. Params are always positional `?` arrays. */
export const q = {
  all<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T[]> {
    return driver.all(sql, params) as Promise<T[]>;
  },
  get<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T | undefined> {
    return driver.get(sql, params) as Promise<T | undefined>;
  },
  run(sql: string, params: any[] = []): Promise<RunResult> {
    return driver.run(sql, params);
  },
  exec(sql: string): Promise<void> {
    return driver.exec(sql);
  },
};

/** Normalizes BLOB column values (Uint8Array from node:sqlite, ArrayBuffer from libSQL) to a Node Buffer. */
export function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  return Buffer.alloc(0);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner',
  goal TEXT NOT NULL DEFAULT 'Data Analyst',
  level TEXT NOT NULL DEFAULT 'Beginner',
  status TEXT NOT NULL DEFAULT 'active',
  avatar_color TEXT NOT NULL DEFAULT 'blue',
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  library TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  color TEXT NOT NULL DEFAULT 'blue',
  level TEXT NOT NULL DEFAULT 'Beginner',
  order_index INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  code_example TEXT NOT NULL DEFAULT '',
  chart_type TEXT NOT NULL DEFAULT 'none',
  xp INTEGER NOT NULL DEFAULT 50,
  duration_min INTEGER NOT NULL DEFAULT 8,
  order_index INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, order_index);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quiz_lesson ON quiz_questions(lesson_id, order_index);

CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  ref_id TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id, created_at);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Tutorial',
  author TEXT NOT NULL DEFAULT 'PyData Team',
  read_time TEXT NOT NULL DEFAULT '5 min read',
  published INTEGER NOT NULL DEFAULT 1,
  published_at TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_steps (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  key_concepts TEXT NOT NULL DEFAULT '[]',
  core_label TEXT NOT NULL DEFAULT 'Core Functions',
  core_items TEXT NOT NULL DEFAULT '[]',
  scope TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',
  phase TEXT NOT NULL DEFAULT '',
  group_name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'blue',
  icon TEXT NOT NULL DEFAULT 'Cpu'
);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'docs',
  icon TEXT NOT NULL DEFAULT 'Link',
  content TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  profession TEXT NOT NULL DEFAULT '',
  education TEXT NOT NULL DEFAULT '',
  social TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  social_link TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'playground',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tutor_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  user_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);

CREATE TABLE IF NOT EXISTS categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  show_in_nav INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  name TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL
);
`;

export async function migrate(): Promise<void> {
  await q.exec(SCHEMA);
  // Additive column migrations for databases created before the blog pivot.
  let postCols: string[] = [];
  try {
    postCols = (await q.all<{ name: string }>("PRAGMA table_info(posts)")).map((c) => c.name);
  } catch {
    // PRAGMA introspection unavailable on this driver; fall through to the guarded ALTER.
  }
  if (!postCols.includes("cover_image")) {
    try {
      await q.exec("ALTER TABLE posts ADD COLUMN cover_image TEXT NOT NULL DEFAULT ''");
    } catch {
      // Column already exists.
    }
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function countRows(table: string, where = "", params: unknown[] = []): Promise<number> {
  const row = await q.get<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table} ${where}`, params as any[]);
  return Number(row?.c) || 0;
}
