import { q, parseJsonArray } from "./db.js";
import type { Category, ChartType, Lesson, Module, Page, PipelineStep, Post, QuizQuestion, Resource } from "./types.js";

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

export async function loadQuizForLessons(lessonIds: string[]): Promise<Map<string, QuizQuestion[]>> {
  const map = new Map<string, QuizQuestion[]>();
  if (lessonIds.length === 0) return map;
  const placeholders = lessonIds.map(() => "?").join(",");
  const rows = await q.all<Row>(
    `SELECT * FROM quiz_questions WHERE lesson_id IN (${placeholders}) ORDER BY lesson_id, order_index, id`,
    lessonIds,
  );
  for (const r of rows) {
    const list = map.get(r.lesson_id) ?? [];
    list.push(rowToQuiz(r));
    map.set(r.lesson_id, list);
  }
  return map;
}

export async function loadModules(opts: { includeUnpublished?: boolean } = {}): Promise<Module[]> {
  const where = opts.includeUnpublished ? "" : "WHERE published = 1";
  const modRows = await q.all<Row>(`SELECT * FROM modules ${where} ORDER BY order_index, title`);
  const lessonRows = await q.all<Row>(
    `SELECT * FROM lessons ${opts.includeUnpublished ? "" : "WHERE published = 1"} ORDER BY module_id, order_index, title`,
  );
  const quizMap = await loadQuizForLessons(lessonRows.map((l) => l.id));
  const byModule = new Map<string, Lesson[]>();
  for (const l of lessonRows) {
    const list = byModule.get(l.module_id) ?? [];
    list.push(rowToLesson(l, quizMap.get(l.id) ?? []));
    byModule.set(l.module_id, list);
  }
  return modRows.map((m) => rowToModule(m, byModule.get(m.id) ?? []));
}

export async function loadLesson(lessonId: string, opts: { includeUnpublished?: boolean } = {}): Promise<{ module: Module; lesson: Lesson } | null> {
  const l = await q.get<Row>("SELECT * FROM lessons WHERE id = ?", [lessonId]);
  if (!l) return null;
  if (!opts.includeUnpublished && !l.published) return null;
  const m = await q.get<Row>("SELECT * FROM modules WHERE id = ?", [l.module_id]);
  if (!m) return null;
  if (!opts.includeUnpublished && !m.published) return null;
  const quiz = (await loadQuizForLessons([l.id])).get(l.id) ?? [];
  return { module: rowToModule(m), lesson: rowToLesson(l, quiz) };
}

export function rowToPost(r: Row): Post {
  return {
    id: r.id,
    title: r.title,
    excerpt: r.excerpt ?? "",
    content: r.content ?? "",
    category: r.category ?? "python",
    coverImage: r.cover_image ?? "",
    author: r.author ?? "PyData Team",
    readTime: r.read_time ?? "5 min read",
    published: !!r.published,
    publishedAt: r.published_at,
    views: Number(r.views) || 0,
    updatedAt: r.updated_at,
  };
}

export async function loadPosts(opts: { includeUnpublished?: boolean; category?: string; q?: string; limit?: number } = {}): Promise<Post[]> {
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
  const rows = await q.all<Row>(`SELECT * FROM posts ${where} ORDER BY published_at DESC ${limit}`, params);
  return rows.map(rowToPost);
}

export async function loadPost(id: string, opts: { includeUnpublished?: boolean } = {}): Promise<Post | null> {
  const r = await q.get<Row>("SELECT * FROM posts WHERE id = ?", [id]);
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

export async function loadPipeline(): Promise<PipelineStep[]> {
  const rows = await q.all<Row>("SELECT * FROM pipeline_steps ORDER BY number");
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

export async function loadResources(): Promise<Resource[]> {
  const rows = await q.all<Row>("SELECT * FROM resources ORDER BY order_index, id");
  return rows.map(rowToResource);
}

export function rowToCategory(r: Row): Category {
  return {
    slug: r.slug,
    name: r.name,
    description: r.description ?? "",
    orderIndex: Number(r.order_index) || 0,
    showInNav: !!r.show_in_nav,
  };
}

export async function loadCategories(): Promise<Category[]> {
  const rows = await q.all<Row>("SELECT * FROM categories ORDER BY order_index, name");
  return rows.map(rowToCategory);
}

export async function loadCategory(slug: string): Promise<Category | null> {
  const r = await q.get<Row>("SELECT * FROM categories WHERE slug = ?", [slug]);
  return r ? rowToCategory(r) : null;
}

export function rowToPage(r: Row): Page {
  return { slug: r.slug, title: r.title, content: r.content ?? "", updatedAt: r.updated_at };
}

export async function loadPages(): Promise<Page[]> {
  const rows = await q.all<Row>("SELECT * FROM pages ORDER BY slug");
  return rows.map(rowToPage);
}

export async function loadPage(slug: string): Promise<Page | null> {
  const r = await q.get<Row>("SELECT * FROM pages WHERE slug = ?", [slug]);
  return r ? rowToPage(r) : null;
}

export interface SearchHit {
  type: "post" | "page" | "category";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function searchAll(query: string, limit = 12): Promise<SearchHit[]> {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  const like = `%${term}%`;
  const hits: SearchHit[] = [];
  const catNames = new Map((await loadCategories()).map((c) => [c.slug, c.name]));

  const posts = await q.all<Row>(
    `SELECT id, title, category FROM posts WHERE published = 1 AND (lower(title) LIKE ? OR lower(excerpt) LIKE ? OR lower(content) LIKE ?) ORDER BY published_at DESC LIMIT ?`,
    [like, like, like, limit],
  );
  for (const p of posts) hits.push({ type: "post", id: p.id, title: p.title, subtitle: catNames.get(p.category) ?? p.category, href: `/blog/${p.id}` });

  const cats = await q.all<Row>(
    `SELECT slug, name, description FROM categories WHERE lower(name) LIKE ? OR lower(description) LIKE ? ORDER BY order_index LIMIT 4`,
    [like, like],
  );
  for (const c of cats) hits.push({ type: "category", id: c.slug, title: c.name, subtitle: "Topic", href: `/category/${c.slug}` });

  const pages = await q.all<Row>(`SELECT slug, title FROM pages WHERE lower(title) LIKE ? OR lower(content) LIKE ? ORDER BY slug LIMIT 4`, [like, like]);
  for (const p of pages) hits.push({ type: "page", id: p.slug, title: p.title, subtitle: "Page", href: `/p/${p.slug}` });

  return hits.slice(0, limit);
}
