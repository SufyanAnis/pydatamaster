import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db, nowIso, slugify, countRows, UPLOADS_DIR } from "../db.js";
import { findUserById, hashPassword, pickAvatarColor, requireAdmin, toPublicUser, type UserRow } from "../auth.js";
import { loadCategories, loadModules, loadPage, loadPages, loadPipeline, loadPost, loadPosts, loadResources, rowToCategory, rowToLesson, rowToModule, loadQuizForLessons } from "../content.js";
import { computeProgress } from "../progress-service.js";
import { getSiteSettings, maskedTutorSettings, saveSiteSettings, saveTutorSettings, getTutorSettings } from "../settings.js";
import { runTutor } from "./tutor.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

type Row = Record<string, any>;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function seriesByDay(table: string, dateCol: string, days: number, where = ""): { day: string; count: number }[] {
  const since = daysAgoIso(days - 1);
  const rows = db
    .prepare(`SELECT substr(${dateCol}, 1, 10) AS day, COUNT(*) AS count FROM ${table} WHERE ${dateCol} >= ? ${where} GROUP BY day ORDER BY day`)
    .all(since) as Row[];
  const map = new Map(rows.map((r) => [String(r.day), Number(r.count)]));
  const out: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = daysAgoIso(i).slice(0, 10);
    out.push({ day, count: map.get(day) ?? 0 });
  }
  return out;
}

// ---------------------------------------------------------------- Dashboard
adminRouter.get("/stats", (_req, res) => {
  const totals = {
    users: countRows("users"),
    learners: countRows("users", "WHERE role = 'learner'"),
    admins: countRows("users", "WHERE role = 'admin'"),
    modules: countRows("modules"),
    lessons: countRows("lessons"),
    posts: countRows("posts"),
    completions: countRows("progress"),
    quizAttempts: countRows("quiz_attempts"),
    newMessages: countRows("messages", "WHERE status = 'new'"),
    messages: countRows("messages"),
    waitlist: countRows("waitlist"),
    subscribers: countRows("subscribers", "WHERE status = 'active'"),
    tutorChats: countRows("tutor_logs"),
    pageViews30d: countRows("page_views", "WHERE created_at >= ?", [daysAgoIso(29)]),
    activeUsers7d: (db.prepare("SELECT COUNT(DISTINCT user_id) AS c FROM activity WHERE created_at >= ?").get(daysAgoIso(6)) as Row).c as number,
  };
  const signups = seriesByDay("users", "created_at", 30);
  const completions = seriesByDay("progress", "completed_at", 30);
  const pageViews = seriesByDay("page_views", "created_at", 30);
  const tutorUsage = seriesByDay("tutor_logs", "created_at", 30);

  const topLessons = db
    .prepare(
      `SELECT l.id, l.title, m.title AS module_title, COUNT(p.user_id) AS completions
       FROM lessons l JOIN modules m ON m.id = l.module_id LEFT JOIN progress p ON p.lesson_id = l.id
       GROUP BY l.id ORDER BY completions DESC, m.order_index, l.order_index LIMIT 6`,
    )
    .all() as Row[];

  const moduleProgress = db
    .prepare(
      `SELECT m.id, m.title, COUNT(DISTINCT l.id) AS lessons, COUNT(p.user_id) AS completions
       FROM modules m LEFT JOIN lessons l ON l.module_id = m.id LEFT JOIN progress p ON p.lesson_id = l.id
       GROUP BY m.id ORDER BY m.order_index`,
    )
    .all() as Row[];

  const topPages = db
    .prepare(`SELECT path, COUNT(*) AS views FROM page_views WHERE created_at >= ? GROUP BY path ORDER BY views DESC LIMIT 8`)
    .all(daysAgoIso(29)) as Row[];

  const recentUsers = (db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 6").all() as unknown as UserRow[]).map(toPublicUser);
  const recentMessages = db.prepare("SELECT id, first_name, last_name, email, substr(message, 1, 140) AS message, status, created_at FROM messages ORDER BY created_at DESC LIMIT 5").all() as Row[];
  const goals = db.prepare("SELECT goal, COUNT(*) AS count FROM users WHERE role = 'learner' GROUP BY goal ORDER BY count DESC").all() as Row[];
  const levels = db.prepare("SELECT level, COUNT(*) AS count FROM users WHERE role = 'learner' GROUP BY level ORDER BY count DESC").all() as Row[];

  res.json({ totals, signups, completions, pageViews, tutorUsage, topLessons, moduleProgress, topPages, recentUsers, recentMessages, goals, levels });
});

// ---------------------------------------------------------------- Users
adminRouter.get("/users", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const role = typeof req.query.role === "string" ? req.query.role : "";
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = 20;
  const clauses: string[] = [];
  const params: any[] = [];
  if (q) {
    clauses.push("(lower(name) LIKE ? OR lower(email) LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (role === "admin" || role === "learner") {
    clauses.push("role = ?");
    params.push(role);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = countRows("users", where, params);
  const rows = db
    .prepare(
      `SELECT u.*, (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id) AS lessons_done,
              (SELECT COALESCE(SUM(xp),0) FROM activity a WHERE a.user_id = u.id) AS xp
       FROM users u ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as unknown as (UserRow & { lessons_done: number; xp: number })[];
  res.json({
    users: rows.map((r) => ({ ...toPublicUser(r), lessonsDone: Number(r.lessons_done), xp: Number(r.xp) })),
    total,
    page,
    pageSize,
  });
});

adminRouter.get("/users/:id", (req, res) => {
  const row = findUserById(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: toPublicUser(row), progress: computeProgress(row.id) });
});

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(6),
  role: z.enum(["learner", "admin"]).default("learner"),
});

adminRouter.post("/users", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Name, valid email and a 6+ character password are required." });
    return;
  }
  const d = parsed.data;
  if (db.prepare("SELECT 1 FROM users WHERE lower(email) = lower(?)").get(d.email)) {
    res.status(409).json({ error: "Email already in use." });
    return;
  }
  const now = nowIso();
  const result = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, goal, level, status, avatar_color, created_at) VALUES (?, ?, ?, ?, 'Data Analyst', 'Beginner', 'active', ?, ?)`,
    )
    .run(d.name, d.email.toLowerCase(), await hashPassword(d.password), d.role, pickAvatarColor(d.email), now);
  res.status(201).json({ user: toPublicUser(findUserById(Number(result.lastInsertRowid))!) });
});

const patchUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["learner", "admin"]).optional(),
  status: z.enum(["active", "banned"]).optional(),
  goal: z.string().max(60).optional(),
  level: z.string().max(30).optional(),
  newPassword: z.string().min(6).optional(),
});

