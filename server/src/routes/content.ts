import { Router } from "express";
import { db, nowIso } from "../db.js";
import { loadCategories, loadCategory, loadLesson, loadModules, loadPage, loadPipeline, loadPost, loadPosts, loadResources, searchAll } from "../content.js";
import { publicSettings } from "../settings.js";

export const contentRouter = Router();

contentRouter.get("/settings/public", (_req, res) => {
  const nav = loadCategories()
    .filter((c) => c.showInNav)
    .map((c) => ({ slug: c.slug, name: c.name }));
  res.json({ ...publicSettings(), nav });
});

contentRouter.get("/content/categories", (_req, res) => {
  const categories = loadCategories();
  const counts = db.prepare("SELECT category, COUNT(*) AS n FROM posts WHERE published = 1 GROUP BY category").all() as { category: string; n: number }[];
  const countMap = new Map(counts.map((c) => [c.category, Number(c.n)]));
  res.json({ categories: categories.map((c) => ({ ...c, postCount: countMap.get(c.slug) ?? 0 })) });
});

contentRouter.get("/content/pages/:slug", (req, res) => {
  const page = loadPage(String(req.params.slug));
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.json({ page });
});

contentRouter.get("/content/modules", (req, res) => {
  const includeUnpublished = req.user?.role === "admin" && req.query.all === "1";
  res.json({ modules: loadModules({ includeUnpublished }) });
});

contentRouter.get("/content/lessons/:lessonId", (req, res) => {
  const includeUnpublished = req.user?.role === "admin";
  const found = loadLesson(String(req.params.lessonId), { includeUnpublished });
  if (!found) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  res.json(found);
});

contentRouter.get("/content/posts", (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const posts = loadPosts({ category, q, limit }).map(({ content, ...rest }) => rest);
  const categories = (db.prepare("SELECT DISTINCT category FROM posts WHERE published = 1 ORDER BY category").all() as { category: string }[]).map((r) => r.category);
  res.json({ posts, categories });
});

contentRouter.get("/content/posts/:id", (req, res) => {
  const post = loadPost(String(req.params.id), { includeUnpublished: req.user?.role === "admin" });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  db.prepare("UPDATE posts SET views = views + 1 WHERE id = ?").run(post.id);
  // Prefer related posts from the same category, then pad with the latest elsewhere.
  const sameCategory = loadPosts({ category: post.category, limit: 6 }).filter((p) => p.id !== post.id);
  const others = loadPosts({ limit: 8 }).filter((p) => p.id !== post.id && !sameCategory.some((s) => s.id === p.id));
  const related = [...sameCategory, ...others].slice(0, 3).map(({ content, ...rest }) => rest);
  const category = loadCategory(post.category);
  res.json({ post, related, categoryName: category?.name ?? post.category });
});

contentRouter.get("/content/pipeline", (_req, res) => {
  res.json({ steps: loadPipeline() });
});

contentRouter.get("/content/resources", (_req, res) => {
  res.json({ resources: loadResources() });
});

contentRouter.get("/content/search", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  res.json({ hits: searchAll(q) });
});

contentRouter.post("/analytics/pageview", (req, res) => {
  const path = typeof req.body?.path === "string" ? req.body.path.slice(0, 200) : "";
  if (path && path.startsWith("/") && !path.startsWith("/admin")) {
    db.prepare("INSERT INTO page_views (path, user_id, created_at) VALUES (?, ?, ?)").run(path, req.user?.id ?? null, nowIso());
  }
  res.json({ ok: true });
});
