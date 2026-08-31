import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Image as ImageIcon, ImagePlus, Pencil, Plus, Search, Trash2, Wand2, X } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { Category, Post } from "../../lib/types";
import { cn, formatDate, readingTime, slugify, timeAgo } from "../../lib/utils";
import { usePageTitle } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Pill, Select, Skeleton, Toggle, Textarea } from "../../components/ui";
import { describeError, EditorFooter, EditorIconButton, EditorPageHeader, EditorTable, EditorTd, EditorTh, type EditorError } from "../components/EditorChrome";
import { EditorMarkdown } from "../components/EditorMarkdown";
import { EditorMediaPicker } from "../components/EditorMediaPicker";

type StatusFilter = "all" | "published" | "draft";
type PickerTarget = "cover" | "content" | null;

/* ------------------------------------------------------------- Helpers */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

interface PostForm {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string; // category slug
  coverImage: string;
  author: string;
  readTime: string;
  publishedAt: string;
  published: boolean;
}

function postToForm(p: Post | null, defaultCategory: string): PostForm {
  if (p) {
    return {
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      category: p.category,
      coverImage: p.coverImage ?? "",
      author: p.author,
      readTime: p.readTime,
      publishedAt: toLocalInput(p.publishedAt),
      published: p.published,
    };
  }
  return {
    id: "",
    title: "",
    excerpt: "",
    content: "",
    category: defaultCategory,
    coverImage: "",
    author: "PyData Team",
    readTime: "5 min read",
    publishedAt: toLocalInput(new Date().toISOString()),
    published: true,
  };
}

function postBody(f: PostForm) {
  return {
    title: f.title.trim(),
    excerpt: f.excerpt,
    content: f.content,
    category: f.category.trim() || "python",
    coverImage: f.coverImage.trim(),
    author: f.author.trim() || "PyData Team",
    readTime: f.readTime.trim() || readingTime(f.content),
    published: f.published,
    publishedAt: fromLocalInput(f.publishedAt),
  };
}

function CoverThumb({ url, className }: { url: string; className?: string }) {
  if (url) return <img src={url} alt="" loading="lazy" className={cn("rounded-lg object-cover border border-slate-200 bg-slate-100", className)} />;
  return (
    <div className={cn("rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-300 flex items-center justify-center", className)}>
      <ImageIcon size={16} />
    </div>
  );
}

