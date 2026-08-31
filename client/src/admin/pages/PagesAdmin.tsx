import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FileText, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { Page } from "../../lib/types";
import { cn, slugify, timeAgo } from "../../lib/utils";
import { usePageTitle } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Skeleton } from "../../components/ui";
import { CorePageHeader } from "../components/CorePageHeader";
import { describeError, EditorFooter, EditorIconButton, EditorTable, EditorTd, EditorTh, type EditorError } from "../components/EditorChrome";
import { EditorMarkdown } from "../components/EditorMarkdown";
import { EditorMediaPicker } from "../components/EditorMediaPicker";

/* --------------------------------------------------------------- Modal */
function PageModal({ page, onClose, onSaved }: { page: Page | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const isNew = !page;
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [content, setContent] = useState(page?.content ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<EditorError | null>(null);

  const onTitle = (v: string) => {
    setTitle(v);
    if (isNew && !slugTouched) setSlug(slugify(v));
  };

  const save = async () => {
    if (title.trim().length < 1) {
      setError({ message: "The page needs a title.", details: [] });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (page) await api.put(`/admin/pages/${page.slug}`, { title: title.trim(), content });
      else await api.post("/admin/pages", { slug: slug ? slugify(slug) : undefined, title: title.trim(), content });
      await onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  // While the media picker is open, Escape should close only the picker - not this editor.
  const requestClose = () => {
    if (!pickerOpen) onClose();
  };

  return (
    <Modal open onClose={requestClose} title={isNew ? "New page" : "Edit page"} size="xl">
      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        <Field label="Title">
          <Input value={title} onChange={(e) => onTitle(e.target.value)} placeholder="About us" autoFocus />
        </Field>
        <Field label="Slug" hint={isNew ? "Becomes the URL: /p/<slug>." : "Slugs cannot be changed after creation."}>
          <Input
            value={slug}
            readOnly={!isNew}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            className={cn("font-mono", !isNew && "opacity-60 cursor-not-allowed")}
          />
        </Field>
      </div>
      <EditorMarkdown value={content} onChange={setContent} label="Content (Markdown)" rows={20} hint="Headings, lists, tables and fenced code blocks are supported." />
      <div className="mt-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
          <ImagePlus size={13} /> Insert image
        </Button>
      </div>
      <EditorFooter onCancel={onClose} onSave={save} saving={saving} error={error} saveLabel={isNew ? "Create page" : "Save page"}>
        {slug === "contact" ? "This page also provides the intro text on the /contact form." : "Linked from the site footer when referenced there."}
      </EditorFooter>

      <EditorMediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(url) => setContent((c) => `${c}\n\n![](${url})\n`)} />
    </Modal>
  );
}

/* ---------------------------------------------------------------- Page */
export default function PagesAdmin() {
  usePageTitle("Pages");
  const toast = useToast();
  const [pages, setPages] = useState<Page[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ page: Page | null } | null>(null);
  const [confirm, setConfirm] = useState<Page | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ pages: Page[] }>("/admin/pages");
      setPages(d.pages);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
      setPages((p) => p ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api.del(`/admin/pages/${confirm.slug}`);
      toast.success("Page deleted", confirm.title);
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error("Could not delete page", errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const onSaved = async () => {
    toast.success(editor?.page ? "Page updated" : "Page created");
    await load();
  };

  const loading = pages === null;
  const list = pages ?? [];

  return (
    <div className="animate-fade-in">
      <CorePageHeader
        eyebrow="Content"
        title="Pages"
        subtitle="Static pages like About, Privacy, Terms and DMCA. They are served at /p/<slug> and linked from the footer."
        actions={
          <Button onClick={() => setEditor({ page: null })}>
            <Plus size={16} /> New page
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
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<FileText size={26} />}
            title="No pages yet"
            description="Create pages like About, Privacy or Terms to link from the site footer."
            action={
              <Button onClick={() => setEditor({ page: null })}>
                <Plus size={16} /> New page
              </Button>
            }
          />
        ) : (
          <EditorTable
            head={
              <>
                <EditorTh>Title</EditorTh>
                <EditorTh>Slug</EditorTh>
                <EditorTh>Updated</EditorTh>
                <EditorTh className="text-right">Actions</EditorTh>
              </>
            }
          >
            {list.map((p) => (
              <tr key={p.slug} className="hover:bg-slate-50/70 transition-colors">
                <EditorTd className="max-w-[320px]">
                  <div className="font-black text-slate-900 truncate">{p.title}</div>
                </EditorTd>
                <EditorTd>
                  <code className="text-xs font-mono text-slate-500">/p/{p.slug}</code>
                  {p.slug === "contact" && <div className="text-[10px] text-amber-600 font-bold mt-0.5">Also powers the /contact intro</div>}
                </EditorTd>
                <EditorTd className="whitespace-nowrap text-xs text-slate-400">{p.updatedAt ? timeAgo(p.updatedAt) : "-"}</EditorTd>
                <EditorTd>
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={`/p/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View page"
                      aria-label="View page"
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <ExternalLink size={15} />
                    </a>
                    <EditorIconButton title="Edit page" onClick={() => setEditor({ page: p })}>
                      <Pencil size={15} />
                    </EditorIconButton>
                    <EditorIconButton title="Delete page" danger onClick={() => setConfirm(p)}>
                      <Trash2 size={15} />
                    </EditorIconButton>
                  </div>
                </EditorTd>
              </tr>
            ))}
          </EditorTable>
        )}
      </div>

      {editor && <PageModal page={editor.page} onClose={() => setEditor(null)} onSaved={onSaved} />}

      <ConfirmDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete page?"
        message={confirm ? `"${confirm.title}" (/p/${confirm.slug}) will be permanently removed. Footer links may still point to it and will lead to a missing page.` : ""}
      />
    </div>
  );
}