adminRouter.patch("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const row = findUserById(id);
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const parsed = patchUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user data" });
    return;
  }
  const d = parsed.data;
  const isSelf = req.user!.id === id;
  if (isSelf && (d.role === "learner" || d.status === "banned")) {
    res.status(400).json({ error: "You cannot demote or suspend your own account." });
    return;
  }
  if (row.role === "admin" && d.role === "learner" && countRows("users", "WHERE role = 'admin'") <= 1) {
    res.status(400).json({ error: "At least one admin must remain." });
    return;
  }
  db.prepare("UPDATE users SET name = ?, role = ?, status = ?, goal = ?, level = ? WHERE id = ?").run(
    d.name ?? row.name,
    d.role ?? row.role,
    d.status ?? row.status,
    d.goal ?? row.goal,
    d.level ?? row.level,
    id,
  );
  if (d.newPassword) db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashPassword(d.newPassword), id);
  res.json({ user: toPublicUser(findUserById(id)!) });
});

adminRouter.delete("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = findUserById(id);
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (req.user!.id === id) {
    res.status(400).json({ error: "You cannot delete your own account." });
    return;
  }
  if (row.role === "admin" && countRows("users", "WHERE role = 'admin'") <= 1) {
    res.status(400).json({ error: "At least one admin must remain." });
    return;
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Curriculum
adminRouter.get("/modules", (_req, res) => {
  res.json({ modules: loadModules({ includeUnpublished: true }) });
});

const moduleSchema = z.object({
  id: z.string().trim().max(80).optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().max(600).default(""),
  library: z.string().max(60).default(""),
  icon: z.string().max(40).default("BookOpen"),
  color: z.string().max(20).default("blue"),
  level: z.string().max(30).default("Beginner"),
  published: z.boolean().default(true),
});

adminRouter.post("/modules", (req, res) => {
  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A module needs at least a title." });
    return;
  }
  const d = parsed.data;
  let id = slugify(d.id || d.title);
  let n = 1;
  while (db.prepare("SELECT 1 FROM modules WHERE id = ?").get(id)) id = `${slugify(d.id || d.title)}-${++n}`;
  const order = (db.prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS o FROM modules").get() as Row).o as number;
  const now = nowIso();
  db.prepare(
    `INSERT INTO modules (id, title, description, library, icon, color, level, order_index, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, d.title, d.description, d.library, d.icon, d.color, d.level, order, d.published ? 1 : 0, now, now);
  res.status(201).json({ module: rowToModule(db.prepare("SELECT * FROM modules WHERE id = ?").get(id) as Row) });
});

adminRouter.put("/modules/:id", (req, res) => {
  const id = String(req.params.id);
  if (!db.prepare("SELECT 1 FROM modules WHERE id = ?").get(id)) {
    res.status(404).json({ error: "Module not found" });
    return;
  }
  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid module data" });
    return;
  }
  const d = parsed.data;
  db.prepare(`UPDATE modules SET title = ?, description = ?, library = ?, icon = ?, color = ?, level = ?, published = ?, updated_at = ? WHERE id = ?`).run(
    d.title,
    d.description,
    d.library,
    d.icon,
    d.color,
    d.level,
    d.published ? 1 : 0,
    nowIso(),
    id,
  );
  const lessons = (db.prepare("SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index").all(id) as Row[]).map((l) => rowToLesson(l, []));
  res.json({ module: rowToModule(db.prepare("SELECT * FROM modules WHERE id = ?").get(id) as Row, lessons) });
});

adminRouter.delete("/modules/:id", (req, res) => {
  db.prepare("DELETE FROM modules WHERE id = ?").run(String(req.params.id));
  res.json({ ok: true });
});

adminRouter.post("/modules/reorder", (req, res) => {
  const parsed = z.object({ ids: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ids required" });
    return;
  }
  const stmt = db.prepare("UPDATE modules SET order_index = ? WHERE id = ?");
  parsed.data.ids.forEach((id, i) => stmt.run(i, id));
  res.json({ ok: true });
});

const quizSchema = z.object({
  question: z.string().trim().min(3).max(500),
  options: z.array(z.string().max(300)).min(2).max(6),
  correctAnswer: z.number().int().min(0),
  explanation: z.string().max(1000).default(""),
});

const lessonSchema = z.object({
  id: z.string().trim().max(80).optional(),
  moduleId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  summary: z.string().max(600).default(""),
  content: z.string().max(60000).default(""),
  codeExample: z.string().max(20000).default(""),
  chartType: z.enum(["none", "bar", "line", "scatter", "hist"]).default("none"),
  xp: z.number().int().min(0).max(1000).default(50),
  durationMin: z.number().int().min(1).max(240).default(8),
  published: z.boolean().default(true),
  quiz: z.array(quizSchema).max(20).default([]),
});

function replaceQuiz(lessonId: string, quiz: z.infer<typeof quizSchema>[]) {
  db.prepare("DELETE FROM quiz_questions WHERE lesson_id = ?").run(lessonId);
  const ins = db.prepare("INSERT INTO quiz_questions (lesson_id, question, options, correct_index, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?)");
  quiz.forEach((q, i) => ins.run(lessonId, q.question, JSON.stringify(q.options), Math.min(q.correctAnswer, q.options.length - 1), q.explanation, i));
}

function lessonWithQuiz(id: string) {
  const row = db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as Row;
  return rowToLesson(row, loadQuizForLessons([id]).get(id) ?? []);
}

adminRouter.post("/lessons", (req, res) => {
  const parsed = lessonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A lesson needs a module and a title.", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  if (!db.prepare("SELECT 1 FROM modules WHERE id = ?").get(d.moduleId)) {
    res.status(400).json({ error: "Module does not exist" });
    return;
  }
  let id = slugify(d.id || d.title);
  let n = 1;
  while (db.prepare("SELECT 1 FROM lessons WHERE id = ?").get(id)) id = `${slugify(d.id || d.title)}-${++n}`;
  const order = (db.prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS o FROM lessons WHERE module_id = ?").get(d.moduleId) as Row).o as number;
  const now = nowIso();
  db.prepare(
    `INSERT INTO lessons (id, module_id, title, summary, content, code_example, chart_type, xp, duration_min, order_index, published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, d.moduleId, d.title, d.summary, d.content, d.codeExample, d.chartType, d.xp, d.durationMin, order, d.published ? 1 : 0, now, now);
  replaceQuiz(id, d.quiz);
  res.status(201).json({ lesson: lessonWithQuiz(id) });
});

adminRouter.put("/lessons/:id", (req, res) => {
  const id = String(req.params.id);
  if (!db.prepare("SELECT 1 FROM lessons WHERE id = ?").get(id)) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  const parsed = lessonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid lesson data", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  db.prepare(
    `UPDATE lessons SET module_id = ?, title = ?, summary = ?, content = ?, code_example = ?, chart_type = ?, xp = ?, duration_min = ?, published = ?, updated_at = ? WHERE id = ?`,
  ).run(d.moduleId, d.title, d.summary, d.content, d.codeExample, d.chartType, d.xp, d.durationMin, d.published ? 1 : 0, nowIso(), id);
  replaceQuiz(id, d.quiz);
  res.json({ lesson: lessonWithQuiz(id) });
});

adminRouter.delete("/lessons/:id", (req, res) => {
  db.prepare("DELETE FROM lessons WHERE id = ?").run(String(req.params.id));
  res.json({ ok: true });
});

adminRouter.post("/lessons/reorder", (req, res) => {
  const parsed = z.object({ moduleId: z.string(), ids: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "moduleId and ids required" });
    return;
  }
  const stmt = db.prepare("UPDATE lessons SET order_index = ? WHERE id = ? AND module_id = ?");
  parsed.data.ids.forEach((id, i) => stmt.run(i, id, parsed.data.moduleId));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Blog
adminRouter.get("/posts", (_req, res) => {
  res.json({ posts: loadPosts({ includeUnpublished: true }) });
});

const postSchema = z.object({
  id: z.string().trim().max(120).optional(),
  title: z.string().trim().min(2).max(200),
  excerpt: z.string().max(600).default(""),
  content: z.string().max(100000).default(""),
  category: z.string().trim().max(60).default("python"),
  coverImage: z.string().trim().max(500).default(""),
  author: z.string().trim().max(80).default("PyData Team"),
  readTime: z.string().trim().max(30).default("5 min read"),
  published: z.boolean().default(true),
  publishedAt: z.string().optional(),
});

adminRouter.post("/posts", (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A post needs a title." });
    return;
  }
  const d = parsed.data;
  let id = slugify(d.id || d.title);
  let n = 1;
  while (db.prepare("SELECT 1 FROM posts WHERE id = ?").get(id)) id = `${slugify(d.id || d.title)}-${++n}`;
  const now = nowIso();
  db.prepare(
    `INSERT INTO posts (id, title, excerpt, content, category, cover_image, author, read_time, published, published_at, views, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(id, d.title, d.excerpt, d.content, d.category, d.coverImage, d.author, d.readTime, d.published ? 1 : 0, d.publishedAt || now, now, now);
  res.status(201).json({ post: loadPost(id, { includeUnpublished: true }) });
});

adminRouter.put("/posts/:id", (req, res) => {
  const id = String(req.params.id);
  const existing = loadPost(id, { includeUnpublished: true });
  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid post data" });
    return;
  }
  const d = parsed.data;
  db.prepare(
    `UPDATE posts SET title = ?, excerpt = ?, content = ?, category = ?, cover_image = ?, author = ?, read_time = ?, published = ?, published_at = ?, updated_at = ? WHERE id = ?`,
  ).run(d.title, d.excerpt, d.content, d.category, d.coverImage, d.author, d.readTime, d.published ? 1 : 0, d.publishedAt || existing.publishedAt, nowIso(), id);
  res.json({ post: loadPost(id, { includeUnpublished: true }) });
});

adminRouter.delete("/posts/:id", (req, res) => {
  db.prepare("DELETE FROM posts WHERE id = ?").run(String(req.params.id));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Categories (blog nav tabs)
adminRouter.get("/categories", (_req, res) => {
  const counts = db.prepare("SELECT category, COUNT(*) AS n FROM posts GROUP BY category").all() as Row[];
  const countMap = new Map(counts.map((c) => [String(c.category), Number(c.n)]));
  res.json({ categories: loadCategories().map((c) => ({ ...c, postCount: countMap.get(c.slug) ?? 0 })) });
});

const categorySchema = z.object({
  slug: z.string().trim().max(60).optional(),
  name: z.string().trim().min(1).max(60),
  description: z.string().max(500).default(""),
  showInNav: z.boolean().default(true),
});

adminRouter.post("/categories", (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A category needs a name." });
    return;
  }
  const d = parsed.data;
  let slug = slugify(d.slug || d.name);
  let n = 1;
  while (db.prepare("SELECT 1 FROM categories WHERE slug = ?").get(slug)) slug = `${slugify(d.slug || d.name)}-${++n}`;
  const order = (db.prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS o FROM categories").get() as Row).o as number;
  db.prepare("INSERT INTO categories (slug, name, description, order_index, show_in_nav) VALUES (?, ?, ?, ?, ?)").run(slug, d.name, d.description, order, d.showInNav ? 1 : 0);
  res.status(201).json({ category: rowToCategory(db.prepare("SELECT * FROM categories WHERE slug = ?").get(slug) as Row) });
});

adminRouter.put("/categories/:slug", (req, res) => {
  const slug = String(req.params.slug);
  if (!db.prepare("SELECT 1 FROM categories WHERE slug = ?").get(slug)) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid category data" });
    return;
  }
  const d = parsed.data;
  db.prepare("UPDATE categories SET name = ?, description = ?, show_in_nav = ? WHERE slug = ?").run(d.name, d.description, d.showInNav ? 1 : 0, slug);
  res.json({ category: rowToCategory(db.prepare("SELECT * FROM categories WHERE slug = ?").get(slug) as Row) });
});

adminRouter.delete("/categories/:slug", (req, res) => {
  const slug = String(req.params.slug);
  const inUse = countRows("posts", "WHERE category = ?", [slug]);
  if (inUse > 0) {
    res.status(400).json({ error: `This category still has ${inUse} post(s). Move them to another category first.` });
    return;
  }
  db.prepare("DELETE FROM categories WHERE slug = ?").run(slug);
  res.json({ ok: true });
});

adminRouter.post("/categories/reorder", (req, res) => {
  const parsed = z.object({ slugs: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "slugs required" });
    return;
  }
  const stmt = db.prepare("UPDATE categories SET order_index = ? WHERE slug = ?");
  parsed.data.slugs.forEach((slug, i) => stmt.run(i, slug));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Pages (footer/legal content)
adminRouter.get("/pages", (_req, res) => {
  res.json({ pages: loadPages() });
});

const pageSchema = z.object({
  slug: z.string().trim().max(60).optional(),
  title: z.string().trim().min(1).max(120),
  content: z.string().max(100000).default(""),
});

adminRouter.post("/pages", (req, res) => {
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A page needs a title." });
    return;
  }
  const d = parsed.data;
  let slug = slugify(d.slug || d.title);
  let n = 1;
  while (db.prepare("SELECT 1 FROM pages WHERE slug = ?").get(slug)) slug = `${slugify(d.slug || d.title)}-${++n}`;
  db.prepare("INSERT INTO pages (slug, title, content, updated_at) VALUES (?, ?, ?, ?)").run(slug, d.title, d.content, nowIso());
  res.status(201).json({ page: loadPage(slug) });
});

adminRouter.put("/pages/:slug", (req, res) => {
  const slug = String(req.params.slug);
  if (!loadPage(slug)) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid page data" });
    return;
  }
  db.prepare("UPDATE pages SET title = ?, content = ?, updated_at = ? WHERE slug = ?").run(parsed.data.title, parsed.data.content, nowIso(), slug);
  res.json({ page: loadPage(slug) });
});

adminRouter.delete("/pages/:slug", (req, res) => {
  db.prepare("DELETE FROM pages WHERE slug = ?").run(String(req.params.slug));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Image uploads
const ALLOWED_IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,120}\.(png|jpg|jpeg|gif|webp)$/;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

adminRouter.get("/uploads", (_req, res) => {
  const files = fs
    .readdirSync(UPLOADS_DIR)
    .filter((f) => SAFE_NAME.test(f))
    .map((f) => {
      const st = fs.statSync(path.join(UPLOADS_DIR, f));
      return { name: f, url: `/uploads/${f}`, size: st.size, modifiedAt: st.mtime.toISOString() };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  res.json({ files });
});

adminRouter.post("/uploads", (req, res) => {
  const parsed = z.object({ filename: z.string().trim().min(1).max(200), dataBase64: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "filename and dataBase64 are required" });
    return;
  }
  const ext = path.extname(parsed.data.filename).toLowerCase();
  if (!ALLOWED_IMAGE_EXT.has(ext)) {
    res.status(400).json({ error: "Only png, jpg, jpeg, gif and webp images are allowed." });
    return;
  }
  const b64 = parsed.data.dataBase64.replace(/^data:[^;]+;base64,/, "");
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    res.status(400).json({ error: "Invalid base64 data" });
    return;
  }
  if (buf.length < 16 || buf.length > MAX_UPLOAD_BYTES) {
    res.status(400).json({ error: `Image must be between 16 bytes and ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` });
    return;
  }
  const base = slugify(path.basename(parsed.data.filename, ext)).slice(0, 40) || "image";
  const name = `${base}-${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, name), buf);
  res.status(201).json({ name, url: `/uploads/${name}`, size: buf.length });
});

adminRouter.delete("/uploads/:name", (req, res) => {
  const name = String(req.params.name);
  if (!SAFE_NAME.test(name)) {
    res.status(400).json({ error: "Invalid file name" });
    return;
  }
  const full = path.join(UPLOADS_DIR, name);
  if (fs.existsSync(full)) fs.unlinkSync(full);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Pipeline
adminRouter.get("/pipeline", (_req, res) => {
  res.json({ steps: loadPipeline() });
});

const stepSchema = z.object({
  id: z.string().trim().max(80).optional(),
  number: z.number().int().min(1).max(99),
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().max(120).default(""),
  purpose: z.string().max(400).default(""),
  keyConcepts: z.array(z.string().max(200)).default([]),
  coreLabel: z.string().max(60).default("Core Functions"),
  coreItems: z.array(z.string().max(300)).default([]),
  scope: z.string().max(600).default(""),
  outcome: z.string().max(600).default(""),
  phase: z.string().max(120).default(""),
  group: z.string().max(80).default(""),
  color: z.string().max(20).default("blue"),
  icon: z.string().max(40).default("Cpu"),
});

adminRouter.post("/pipeline", (req, res) => {
  const parsed = stepSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Step needs a number and title" });
    return;
  }
  const d = parsed.data;
  let id = slugify(d.id || `${d.title}-${d.subtitle}`);
  let n = 1;
  while (db.prepare("SELECT 1 FROM pipeline_steps WHERE id = ?").get(id)) id = `${slugify(d.id || d.title)}-${++n}`;
  db.prepare(
    `INSERT INTO pipeline_steps (id, number, title, subtitle, purpose, key_concepts, core_label, core_items, scope, outcome, phase, group_name, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, d.number, d.title, d.subtitle, d.purpose, JSON.stringify(d.keyConcepts), d.coreLabel, JSON.stringify(d.coreItems), d.scope, d.outcome, d.phase, d.group, d.color, d.icon);
  res.status(201).json({ step: loadPipeline().find((s) => s.id === id) });
});

adminRouter.put("/pipeline/:id", (req, res) => {
  const id = String(req.params.id);
  if (!db.prepare("SELECT 1 FROM pipeline_steps WHERE id = ?").get(id)) {
    res.status(404).json({ error: "Step not found" });
    return;
  }
  const parsed = stepSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid step data" });
    return;
  }
  const d = parsed.data;
  db.prepare(
    `UPDATE pipeline_steps SET number = ?, title = ?, subtitle = ?, purpose = ?, key_concepts = ?, core_label = ?, core_items = ?, scope = ?, outcome = ?, phase = ?, group_name = ?, color = ?, icon = ? WHERE id = ?`,
  ).run(d.number, d.title, d.subtitle, d.purpose, JSON.stringify(d.keyConcepts), d.coreLabel, JSON.stringify(d.coreItems), d.scope, d.outcome, d.phase, d.group, d.color, d.icon, id);
  res.json({ step: loadPipeline().find((s) => s.id === id) });
});

adminRouter.delete("/pipeline/:id", (req, res) => {
  db.prepare("DELETE FROM pipeline_steps WHERE id = ?").run(String(req.params.id));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Resources
adminRouter.get("/resources", (_req, res) => {
  res.json({ resources: loadResources() });
});

const resourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().max(500).default(""),
  description: z.string().max(300).default(""),
  category: z.enum(["docs", "tools", "cheatsheet"]).default("docs"),
  icon: z.string().max(40).default("Link"),
  content: z.string().max(60000).default(""),
});

adminRouter.post("/resources", (req, res) => {
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Resource needs a name" });
    return;
  }
  const d = parsed.data;
  const order = (db.prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS o FROM resources").get() as Row).o as number;
  const result = db
    .prepare("INSERT INTO resources (name, url, description, category, icon, content, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(d.name, d.url, d.description, d.category, d.icon, d.content, order);
  const id = Number(result.lastInsertRowid);
  res.status(201).json({ resource: loadResources().find((r) => r.id === id) });
});

adminRouter.put("/resources/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare("SELECT 1 FROM resources WHERE id = ?").get(id)) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid resource" });
    return;
  }
  const d = parsed.data;
  db.prepare("UPDATE resources SET name = ?, url = ?, description = ?, category = ?, icon = ?, content = ? WHERE id = ?").run(d.name, d.url, d.description, d.category, d.icon, d.content, id);
  res.json({ resource: loadResources().find((r) => r.id === id) });
});

adminRouter.delete("/resources/:id", (req, res) => {
  db.prepare("DELETE FROM resources WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Inbox / lists
adminRouter.get("/messages", (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const where = ["new", "read", "replied", "archived"].includes(status) ? "WHERE status = ?" : "";
  const rows = db.prepare(`SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT 500`).all(...(where ? [status] : [])) as Row[];
  res.json({
    messages: rows.map((r) => ({
      id: Number(r.id),
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      message: r.message,
      profession: r.profession,
      education: r.education,
      social: r.social,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    })),
  });
});

adminRouter.patch("/messages/:id", (req, res) => {
  const parsed = z.object({ status: z.enum(["new", "read", "replied", "archived"]).optional(), adminNote: z.string().max(2000).optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update" });
    return;
  }
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as Row | undefined;
  if (!row) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  db.prepare("UPDATE messages SET status = ?, admin_note = ? WHERE id = ?").run(parsed.data.status ?? row.status, parsed.data.adminNote ?? row.admin_note, id);
  res.json({ ok: true });
});

adminRouter.delete("/messages/:id", (req, res) => {
  db.prepare("DELETE FROM messages WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.get("/waitlist", (_req, res) => {
  const rows = db.prepare("SELECT * FROM waitlist ORDER BY created_at DESC LIMIT 1000").all() as Row[];
  res.json({ entries: rows.map((r) => ({ id: Number(r.id), email: r.email, socialLink: r.social_link, phone: r.phone, source: r.source, createdAt: r.created_at })) });
});

adminRouter.get("/waitlist.csv", (_req, res) => {
  const rows = db.prepare("SELECT email, social_link, phone, source, created_at FROM waitlist ORDER BY created_at DESC").all() as Row[];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["email,social_link,phone,source,created_at", ...rows.map((r) => [r.email, r.social_link, r.phone, r.source, r.created_at].map(esc).join(","))].join("\n");
  res.setHeader("content-type", "text/csv");
  res.setHeader("content-disposition", 'attachment; filename="waitlist.csv"');
  res.send(csv);
});

adminRouter.delete("/waitlist/:id", (req, res) => {
  db.prepare("DELETE FROM waitlist WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.get("/subscribers", (_req, res) => {
  const rows = db.prepare("SELECT * FROM subscribers ORDER BY created_at DESC LIMIT 2000").all() as Row[];
  res.json({ subscribers: rows.map((r) => ({ id: Number(r.id), email: r.email, status: r.status, createdAt: r.created_at })) });
});

adminRouter.get("/subscribers.csv", (_req, res) => {
  const rows = db.prepare("SELECT email, status, created_at FROM subscribers ORDER BY created_at DESC").all() as Row[];
  const csv = ["email,status,created_at", ...rows.map((r) => `"${r.email}","${r.status}","${r.created_at}"`)].join("\n");
  res.setHeader("content-type", "text/csv");
  res.setHeader("content-disposition", 'attachment; filename="subscribers.csv"');
  res.send(csv);
});

adminRouter.delete("/subscribers/:id", (req, res) => {
  db.prepare("DELETE FROM subscribers WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Settings
adminRouter.get("/settings", (_req, res) => {
  res.json({ site: getSiteSettings(), tutor: maskedTutorSettings() });
});

adminRouter.put("/settings/site", (req, res) => {
  const patch = req.body && typeof req.body === "object" ? req.body : {};
  res.json({ site: saveSiteSettings(patch) });
});

const tutorPatchSchema = z.object({
  provider: z.enum(["anthropic", "gemini", "offline"]).optional(),
  anthropicModel: z.string().max(80).optional(),
  geminiModel: z.string().max(80).optional(),
  anthropicApiKey: z.string().max(400).optional(),
  geminiApiKey: z.string().max(400).optional(),
  systemPrompt: z.string().max(6000).optional(),
  maxTokens: z.number().int().min(128).max(8192).optional(),
  enabled: z.boolean().optional(),
});

adminRouter.put("/settings/tutor", (req, res) => {
  const parsed = tutorPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tutor settings" });
    return;
  }
  const patch = { ...parsed.data };
  // Masked values coming back from the form must not overwrite stored keys.
  if (patch.anthropicApiKey !== undefined && (patch.anthropicApiKey.includes("*") || patch.anthropicApiKey === "")) delete patch.anthropicApiKey;
  if (patch.geminiApiKey !== undefined && (patch.geminiApiKey.includes("*") || patch.geminiApiKey === "")) delete patch.geminiApiKey;
  saveTutorSettings(patch);
  res.json({ tutor: maskedTutorSettings() });
});

adminRouter.post("/settings/tutor/clear-key", (req, res) => {
  const provider = req.body?.provider;
  if (provider === "anthropic") saveTutorSettings({ anthropicApiKey: "" });
  else if (provider === "gemini") saveTutorSettings({ geminiApiKey: "" });
  res.json({ tutor: maskedTutorSettings() });
});

adminRouter.post("/settings/tutor/test", async (_req, res) => {
  const started = Date.now();
  const result = await runTutor([{ role: "user", text: "Reply with one short sentence confirming you are online, then name one NumPy function." }], { page: "admin-test" });
  res.json({ ...result, ms: Date.now() - started, configuredProvider: getTutorSettings().provider });
});

adminRouter.get("/tutor/logs", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, u.name AS user_name, u.email AS user_email FROM tutor_logs t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 200`,
    )
    .all() as Row[];
  res.json({
    logs: rows.map((r) => ({
      id: Number(r.id),
      user: r.user_name ? { name: r.user_name, email: r.user_email } : null,
      question: r.question,
      answer: r.answer,
      provider: r.provider,
      model: r.model,
      tokensIn: Number(r.tokens_in),
      tokensOut: Number(r.tokens_out),
      createdAt: r.created_at,
    })),
  });
});

adminRouter.delete("/tutor/logs", (_req, res) => {
  db.exec("DELETE FROM tutor_logs");
  res.json({ ok: true });
});