/* --------------------------------------------------------------- Modal */
function PostModal({ post, categories, onClose, onSaved }: { post: Post | null; categories: Category[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const isNew = !post;
  const [form, setForm] = useState<PostForm>(() => postToForm(post, categories[0]?.slug ?? "python"));
  const [idTouched, setIdTouched] = useState(false);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<EditorError | null>(null);

  const set = <K extends keyof PostForm>(k: K, v: PostForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const onTitle = (v: string) => setForm((f) => ({ ...f, title: v, id: isNew && !idTouched ? slugify(v) : f.id }));

  const knownCategory = categories.some((c) => c.slug === form.category);

  const save = async () => {
    if (form.title.trim().length < 2) {
      setError({ message: "Title must be at least 2 characters.", details: [] });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (post) await api.put(`/admin/posts/${post.id}`, postBody(form));
      else await api.post("/admin/posts", { ...postBody(form), id: form.id ? slugify(form.id) : undefined });
      await onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const onPick = (url: string) => {
    if (picker === "cover") set("coverImage", url);
    else if (picker === "content") setForm((f) => ({ ...f, content: `${f.content}\n\n![](${url})\n` }));
  };

  const words = form.content.trim() ? form.content.trim().split(/\s+/).length : 0;

  // While the media picker is open, Escape should close only the picker - not this editor.
  const requestClose = () => {
    if (picker === null) onClose();
  };

  return (
    <Modal open onClose={requestClose} title={isNew ? "New article" : "Edit article"} size="xl">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6">
        <div className="space-y-5">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => onTitle(e.target.value)} placeholder="Article title" autoFocus />
          </Field>
          <Field label="ID (slug)" hint={isNew ? "Becomes the URL: /blog/<id>." : "IDs cannot be changed after creation."}>
            <Input
              value={form.id}
              readOnly={!isNew}
              onChange={(e) => {
                setIdTouched(true);
                set("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              className={cn("font-mono", !isNew && "opacity-60 cursor-not-allowed")}
            />
          </Field>
          <Field label="Excerpt" hint="Shown on article cards and in search results.">
            <Textarea rows={3} className="min-h-[90px]" value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </Field>
          <Field label="Category" hint="Which header tab this article belongs to.">
            <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {!knownCategory && form.category && <option value={form.category}>{form.category} (missing category)</option>}
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          {/* Cover image */}
          <div className="space-y-2">
            <span className="label block">Cover image</span>
            <div className="flex items-center gap-3">
              <CoverThumb url={form.coverImage} className="w-24 h-16 shrink-0" />
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPicker("cover")}>
                    <ImagePlus size={12} /> Choose image
                  </Button>
                  {form.coverImage && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => set("coverImage", "")}>
                      <X size={12} /> Remove
                    </Button>
                  )}
                </div>
                {form.coverImage && <code className="text-[10px] font-mono text-slate-400 truncate">{form.coverImage}</code>}
              </div>
            </div>
            <span className="block text-xs text-slate-400 font-medium px-1">Shown on the home page, category pages and at the top of the article.</span>
          </div>

          <Field label="Author">
            <Input value={form.author} onChange={(e) => set("author", e.target.value)} />
          </Field>
          <Field label="Read time" hint={`${words} words in the body.`}>
            <div className="flex gap-2">
              <Input value={form.readTime} onChange={(e) => set("readTime", e.target.value)} placeholder="5 min read" />
              <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => set("readTime", readingTime(form.content))} title="Estimate from the content length">
                <Wand2 size={12} /> Suggest
              </Button>
            </div>
          </Field>
          <Field label="Publish date" hint="Controls ordering on the site. Leave as-is to keep the current date.">
            <Input type="datetime-local" value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} />
          </Field>
          <Toggle checked={form.published} onChange={(v) => set("published", v)} label="Published" description="Drafts are hidden from the public site and search." />
        </div>

        <div>
          <EditorMarkdown value={form.content} onChange={(v) => set("content", v)} label="Body (Markdown)" rows={26} hint="Headings, lists, tables and fenced code blocks are supported." />
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setPicker("content")}>
              <ImagePlus size={13} /> Insert image
            </Button>
          </div>
        </div>
      </div>
      <EditorFooter onCancel={onClose} onSave={save} saving={saving} error={error} saveLabel={isNew ? "Create article" : "Save article"}>
        {form.published ? "This article will be visible on the site after saving." : "Saved as a draft."}
      </EditorFooter>

      <EditorMediaPicker open={picker !== null} onClose={() => setPicker(null)} onSelect={onPick} />
    </Modal>
  );
}

/* ---------------------------------------------------------------- Page */
export default function BlogAdmin() {
  usePageTitle("Articles");
  const toast = useToast();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editor, setEditor] = useState<{ post: Post | null } | null>(null);
  const [confirm, setConfirm] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ posts: Post[] }>("/admin/posts");
      setPosts(d.posts);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
      setPosts((p) => p ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    // Category names for the table pills and the editor dropdown; fetched once.
    api
      .get<{ categories: Category[] }>("/admin/categories")
      .then((d) => setCategories(d.categories))
      .catch(() => {});
  }, [load]);

  const categoryNames = useMemo(() => new Map(categories.map((c) => [c.slug, c.name])), [categories]);

  const filtered = useMemo(() => {
    const list = posts ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((p) => {
      if (status === "published" && !p.published) return false;
      if (status === "draft" && p.published) return false;
      if (!needle) return true;
      const catName = categoryNames.get(p.category) ?? "";
      return [p.title, p.excerpt, p.category, catName, p.author, p.id].some((s) => s.toLowerCase().includes(needle));
    });
  }, [posts, q, status, categoryNames]);

  const counts = useMemo(() => {
    const list = posts ?? [];
    return { all: list.length, published: list.filter((p) => p.published).length, draft: list.filter((p) => !p.published).length };
  }, [posts]);

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api.del(`/admin/posts/${confirm.id}`);
      toast.success("Article deleted", confirm.title);
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error("Could not delete article", errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const onSaved = async () => {
    toast.success(editor?.post ? "Article saved" : "Article created");
    await load();
  };

  const loading = posts === null;

  return (
    <div className="animate-fade-in">
      <EditorPageHeader
        eyebrow="Content"
        title="Posts"
        subtitle="Write and publish articles. Drafts stay private until you flip them to published."
        actions={
          <Button onClick={() => setEditor({ post: null })}>
            <Plus size={16} /> New article
          </Button>
        }
      />

      {error && (
        <Alert type="error" className="mb-6">
          {error}{" "}
          <button className="underline font-bold" onClick={() => load()}>
            Retry
          </button>
        </Alert>
      )}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, excerpt, author, category..." className="pl-11" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="sm:w-52">
            <option value="all">All articles ({counts.all})</option>
            <option value="published">Published ({counts.published})</option>
            <option value="draft">Drafts ({counts.draft})</option>
          </Select>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={26} />}
            title={posts && posts.length === 0 ? "No articles yet" : "No articles match"}
            description={posts && posts.length === 0 ? "Write your first article to populate the site." : "Try a different search or status filter."}
            action={
              posts && posts.length === 0 ? (
                <Button onClick={() => setEditor({ post: null })}>
                  <Plus size={16} /> New article
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EditorTable
            head={
              <>
                <EditorTh>Article</EditorTh>
                <EditorTh>Category</EditorTh>
                <EditorTh>Author</EditorTh>
                <EditorTh>Status</EditorTh>
                <EditorTh>Published</EditorTh>
                <EditorTh className="text-right">Views</EditorTh>
                <EditorTh>Updated</EditorTh>
                <EditorTh className="text-right">Actions</EditorTh>
              </>
            }
          >
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                <EditorTd className="max-w-[340px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <CoverThumb url={p.coverImage} className="w-14 h-10 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 truncate">{p.title}</div>
                      <div className="text-xs text-slate-400 truncate">{p.excerpt || p.id}</div>
                    </div>
                  </div>
                </EditorTd>
                <EditorTd>
                  <Pill color="amber">{categoryNames.get(p.category) ?? p.category}</Pill>
                </EditorTd>
                <EditorTd className="whitespace-nowrap">{p.author}</EditorTd>
                <EditorTd>{p.published ? <Pill color="emerald">Published</Pill> : <Pill color="slate">Draft</Pill>}</EditorTd>
                <EditorTd className="whitespace-nowrap text-xs">{formatDate(p.publishedAt, { year: "numeric", month: "short", day: "numeric" })}</EditorTd>
                <EditorTd className="text-right tabular-nums">{p.views.toLocaleString()}</EditorTd>
                <EditorTd className="whitespace-nowrap text-xs text-slate-400">{p.updatedAt ? timeAgo(p.updatedAt) : "-"}</EditorTd>
                <EditorTd>
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={`/blog/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View article"
                      aria-label="View article"
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <ExternalLink size={15} />
                    </a>
                    <EditorIconButton title="Edit article" onClick={() => setEditor({ post: p })}>
                      <Pencil size={15} />
                    </EditorIconButton>
                    <EditorIconButton title="Delete article" danger onClick={() => setConfirm(p)}>
                      <Trash2 size={15} />
                    </EditorIconButton>
                  </div>
                </EditorTd>
              </tr>
            ))}
          </EditorTable>
        )}
      </div>

      {editor && <PostModal post={editor.post} categories={categories} onClose={() => setEditor(null)} onSaved={onSaved} />}

      <ConfirmDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete article?"
        message={confirm ? `"${confirm.title}" will be permanently removed. Its view count is lost too.` : ""}
      />
    </div>
  );
}
