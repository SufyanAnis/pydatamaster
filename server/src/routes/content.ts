import { Router } from "express";
import { q, nowIso, toBuffer } from "../db.js";
import { loadCategories, loadCategory, loadLesson, loadModules, loadPage, loadPipeline, loadPost, loadPosts, loadResources, searchAll } from "../content.js";
import { publicSettings } from "../settings.js";

export const contentRouter = Router();

contentRouter.get("/settings/public", async (_req, res) => {
  const nav = (await loadCategories())
    .filter((c) => c.showInNav)
    .map((c) => ({ slug: c.slug, name: c.name }));
  res.json({ ...(await publicSettings()), nav });
});

contentRouter.get("/content/categories", async (_req, res) => {
  const categories = await loadCategories();
  const counts = await q.all<{ category: string; n: number }>("SELECT category, COUNT(*) AS n FROM posts WHERE published = 1 GROUP BY category");
  const countMap = new Map(counts.map((c) => [c.category, Number(c.n)]));
  res.json({ categories: categories.map((c) => ({ ...c, postCount: countMap.get(c.slug) ?? 0 })) });
});

contentRouter.get("/content/pages/:slug", async (req, res) => {
  const page = await loadPage(String(req.params.slug));
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.json({ page });
});

contentRouter.get("/content/modules", async (req, res) => {
  const includeUnpublished = req.user?.role === "admin" && req.query.all === "1";
  res.json({ modules: await loadModules({ includeUnpublished }) });
});

contentRouter.get("/content/lessons/:lessonId", async (req, res) => {
  const includeUnpublished = req.user?.role === "admin";
  const found = await loadLesson(String(req.params.lessonId), { includeUnpublished });
  if (!found) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  res.json(found);
});

contentRouter.get("/content/posts", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const query = typeof req.query.q === "string" ? req.query.q : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const posts = (await loadPosts({ category, q: query, limit })).map(({ content, ...rest }) => rest);
  const categories = (await q.all<{ category: string }>("SELECT DISTINCT category FROM posts WHERE published = 1 ORDER BY category")).map((r) => r.category);
  res.json({ posts, categories });
});

contentRouter.get("/content/posts/:id", async (req, res) => {
  const post = await loadPost(String(req.params.id), { includeUnpublished: req.user?.role === "admin" });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  await q.run("UPDATE posts SET views = views + 1 WHERE id = ?", [post.id]);
  // Prefer related posts from the same category, then pad with the latest elsewhere.
  const sameCategory = (await loadPosts({ category: post.category, limit: 6 })).filter((p) => p.id !== post.id);
  const others = (await loadPosts({ limit: 8 })).filter((p) => p.id !== post.id && !sameCategory.some((s) => s.id === p.id));
  const related = [...sameCategory, ...others].slice(0, 3).map(({ content, ...rest }) => rest);
  const category = await loadCategory(post.category);
  res.json({ post, related, categoryName: category?.name ?? post.category });
});

contentRouter.get("/content/pipeline", async (_req, res) => {
  res.json({ steps: await loadPipeline() });
});

contentRouter.get("/content/resources", async (_req, res) => {
  res.json({ resources: await loadResources() });
});

contentRouter.get("/content/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  res.json({ hits: await searchAll(query) });
});

contentRouter.post("/analytics/pageview", async (req, res) => {
  const path = typeof req.body?.path === "string" ? req.body.path.slice(0, 200) : "";
  if (path && path.startsWith("/") && !path.startsWith("/admin")) {
    await q.run("INSERT INTO page_views (path, user_id, created_at) VALUES (?, ?, ?)", [path, req.user?.id ?? null, nowIso()]);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Uploaded images (DB-backed)
export const SAFE_UPLOAD_NAME = /^[a-z0-9][a-z0-9._-]{0,120}\.(png|jpg|jpeg|gif|webp)$/;

/** Public router serving uploaded images from the database. Mounted at /uploads. */
export const uploadsRouter = Router();

uploadsRouter.get("/:name", async (req, res) => {
  const name = String(req.params.name);
  if (!SAFE_UPLOAD_NAME.test(name)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const row = await q.get<{ mime: string; data: unknown }>("SELECT mime, data FROM uploads WHERE name = ?", [name]);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.setHeader("content-type", String(row.mime));
  res.setHeader("cache-control", "public, max-age=604800, immutable");
  res.send(toBuffer(row.data));
});
