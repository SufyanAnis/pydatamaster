import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { q, nowIso, slugify, countRows } from "../db.js";
import { findUserById, hashPassword, pickAvatarColor, requireAdmin, toPublicUser, type UserRow } from "../auth.js";
import { loadCategories, loadModules, loadPage, loadPages, loadPipeline, loadPost, loadPosts, loadResources, rowToCategory, rowToLesson, rowToModule, loadQuizForLessons } from "../content.js";
import { computeProgress } from "../progress-service.js";
import { getSiteSettings, maskedTutorSettings, saveSiteSettings, saveTutorSettings, getTutorSettings } from "../settings.js";
import { runTutor } from "./tutor.js";
import { SAFE_UPLOAD_NAME } from "./content.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

type Row = Record<string, any>;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

async function seriesByDay(table: string, dateCol: string, days: number, where = ""): Promise<{ day: string; count: number }[]> {
  const since = daysAgoIso(days - 1);
  const rows = await q.all<Row>(
    `SELECT substr(${dateCol}, 1, 10) AS day, COUNT(*) AS count FROM ${table} WHERE ${dateCol} >= ? ${where} GROUP BY day ORDER BY day`,
    [since],
  );
  const map = new Map(rows.map((r) => [String(r.day), Number(r.count)]));
  const out: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = daysAgoIso(i).slice(0, 10);
    out.push({ day, count: map.get(day) ?? 0 });
  }
  return out;
}

// ---------------------------------------------------------------- Dashboard
adminRouter.get("/stats", async (_req, res) => {
  const totals = {
    users: await countRows("users"),
    learners: await countRows("users", "WHERE role = 'learner'"),
    admins: await countRows("users", "WHERE role = 'admin'"),
    modules: await countRows("modules"),
    lessons: await countRows("lessons"),
    posts: await countRows("posts"),
    completions: await countRows("progress"),
    quizAttempts: await countRows("quiz_attempts"),
    newMessages: await countRows("messages", "WHERE status = 'new'"),
    messages: await countRows("messages"),
    waitlist: await countRows("waitlist"),
    subscribers: await countRows("subscribers", "WHERE status = 'active'"),
    tutorChats: await countRows("tutor_logs"),
    pageViews30d: await countRows("page_views", "WHERE created_at >= ?", [daysAgoIso(29)]),
    activeUsers7d: Number((await q.get<Row>("SELECT COUNT(DISTINCT user_id) AS c FROM activity WHERE created_at >= ?", [daysAgoIso(6)]))?.c) || 0,
  };
  const signups = await seriesByDay("users", "created_at", 30);
  const completions = await seriesByDay("progress", "completed_at", 30);
  const pageViews = await seriesByDay("page_views", "created_at", 30);
  const tutorUsage = await seriesByDay("tutor_logs", "created_at", 30);

  const topLessons = await q.all<Row>(
    `SELECT l.id, l.title, m.title AS module_title, COUNT(p.user_id) AS completions
     FROM lessons l JOIN modules m ON m.id = l.module_id LEFT JOIN progress p ON p.lesson_id = l.id
     GROUP BY l.id ORDER BY completions DESC, m.order_index, l.order_index LIMIT 6`,
  );

  const moduleProgress = await q.all<Row>(
    `SELECT m.id, m.title, COUNT(DISTINCT l.id) AS lessons, COUNT(p.user_id) AS completions
     FROM modules m LEFT JOIN lessons l ON l.module_id = m.id LEFT JOIN progress p ON p.lesson_id = l.id
     GROUP BY m.id ORDER BY m.order_index`,
  );

  const topPages = await q.all<Row>(
    `SELECT path, COUNT(*) AS views FROM page_views WHERE created_at >= ? GROUP BY path ORDER BY views DESC LIMIT 8`,
    [daysAgoIso(29)],
  );

  const recentUsers = ((await q.all<Row>("SELECT * FROM users ORDER BY created_at DESC LIMIT 6")) as unknown as UserRow[]).map(toPublicUser);
  const recentMessages = await q.all<Row>(
    "SELECT id, first_name, last_name, email, substr(message, 1, 140) AS message, status, created_at FROM messages ORDER BY created_at DESC LIMIT 5",
  );
  const goals = await q.all<Row>("SELECT goal, COUNT(*) AS count FROM users WHERE role = 'learner' GROUP BY goal ORDER BY count DESC");
  const levels = await q.all<Row>("SELECT level, COUNT(*) AS count FROM users WHERE role = 'learner' GROUP BY level ORDER BY count DESC");

  res.json({ totals, signups, completions, pageViews, tutorUsage, topLessons, moduleProgress, topPages, recentUsers, recentMessages, goals, levels });
});

