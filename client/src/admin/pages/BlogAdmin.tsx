import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Pencil, Plus, Search, Trash2, Wand2 } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { Post } from "../../lib/types";
import { cn, formatDate, readingTime, slugify, timeAgo } from "../../lib/utils";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Pill, Select, Skeleton, Textarea, Toggle } from "../../components/ui";
import { describeError, EditorFooter, EditorIconButton, EditorPageHeader, EditorTable, EditorTd, EditorTh, type EditorError } from "../components/EditorChrome";
import { EditorMarkdown } from "../components/EditorMarkdown";

type StatusFilter = "all" | "published" | "draft";

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
  category: string;
  author: string;
  readTime: string;
  publishedAt: string;
  published: boolean;
}

function postToForm(p: Post | null): PostForm {
  if (p) {
    return { id: p.id, title: p.title, excerpt: p.excerpt, content: p.content, category: p.category, author: p.author, readTime: p.readTime, publishedAt: toLocalInput(p.publishedAt), published: p.published };
  }
  return { id: "", title: "", excerpt: "", content: "", category: "Tutorial", author: "PyData Team", readTime: "5 min read", publishedAt: toLocalInput(new Date().toISOString()), published: true };
}

function postBody(f: PostForm) {
  return {
    title: f.title.trim(),
    excerpt: f.excerpt,
    content: f.content,
    category: f.category.trim() || "Tutorial",
    author: f.author.trim() || "PyData Team",
    readTime: f.readTime.trim() || readingTime(f.content),
    published: f.published,
    publishedAt: fromLocalInput(f.publishedAt),
  };
}

/* --------------------------------------------------------------- Modal */
function PostModal({ post, categories, onClose, onSaved }: { post: Post | null; categories: string[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const isNew = !post;
  const [form, setForm] = useState<PostForm>(() => postToForm(post));
  const [idTouched, setIdTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<EditorError | null>(null);

  const set = <K extends keyof PostForm>(k: K, v: PostForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const onTitle = (v: string) => setForm((f) => ({ ...f, title: v, id: isNew && !idTouched ? slugify(v) : f.id }));

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

  const words = form.content.trim() ? form.content.trim().split(/\s+/).length : 0;

  return (
    <Modal open onClose={onClose} title={isNew ? "New post" : "Edit post"} size="xl">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6">
        <div className="space-y-5">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => onTitle(e.target.value)} placeholder="Post title" autoFocus />
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
          <Field label="Excerpt" hint="Shown on the blog index and in search results.">
            <Textarea rows={3} className="min-h-[90px]" value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </Field>
          <Field label="Category">
            <Input list="blog-categories" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Tutorial" />
            <datalist id="blog-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
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
          <Field label="Publish date" hint="Controls ordering on the blog. Leave as-is to keep the current date.">
            <Input type="datetime-local" value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} />
          </Field>
          <Toggle checked={form.published} onChange={(v) => set("published", v)} label="Published" description="Drafts are hidden from the public blog and search." />
        </div>
        <EditorMarkdown value={form.content} onChange={(v) => set("content", v)} label="Body (Markdown)" rows={26} hint="Headings, lists, tables and fenced code blocks are supported." />
      </div>
      <EditorFooter onCancel={onClose} onSave={save} saving={saving} error={error} saveLabel={isNew ? "Create post" : "Save post"}>
        {form.published ? "This post will be visible on the blog after saving." : "Saved as a draft."}
      </EditorFooter>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Page */
export default function BlogAdmin() {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[] | null>(null);
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
  }, [load]);

  const categories = useMemo(() => Array.from(new Set((posts ?? []).map((p) => p.category).filter(Boolean))).sort(), [posts]);

  const filtered = useMemo(() => {
    const list = posts ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((p) => {
      if (status === "published" && !p.published) return false;
      if (status === "draft" && p.published) return false;
      if (!needle) return true;
      return [p.title, p.excerpt, p.category, p.author, p.id].some((s) => s.toLowerCase().includes(needle));
    });
  }, [posts, q, status]);

  const counts = useMemo(() => {
    const list = posts ?? [];
    return { all: list.length, published: list.filter((p) => p.published).length, draft: list.filter((p) => !p.published).length };
  }, [posts]);

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api.del(`/admin/posts/${confirm.id}`);
      toast.success("Post deleted", confirm.title);
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error("Could not delete post", errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const loading = posts === null;

  return (
    <div className="animate-fade-in">
      <EditorPageHeader
        eyebrow="Content"
        title="Blog"
        subtitle="Write and publish articles. Drafts stay private until you flip them to published."
        actions={
          <Button onClick={() => setEditor({ post: null })}>
            <Plus size={16} /> New post
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
            <option value="all">All posts ({counts.all})</option>
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
            title={posts && posts.length === 0 ? "No posts yet" : "No posts match"}
            description={posts && posts.length === 0 ? "Write your first article to populate the blog." : "Try a different search or status filter."}
            action={
              posts && posts.length === 0 ? (
                <Button onClick={() => setEditor({ post: null })}>
                  <Plus size={16} /> New post
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EditorTable
            head={
              <>
                <EditorTh>Title</EditorTh>
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
              <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                <EditorTd className="max-w-[320px]">
                  <div className="font-black text-slate-900 dark:text-white truncate">{p.title}</div>
                  <div className="text-xs text-slate-400 truncate">{p.excerpt || p.id}</div>
                </EditorTd>
                <EditorTd>
                  <Pill color="indigo">{p.category}</Pill>
                </EditorTd>
                <EditorTd className="whitespace-nowrap">{p.author}</EditorTd>
                <EditorTd>{p.published ? <Pill color="emerald">Published</Pill> : <Pill color="amber">Draft</Pill>}</EditorTd>
                <EditorTd className="whitespace-nowrap text-xs">{formatDate(p.publishedAt, { year: "numeric", month: "short", day: "numeric" })}</EditorTd>
                <EditorTd className="text-right tabular-nums">{p.views.toLocaleString()}</EditorTd>
                <EditorTd className="whitespace-nowrap text-xs text-slate-400">{p.updatedAt ? timeAgo(p.updatedAt) : "-"}</EditorTd>
                <EditorTd>
                  <div className="flex items-center justify-end gap-1">
                    <a href={`/blog/${p.id}`} target="_blank" rel="noreferrer" title="View post" aria-label="View post" className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <ExternalLink size={15} />
                    </a>
                    <EditorIconButton title="Edit post" onClick={() => setEditor({ post: p })}>
                      <Pencil size={15} />
                    </EditorIconButton>
                    <EditorIconButton title="Delete post" danger onClick={() => setConfirm(p)}>
                      <Trash2 size={15} />
                    </EditorIconButton>
                  </div>
                </EditorTd>
              </tr>
            ))}
          </EditorTable>
        )}
      </div>

      {editor && <PostModal post={editor.post} categories={categories} onClose={() => setEditor(null)} onSaved={load} />}

      <ConfirmDialog open={confirm !== null} onCancel={() => setConfirm(null)} onConfirm={doDelete} loading={deleting} title="Delete post?" message={confirm ? `"${confirm.title}" will be permanently removed. Its view count is lost too.` : ""} />
    </div>
  );
}
