import { Router } from "express";
import { db, nowIso } from "../db.js";
import { loadLesson, loadModules, loadPipeline, loadPost, loadPosts, loadResources, searchAll } from "../content.js";
import { publicSettings } from "../settings.js";

export const contentRouter = Router();

contentRouter.get("/settings/public", (_req, res) => {
  res.json(publicSettings());
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
  const related = loadPosts({ limit: 4 })
    .filter((p) => p.id !== post.id)
    .slice(0, 3)
    .map(({ content, ...rest }) => rest);
  res.json({ post, related });
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
