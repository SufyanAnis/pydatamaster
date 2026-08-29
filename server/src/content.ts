import { db, parseJsonArray } from "./db.js";
import type { ChartType, Lesson, Module, PipelineStep, Post, QuizQuestion, Resource } from "./types.js";

type Row = Record<string, any>;

function rowToQuiz(r: Row): QuizQuestion {
  return {
    id: r.id,
    question: r.question,
    options: parseJsonArray(r.options),
    correctAnswer: Number(r.correct_index) || 0,
    explanation: r.explanation ?? "",
  };
}

export function rowToLesson(r: Row, quiz: QuizQuestion[] = []): Lesson {
  return {
    id: r.id,
    moduleId: r.module_id,
    title: r.title,
    summary: r.summary ?? "",
    content: r.content ?? "",
    codeExample: r.code_example ?? "",
    chartType: (r.chart_type as ChartType) || "none",
    xp: Number(r.xp) || 50,
    durationMin: Number(r.duration_min) || 8,
    orderIndex: Number(r.order_index) || 0,
    published: !!r.published,
    quiz,
    updatedAt: r.updated_at,
  };
}

export function rowToModule(r: Row, lessons: Lesson[] = []): Module {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    library: r.library ?? "",
    icon: r.icon ?? "BookOpen",
    color: r.color ?? "blue",
    level: r.level ?? "Beginner",
    orderIndex: Number(r.order_index) || 0,
    published: !!r.published,
    lessons,
    updatedAt: r.updated_at,
  };
}