// ---------------------------------------------------------------- Users
adminRouter.get("/users", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const role = typeof req.query.role === "string" ? req.query.role : "";
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = 20;
  const clauses: string[] = [];
  const params: any[] = [];
  if (query) {
    clauses.push("(lower(name) LIKE ? OR lower(email) LIKE ?)");
    params.push(`%${query}%`, `%${query}%`);
  }
  if (role === "admin" || role === "learner") {
    clauses.push("role = ?");
    params.push(role);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = await countRows("users", where, params);
  const rows = (await q.all<Row>(
    `SELECT u.*, (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id) AS lessons_done,
            (SELECT COALESCE(SUM(xp),0) FROM activity a WHERE a.user_id = u.id) AS xp
     FROM users u ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  )) as unknown as (UserRow & { lessons_done: number; xp: number })[];
  res.json({
    users: rows.map((r) => ({ ...toPublicUser(r), lessonsDone: Number(r.lessons_done), xp: Number(r.xp) })),
    total,
    page,
    pageSize,
  });
});

adminRouter.get("/users/:id", async (req, res) => {
  const row = await findUserById(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: toPublicUser(row), progress: await computeProgress(row.id) });
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
  if (await q.get("SELECT 1 FROM users WHERE lower(email) = lower(?)", [d.email])) {
    res.status(409).json({ error: "Email already in use." });
    return;
  }
  const now = nowIso();
  const result = await q.run(
    `INSERT INTO users (name, email, password_hash, role, goal, level, status, avatar_color, created_at) VALUES (?, ?, ?, ?, 'Data Analyst', 'Beginner', 'active', ?, ?)`,
    [d.name, d.email.toLowerCase(), await hashPassword(d.password), d.role, pickAvatarColor(d.email), now],
  );
  res.status(201).json({ user: toPublicUser((await findUserById(Number(result.lastInsertRowid)))!) });
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
  const row = await findUserById(id);
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
  if (row.role === "admin" && d.role === "learner" && (await countRows("users", "WHERE role = 'admin'")) <= 1) {
    res.status(400).json({ error: "At least one admin must remain." });
    return;
  }
  await q.run("UPDATE users SET name = ?, role = ?, status = ?, goal = ?, level = ? WHERE id = ?", [
    d.name ?? row.name,
    d.role ?? row.role,
    d.status ?? row.status,
    d.goal ?? row.goal,
    d.level ?? row.level,
    id,
  ]);
  if (d.newPassword) await q.run("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(d.newPassword), id]);
  res.json({ user: toPublicUser((await findUserById(id))!) });
});

adminRouter.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const row = await findUserById(id);
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (req.user!.id === id) {
    res.status(400).json({ error: "You cannot delete your own account." });
    return;
  }
  if (row.role === "admin" && (await countRows("users", "WHERE role = 'admin'")) <= 1) {
    res.status(400).json({ error: "At least one admin must remain." });
    return;
  }
  await q.run("DELETE FROM users WHERE id = ?", [id]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Curriculum
adminRouter.get("/modules", async (_req, res) => {
  res.json({ modules: await loadModules({ includeUnpublished: true }) });
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

adminRouter.post("/modules", async (req, res) => {
  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A module needs at least a title." });
    return;
  }
  const d = parsed.data;
  let id = slugify(d.id || d.title);
  let n = 1;
  while (await q.get("SELECT 1 FROM modules WHERE id = ?", [id])) id = `${slugify(d.id || d.title)}-${++n}`;
  const order = Number((await q.get<Row>("SELECT COALESCE(MAX(order_index), -1) + 1 AS o FROM modules"))?.o) || 0;
  const now = nowIso();
  await q.run(
    `INSERT INTO modules (id, title, description, library, icon, color, level, order_index, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, d.title, d.description, d.library, d.icon, d.color, d.level, order, d.published ? 1 : 0, now, now],
  );
  res.status(201).json({ module: rowToModule((await q.get<Row>("SELECT * FROM modules WHERE id = ?", [id]))!) });
});

adminRouter.put("/modules/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!(await q.get("SELECT 1 FROM modules WHERE id = ?", [id]))) {
    res.status(404).json({ error: "Module not found" });
    return;
  }
  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid module data" });
    return;
  }
  const d = parsed.data;
  await q.run(`UPDATE modules SET title = ?, description = ?, library = ?, icon = ?, color = ?, level = ?, published = ?, updated_at = ? WHERE id = ?`, [
    d.title,
    d.description,
    d.library,
    d.icon,
    d.color,
    d.level,
    d.published ? 1 : 0,
    nowIso(),
    id,
  ]);
  const lessons = (await q.all<Row>("SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index", [id])).map((l) => rowToLesson(l, []));
  res.json({ module: rowToModule((await q.get<Row>("SELECT * FROM modules WHERE id = ?", [id]))!, lessons) });
});