export function loadQuizForLessons(lessonIds: string[]): Map<string, QuizQuestion[]> {
  const map = new Map<string, QuizQuestion[]>();
  if (lessonIds.length === 0) return map;
  const placeholders = lessonIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM quiz_questions WHERE lesson_id IN (${placeholders}) ORDER BY lesson_id, order_index, id`)
    .all(...lessonIds) as Row[];
  for (const r of rows) {
    const list = map.get(r.lesson_id) ?? [];
    list.push(rowToQuiz(r));
    map.set(r.lesson_id, list);
  }
  return map;
}

export function loadModules(opts: { includeUnpublished?: boolean } = {}): Module[] {
  const where = opts.includeUnpublished ? "" : "WHERE published = 1";
  const modRows = db.prepare(`SELECT * FROM modules ${where} ORDER BY order_index, title`).all() as Row[];
  const lessonRows = db
    .prepare(`SELECT * FROM lessons ${opts.includeUnpublished ? "" : "WHERE published = 1"} ORDER BY module_id, order_index, title`)
    .all() as Row[];
  const quizMap = loadQuizForLessons(lessonRows.map((l) => l.id));
  const byModule = new Map<string, Lesson[]>();
  for (const l of lessonRows) {
    const list = byModule.get(l.module_id) ?? [];
    list.push(rowToLesson(l, quizMap.get(l.id) ?? []));
    byModule.set(l.module_id, list);
  }
  return modRows.map((m) => rowToModule(m, byModule.get(m.id) ?? []));
}

export function loadLesson(lessonId: string, opts: { includeUnpublished?: boolean } = {}): { module: Module; lesson: Lesson } | null {
  const l = db.prepare("SELECT * FROM lessons WHERE id = ?").get(lessonId) as Row | undefined;
  if (!l) return null;
  if (!opts.includeUnpublished && !l.published) return null;
  const m = db.prepare("SELECT * FROM modules WHERE id = ?").get(l.module_id) as Row | undefined;
  if (!m) return null;
  if (!opts.includeUnpublished && !m.published) return null;
  const quiz = loadQuizForLessons([l.id]).get(l.id) ?? [];
  return { module: rowToModule(m), lesson: rowToLesson(l, quiz) };
}

export function rowToPost(r: Row): Post {
  return {
    id: r.id,
    title: r.title,
    excerpt: r.excerpt ?? "",
    content: r.content ?? "",
    category: r.category ?? "Tutorial",
    author: r.author ?? "PyData Team",
    readTime: r.read_time ?? "5 min read",
    published: !!r.published,
    publishedAt: r.published_at,
    views: Number(r.views) || 0,
    updatedAt: r.updated_at,
  };
}

export function loadPosts(opts: { includeUnpublished?: boolean; category?: string; q?: string; limit?: number } = {}): Post[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (!opts.includeUnpublished) clauses.push("published = 1");
  if (opts.category) {
    clauses.push("lower(category) = lower(?)");
    params.push(opts.category);
  }
  if (opts.q) {
    clauses.push("(lower(title) LIKE ? OR lower(excerpt) LIKE ? OR lower(content) LIKE ?)");
    const like = `%${opts.q.toLowerCase()}%`;
    params.push(like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = opts.limit ? `LIMIT ${Math.max(1, Math.min(200, opts.limit))}` : "";
  const rows = db.prepare(`SELECT * FROM posts ${where} ORDER BY published_at DESC ${limit}`).all(...params) as Row[];
  return rows.map(rowToPost);
}

export function loadPost(id: string, opts: { includeUnpublished?: boolean } = {}): Post | null {
  const r = db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as Row | undefined;
  if (!r) return null;
  if (!opts.includeUnpublished && !r.published) return null;
  return rowToPost(r);
}

export function rowToStep(r: Row): PipelineStep {
  return {
    id: r.id,
    number: Number(r.number) || 0,
    title: r.title,
    subtitle: r.subtitle ?? "",
    purpose: r.purpose ?? "",
    keyConcepts: parseJsonArray(r.key_concepts),
    coreLabel: r.core_label ?? "Core Functions",
    coreItems: parseJsonArray(r.core_items),
    scope: r.scope ?? "",
    outcome: r.outcome ?? "",
    phase: r.phase ?? "",
    group: r.group_name ?? "",
    color: r.color ?? "blue",
    bgColor: "",
    icon: r.icon ?? "Cpu",
  };
}

export function loadPipeline(): PipelineStep[] {
  const rows = db.prepare("SELECT * FROM pipeline_steps ORDER BY number").all() as Row[];
  return rows.map(rowToStep);
}

export function rowToResource(r: Row): Resource {
  return {
    id: Number(r.id),
    name: r.name,
    url: r.url ?? "",
    description: r.description ?? "",
    category: (r.category as Resource["category"]) || "docs",
    icon: r.icon ?? "Link",
    content: r.content ?? "",
    orderIndex: Number(r.order_index) || 0,
  };
}

export function loadResources(): Resource[] {
  const rows = db.prepare("SELECT * FROM resources ORDER BY order_index, id").all() as Row[];
  return rows.map(rowToResource);
}

export interface SearchHit {
  type: "lesson" | "post" | "pipeline" | "resource";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function searchAll(q: string, limit = 12): SearchHit[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  const like = `%${term}%`;
  const hits: SearchHit[] = [];

  const lessons = db
    .prepare(
      `SELECT l.id, l.title, l.summary, l.module_id, m.title AS module_title FROM lessons l JOIN modules m ON m.id = l.module_id
       WHERE l.published = 1 AND m.published = 1 AND (lower(l.title) LIKE ? OR lower(l.summary) LIKE ? OR lower(l.content) LIKE ?)
       ORDER BY m.order_index, l.order_index LIMIT ?`,
    )
    .all(like, like, like, limit) as Row[];
  for (const l of lessons) hits.push({ type: "lesson", id: l.id, title: l.title, subtitle: l.module_title, href: `/lesson/${l.module_id}/${l.id}` });

  const posts = db
    .prepare(`SELECT id, title, category FROM posts WHERE published = 1 AND (lower(title) LIKE ? OR lower(excerpt) LIKE ? OR lower(content) LIKE ?) ORDER BY published_at DESC LIMIT ?`)
    .all(like, like, like, limit) as Row[];
  for (const p of posts) hits.push({ type: "post", id: p.id, title: p.title, subtitle: `Blog / ${p.category}`, href: `/blog/${p.id}` });

  const steps = db
    .prepare(`SELECT id, title, subtitle FROM pipeline_steps WHERE lower(title) LIKE ? OR lower(subtitle) LIKE ? OR lower(purpose) LIKE ? OR lower(key_concepts) LIKE ? ORDER BY number LIMIT ?`)
    .all(like, like, like, like, limit) as Row[];
  for (const s of steps) hits.push({ type: "pipeline", id: s.id, title: `${s.title} - ${s.subtitle}`, subtitle: "Data Science Pipeline", href: `/pipeline/${s.id}` });

  const res = db
    .prepare(`SELECT id, name, description, category, url FROM resources WHERE lower(name) LIKE ? OR lower(description) LIKE ? ORDER BY order_index LIMIT ?`)
    .all(like, like, limit) as Row[];
  for (const r of res)
    hits.push({
      type: "resource",
      id: String(r.id),
      title: r.name,
      subtitle: r.category === "cheatsheet" ? "Cheat sheet" : r.category === "tools" ? "Tool" : "Documentation",
      href: r.category === "cheatsheet" ? `/resources/cheatsheet/${r.id}` : r.url,
    });

  return hits.slice(0, limit);
}