adminRouter.delete("/modules/:id", async (req, res) => {
  await q.run("DELETE FROM modules WHERE id = ?", [String(req.params.id)]);
  res.json({ ok: true });
});

adminRouter.post("/modules/reorder", async (req, res) => {
  const parsed = z.object({ ids: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ids required" });
    return;
  }
  let i = 0;
  for (const id of parsed.data.ids) {
    await q.run("UPDATE modules SET order_index = ? WHERE id = ?", [i++, id]);
  }
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

async function replaceQuiz(lessonId: string, quiz: z.infer<typeof quizSchema>[]): Promise<void> {
  await q.run("DELETE FROM quiz_questions WHERE lesson_id = ?", [lessonId]);
  let i = 0;
  for (const item of quiz) {
    await q.run("INSERT INTO quiz_questions (lesson_id, question, options, correct_index, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?)", [
      lessonId,
      item.question,
      JSON.stringify(item.options),
      Math.min(item.correctAnswer, item.options.length - 1),
      item.explanation,
      i++,
    ]);
  }
}

async function lessonWithQuiz(id: string) {
  const row = (await q.get<Row>("SELECT * FROM lessons WHERE id = ?", [id]))!;
  return rowToLesson(row, (await loadQuizForLessons([id])).get(id) ?? []);
}

adminRouter.post("/lessons", async (req, res) => {
  const parsed = lessonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A lesson needs a module and a title.", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  if (!(await q.get("SELECT 1 FROM modules WHERE id = ?", [d.moduleId]))) {
    res.status(400).json({ error: "Module does not exist" });
    return;
  }
  let id = slugify(d.id || d.title);
  let n = 1;
  while (await q.get("SELECT 1 FROM lessons WHERE id = ?", [id])) id = `${slugify(d.id || d.title)}-${++n}`;
  const order = Number((await q.get<Row>("SELECT COALESCE(MAX(order_index), -1) + 1 AS o FROM lessons WHERE module_id = ?", [d.moduleId]))?.o) || 0;
  const now = nowIso();
  await q.run(
    `INSERT INTO lessons (id, module_id, title, summary, content, code_example, chart_type, xp, duration_min, order_index, published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, d.moduleId, d.title, d.summary, d.content, d.codeExample, d.chartType, d.xp, d.durationMin, order, d.published ? 1 : 0, now, now],
  );
  await replaceQuiz(id, d.quiz);
  res.status(201).json({ lesson: await lessonWithQuiz(id) });
});

adminRouter.put("/lessons/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!(await q.get("SELECT 1 FROM lessons WHERE id = ?", [id]))) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  const parsed = lessonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid lesson data", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  await q.run(
    `UPDATE lessons SET module_id = ?, title = ?, summary = ?, content = ?, code_example = ?, chart_type = ?, xp = ?, duration_min = ?, published = ?, updated_at = ? WHERE id = ?`,
    [d.moduleId, d.title, d.summary, d.content, d.codeExample, d.chartType, d.xp, d.durationMin, d.published ? 1 : 0, nowIso(), id],
  );
  await replaceQuiz(id, d.quiz);
  res.json({ lesson: await lessonWithQuiz(id) });
});

adminRouter.delete("/lessons/:id", async (req, res) => {
  await q.run("DELETE FROM lessons WHERE id = ?", [String(req.params.id)]);
  res.json({ ok: true });
});

adminRouter.post("/lessons/reorder", async (req, res) => {
  const parsed = z.object({ moduleId: z.string(), ids: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "moduleId and ids required" });
    return;
  }
  let i = 0;
  for (const id of parsed.data.ids) {
    await q.run("UPDATE lessons SET order_index = ? WHERE id = ? AND module_id = ?", [i++, id, parsed.data.moduleId]);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Blog
adminRouter.get("/posts", async (_req, res) => {
  res.json({ posts: await loadPosts({ includeUnpublished: true }) });
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

adminRouter.post("/posts", async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A post needs a title." });
    return;
  }
  const d = parsed.data;
  let id = slugify(d.id || d.title);
  let n = 1;
  while (await q.get("SELECT 1 FROM posts WHERE id = ?", [id])) id = `${slugify(d.id || d.title)}-${++n}`;
  const now = nowIso();
  await q.run(
    `INSERT INTO posts (id, title, excerpt, content, category, cover_image, author, read_time, published, published_at, views, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, d.title, d.excerpt, d.content, d.category, d.coverImage, d.author, d.readTime, d.published ? 1 : 0, d.publishedAt || now, now, now],
  );
  res.status(201).json({ post: await loadPost(id, { includeUnpublished: true }) });
});

adminRouter.put("/posts/:id", async (req, res) => {
  const id = String(req.params.id);
  const existing = await loadPost(id, { includeUnpublished: true });
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
  await q.run(
    `UPDATE posts SET title = ?, excerpt = ?, content = ?, category = ?, cover_image = ?, author = ?, read_time = ?, published = ?, published_at = ?, updated_at = ? WHERE id = ?`,
    [d.title, d.excerpt, d.content, d.category, d.coverImage, d.author, d.readTime, d.published ? 1 : 0, d.publishedAt || existing.publishedAt, nowIso(), id],
  );
  res.json({ post: await loadPost(id, { includeUnpublished: true }) });
});

adminRouter.delete("/posts/:id", async (req, res) => {
  await q.run("DELETE FROM posts WHERE id = ?", [String(req.params.id)]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Categories (blog nav tabs)
adminRouter.get("/categories", async (_req, res) => {
  const counts = await q.all<Row>("SELECT category, COUNT(*) AS n FROM posts GROUP BY category");
  const countMap = new Map(counts.map((c) => [String(c.category), Number(c.n)]));
  res.json({ categories: (await loadCategories()).map((c) => ({ ...c, postCount: countMap.get(c.slug) ?? 0 })) });
});

const categorySchema = z.object({
  slug: z.string().trim().max(60).optional(),
  name: z.string().trim().min(1).max(60),
  description: z.string().max(500).default(""),
  showInNav: z.boolean().default(true),
});

adminRouter.post("/categories", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A category needs a name." });
    return;
  }
  const d = parsed.data;
  let slug = slugify(d.slug || d.name);
  let n = 1;
  while (await q.get("SELECT 1 FROM categories WHERE slug = ?", [slug])) slug = `${slugify(d.slug || d.name)}-${++n}`;
  const order = Number((await q.get<Row>("SELECT COALESCE(MAX(order_index), -1) + 1 AS o FROM categories"))?.o) || 0;
  await q.run("INSERT INTO categories (slug, name, description, order_index, show_in_nav) VALUES (?, ?, ?, ?, ?)", [
    slug,
    d.name,
    d.description,
    order,
    d.showInNav ? 1 : 0,
  ]);
  res.status(201).json({ category: rowToCategory((await q.get<Row>("SELECT * FROM categories WHERE slug = ?", [slug]))!) });
});

adminRouter.put("/categories/:slug", async (req, res) => {
  const slug = String(req.params.slug);
  if (!(await q.get("SELECT 1 FROM categories WHERE slug = ?", [slug]))) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid category data" });
    return;
  }
  const d = parsed.data;
  await q.run("UPDATE categories SET name = ?, description = ?, show_in_nav = ? WHERE slug = ?", [d.name, d.description, d.showInNav ? 1 : 0, slug]);
  res.json({ category: rowToCategory((await q.get<Row>("SELECT * FROM categories WHERE slug = ?", [slug]))!) });
});

adminRouter.delete("/categories/:slug", async (req, res) => {
  const slug = String(req.params.slug);
  const inUse = await countRows("posts", "WHERE category = ?", [slug]);
  if (inUse > 0) {
    res.status(400).json({ error: `This category still has ${inUse} post(s). Move them to another category first.` });
    return;
  }
  await q.run("DELETE FROM categories WHERE slug = ?", [slug]);
  res.json({ ok: true });
});

adminRouter.post("/categories/reorder", async (req, res) => {
  const parsed = z.object({ slugs: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "slugs required" });
    return;
  }
  let i = 0;
  for (const slug of parsed.data.slugs) {
    await q.run("UPDATE categories SET order_index = ? WHERE slug = ?", [i++, slug]);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Pages (footer/legal content)
adminRouter.get("/pages", async (_req, res) => {
  res.json({ pages: await loadPages() });
});

const pageSchema = z.object({
  slug: z.string().trim().max(60).optional(),
  title: z.string().trim().min(1).max(120),
  content: z.string().max(100000).default(""),
});

adminRouter.post("/pages", async (req, res) => {
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A page needs a title." });
    return;
  }
  const d = parsed.data;
  let slug = slugify(d.slug || d.title);
  let n = 1;
  while (await q.get("SELECT 1 FROM pages WHERE slug = ?", [slug])) slug = `${slugify(d.slug || d.title)}-${++n}`;
  await q.run("INSERT INTO pages (slug, title, content, updated_at) VALUES (?, ?, ?, ?)", [slug, d.title, d.content, nowIso()]);
  res.status(201).json({ page: await loadPage(slug) });
});

adminRouter.put("/pages/:slug", async (req, res) => {
  const slug = String(req.params.slug);
  if (!(await loadPage(slug))) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid page data" });
    return;
  }
  await q.run("UPDATE pages SET title = ?, content = ?, updated_at = ? WHERE slug = ?", [parsed.data.title, parsed.data.content, nowIso(), slug]);
  res.json({ page: await loadPage(slug) });
});

adminRouter.delete("/pages/:slug", async (req, res) => {
  await q.run("DELETE FROM pages WHERE slug = ?", [String(req.params.slug)]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Image uploads (stored in the database)
const ALLOWED_IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

adminRouter.get("/uploads", async (_req, res) => {
  const rows = await q.all<Row>("SELECT name, mime, size, created_at FROM uploads ORDER BY created_at DESC");
  res.json({
    files: rows.map((r) => ({ name: String(r.name), url: `/uploads/${r.name}`, size: Number(r.size), modifiedAt: String(r.created_at) })),
  });
});

adminRouter.post("/uploads", async (req, res) => {
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
  await q.run("INSERT INTO uploads (name, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?)", [name, MIME_BY_EXT[ext], buf.length, buf, nowIso()]);
  res.status(201).json({ name, url: `/uploads/${name}`, size: buf.length });
});

adminRouter.delete("/uploads/:name", async (req, res) => {
  const name = String(req.params.name);
  if (!SAFE_UPLOAD_NAME.test(name)) {
    res.status(400).json({ error: "Invalid file name" });
    return;
  }
  await q.run("DELETE FROM uploads WHERE name = ?", [name]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Pipeline
adminRouter.get("/pipeline", async (_req, res) => {
  res.json({ steps: await loadPipeline() });
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

adminRouter.post("/pipeline", async (req, res) => {
  const parsed = stepSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Step needs a number and title" });
    return;
  }
  const d = parsed.data;
  let id = slugify(d.id || `${d.title}-${d.subtitle}`);
  let n = 1;
  while (await q.get("SELECT 1 FROM pipeline_steps WHERE id = ?", [id])) id = `${slugify(d.id || d.title)}-${++n}`;
  await q.run(
    `INSERT INTO pipeline_steps (id, number, title, subtitle, purpose, key_concepts, core_label, core_items, scope, outcome, phase, group_name, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, d.number, d.title, d.subtitle, d.purpose, JSON.stringify(d.keyConcepts), d.coreLabel, JSON.stringify(d.coreItems), d.scope, d.outcome, d.phase, d.group, d.color, d.icon],
  );
  res.status(201).json({ step: (await loadPipeline()).find((s) => s.id === id) });
});

adminRouter.put("/pipeline/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!(await q.get("SELECT 1 FROM pipeline_steps WHERE id = ?", [id]))) {
    res.status(404).json({ error: "Step not found" });
    return;
  }
  const parsed = stepSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid step data" });
    return;
  }
  const d = parsed.data;
  await q.run(
    `UPDATE pipeline_steps SET number = ?, title = ?, subtitle = ?, purpose = ?, key_concepts = ?, core_label = ?, core_items = ?, scope = ?, outcome = ?, phase = ?, group_name = ?, color = ?, icon = ? WHERE id = ?`,
    [d.number, d.title, d.subtitle, d.purpose, JSON.stringify(d.keyConcepts), d.coreLabel, JSON.stringify(d.coreItems), d.scope, d.outcome, d.phase, d.group, d.color, d.icon, id],
  );
  res.json({ step: (await loadPipeline()).find((s) => s.id === id) });
});

adminRouter.delete("/pipeline/:id", async (req, res) => {
  await q.run("DELETE FROM pipeline_steps WHERE id = ?", [String(req.params.id)]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Resources
adminRouter.get("/resources", async (_req, res) => {
  res.json({ resources: await loadResources() });
});

const resourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().max(500).default(""),
  description: z.string().max(300).default(""),
  category: z.enum(["docs", "tools", "cheatsheet"]).default("docs"),
  icon: z.string().max(40).default("Link"),
  content: z.string().max(60000).default(""),
});

adminRouter.post("/resources", async (req, res) => {
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Resource needs a name" });
    return;
  }
  const d = parsed.data;
  const order = Number((await q.get<Row>("SELECT COALESCE(MAX(order_index), -1) + 1 AS o FROM resources"))?.o) || 0;
  const result = await q.run("INSERT INTO resources (name, url, description, category, icon, content, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    d.name,
    d.url,
    d.description,
    d.category,
    d.icon,
    d.content,
    order,
  ]);
  const id = Number(result.lastInsertRowid);
  res.status(201).json({ resource: (await loadResources()).find((r) => r.id === id) });
});

adminRouter.put("/resources/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!(await q.get("SELECT 1 FROM resources WHERE id = ?", [id]))) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid resource" });
    return;
  }
  const d = parsed.data;
  await q.run("UPDATE resources SET name = ?, url = ?, description = ?, category = ?, icon = ?, content = ? WHERE id = ?", [
    d.name,
    d.url,
    d.description,
    d.category,
    d.icon,
    d.content,
    id,
  ]);
  res.json({ resource: (await loadResources()).find((r) => r.id === id) });
});

adminRouter.delete("/resources/:id", async (req, res) => {
  await q.run("DELETE FROM resources WHERE id = ?", [Number(req.params.id)]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Inbox / lists
adminRouter.get("/messages", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const where = ["new", "read", "replied", "archived"].includes(status) ? "WHERE status = ?" : "";
  const rows = await q.all<Row>(`SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT 500`, where ? [status] : []);
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

adminRouter.patch("/messages/:id", async (req, res) => {
  const parsed = z.object({ status: z.enum(["new", "read", "replied", "archived"]).optional(), adminNote: z.string().max(2000).optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update" });
    return;
  }
  const id = Number(req.params.id);
  const row = await q.get<Row>("SELECT * FROM messages WHERE id = ?", [id]);
  if (!row) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  await q.run("UPDATE messages SET status = ?, admin_note = ? WHERE id = ?", [parsed.data.status ?? row.status, parsed.data.adminNote ?? row.admin_note, id]);
  res.json({ ok: true });
});

adminRouter.delete("/messages/:id", async (req, res) => {
  await q.run("DELETE FROM messages WHERE id = ?", [Number(req.params.id)]);
  res.json({ ok: true });
});

adminRouter.get("/waitlist", async (_req, res) => {
  const rows = await q.all<Row>("SELECT * FROM waitlist ORDER BY created_at DESC LIMIT 1000");
  res.json({ entries: rows.map((r) => ({ id: Number(r.id), email: r.email, socialLink: r.social_link, phone: r.phone, source: r.source, createdAt: r.created_at })) });
});

adminRouter.get("/waitlist.csv", async (_req, res) => {
  const rows = await q.all<Row>("SELECT email, social_link, phone, source, created_at FROM waitlist ORDER BY created_at DESC");
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["email,social_link,phone,source,created_at", ...rows.map((r) => [r.email, r.social_link, r.phone, r.source, r.created_at].map(esc).join(","))].join("\n");
  res.setHeader("content-type", "text/csv");
  res.setHeader("content-disposition", 'attachment; filename="waitlist.csv"');
  res.send(csv);
});

adminRouter.delete("/waitlist/:id", async (req, res) => {
  await q.run("DELETE FROM waitlist WHERE id = ?", [Number(req.params.id)]);
  res.json({ ok: true });
});

adminRouter.get("/subscribers", async (_req, res) => {
  const rows = await q.all<Row>("SELECT * FROM subscribers ORDER BY created_at DESC LIMIT 2000");
  res.json({ subscribers: rows.map((r) => ({ id: Number(r.id), email: r.email, status: r.status, createdAt: r.created_at })) });
});

adminRouter.get("/subscribers.csv", async (_req, res) => {
  const rows = await q.all<Row>("SELECT email, status, created_at FROM subscribers ORDER BY created_at DESC");
  const csv = ["email,status,created_at", ...rows.map((r) => `"${r.email}","${r.status}","${r.created_at}"`)].join("\n");
  res.setHeader("content-type", "text/csv");
  res.setHeader("content-disposition", 'attachment; filename="subscribers.csv"');
  res.send(csv);
});

adminRouter.delete("/subscribers/:id", async (req, res) => {
  await q.run("DELETE FROM subscribers WHERE id = ?", [Number(req.params.id)]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Settings
adminRouter.get("/settings", async (_req, res) => {
  res.json({ site: await getSiteSettings(), tutor: await maskedTutorSettings() });
});

adminRouter.put("/settings/site", async (req, res) => {
  const patch = req.body && typeof req.body === "object" ? req.body : {};
  res.json({ site: await saveSiteSettings(patch) });
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

adminRouter.put("/settings/tutor", async (req, res) => {
  const parsed = tutorPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tutor settings" });
    return;
  }
  const patch = { ...parsed.data };
  // Masked values coming back from the form must not overwrite stored keys.
  if (patch.anthropicApiKey !== undefined && (patch.anthropicApiKey.includes("*") || patch.anthropicApiKey === "")) delete patch.anthropicApiKey;
  if (patch.geminiApiKey !== undefined && (patch.geminiApiKey.includes("*") || patch.geminiApiKey === "")) delete patch.geminiApiKey;
  await saveTutorSettings(patch);
  res.json({ tutor: await maskedTutorSettings() });
});

adminRouter.post("/settings/tutor/clear-key", async (req, res) => {
  const provider = req.body?.provider;
  if (provider === "anthropic") await saveTutorSettings({ anthropicApiKey: "" });
  else if (provider === "gemini") await saveTutorSettings({ geminiApiKey: "" });
  res.json({ tutor: await maskedTutorSettings() });
});

adminRouter.post("/settings/tutor/test", async (_req, res) => {
  const started = Date.now();
  const result = await runTutor([{ role: "user", text: "Reply with one short sentence confirming you are online, then name one NumPy function." }], { page: "admin-test" });
  res.json({ ...result, ms: Date.now() - started, configuredProvider: (await getTutorSettings()).provider });
});

adminRouter.get("/tutor/logs", async (_req, res) => {
  const rows = await q.all<Row>(
    `SELECT t.*, u.name AS user_name, u.email AS user_email FROM tutor_logs t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 200`,
  );
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

adminRouter.delete("/tutor/logs", async (_req, res) => {
  await q.exec("DELETE FROM tutor_logs");
  res.json({ ok: true });
});
