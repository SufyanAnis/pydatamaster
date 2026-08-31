import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { Category } from "../../lib/types";
import { cn, pluralize, slugify } from "../../lib/utils";
import { usePageTitle, useSite } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Skeleton, Textarea, Toggle } from "../../components/ui";
import { CorePageHeader } from "../components/CorePageHeader";
import { describeError, EditorFooter, EditorIconButton, EditorOrderButtons, EditorSwitch, type EditorError } from "../components/EditorChrome";

/* --------------------------------------------------------------- Modal */
function CategoryModal({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const isNew = !category;
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState(category?.description ?? "");
  const [showInNav, setShowInNav] = useState(category?.showInNav ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<EditorError | null>(null);

  const onName = (v: string) => {
    setName(v);
    if (isNew && !slugTouched) setSlug(slugify(v));
  };

  const save = async () => {
    if (name.trim().length < 1) {
      setError({ message: "The tab needs a name.", details: [] });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (category) await api.put(`/admin/categories/${category.slug}`, { name: name.trim(), description, showInNav });
      else await api.post("/admin/categories", { slug: slug ? slugify(slug) : undefined, name: name.trim(), description, showInNav });
      await onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isNew ? "New tab" : "Edit tab"} size="md">
      <div className="space-y-5">
        <Field label="Name" hint="Shown as the tab label in the site header.">
          <Input value={name} onChange={(e) => onName(e.target.value)} placeholder="Tutorials" autoFocus />
        </Field>
        <Field label="Slug" hint={isNew ? "Becomes the URL: /category/<slug>." : "Slugs cannot be changed after creation."}>
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
        <Field label="Description" hint="Shown at the top of the category page.">
          <Textarea rows={3} className="min-h-[90px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Toggle checked={showInNav} onChange={setShowInNav} label="Show in header" description="Hidden tabs keep their page and articles but are not listed in the site navigation." />
      </div>
      <EditorFooter onCancel={onClose} onSave={save} saving={saving} error={error} saveLabel={isNew ? "Create tab" : "Save tab"}>
        {showInNav ? "This tab will appear in the public header after saving." : "This tab stays hidden from the header."}
      </EditorFooter>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Page */
export default function CategoriesAdmin() {
  usePageTitle("Categories");
  const toast = useToast();
  const { refreshSettings } = useSite();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ category: Category | null } | null>(null);
  const [confirm, setConfirm] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ categories: Category[] }>("/admin/categories");
      setCategories(d.categories);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
      setCategories((c) => c ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const move = async (index: number, dir: -1 | 1) => {
    const list = categories ?? [];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next); // optimistic
    try {
      await api.post("/admin/categories/reorder", { slugs: next.map((c) => c.slug) });
      toast.success("Tab order updated");
      await refreshSettings();
    } catch (e) {
      toast.error("Could not reorder tabs", errorMessage(e));
      await load();
    }
  };

  const toggleShow = async (cat: Category, show: boolean) => {
    setBusySlug(cat.slug);
    setCategories((list) => (list ?? []).map((c) => (c.slug === cat.slug ? { ...c, showInNav: show } : c))); // optimistic
    try {
      await api.put(`/admin/categories/${cat.slug}`, { name: cat.name, description: cat.description, showInNav: show });
      toast.success(show ? "Tab shown in header" : "Tab hidden from header", cat.name);
      await refreshSettings();
    } catch (e) {
      toast.error("Could not update tab", errorMessage(e));
      await load();
    } finally {
      setBusySlug(null);
    }
  };

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api.del(`/admin/categories/${confirm.slug}`);
      toast.success("Tab deleted", confirm.name);
      setConfirm(null);
      await load();
      await refreshSettings();
    } catch (e) {
      toast.error("Could not delete tab", errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const onSaved = async () => {
    toast.success(editor?.category ? "Tab updated" : "Tab created");
    await load();
    await refreshSettings();
  };

  const loading = categories === null;
  const list = categories ?? [];

  return (
    <div className="animate-fade-in">
      <CorePageHeader
        eyebrow="Content"
        title="Categories"
        subtitle="The tabs across the top of the public site, in the order visitors see them."
        actions={
          <Button onClick={() => setEditor({ category: null })}>
            <Plus size={16} /> New tab
          </Button>
        }
      />

      <Alert type="info" className="mb-6">
        These categories are the tabs in the site header. Home is always first. Drag order with the arrows; hide a tab without deleting it using the Show toggle.
      </Alert>

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
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Tags size={26} />}
            title="No tabs yet"
            description="Create your first category to add a tab to the site header."
            action={
              <Button onClick={() => setEditor({ category: null })}>
                <Plus size={16} /> New tab
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((cat, i) => (
              <li key={cat.slug} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-50/70 transition-colors">
                <EditorOrderButtons onUp={() => move(i, -1)} onDown={() => move(i, 1)} disableUp={i === 0} disableDown={i === list.length - 1} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900 truncate">{cat.name}</span>
                    <code className="text-[11px] font-mono text-slate-400">/{cat.slug}</code>
                    {!cat.showInNav && <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Hidden</span>}
                  </div>
                  {cat.description && <p className="text-xs text-slate-500 truncate mt-0.5">{cat.description}</p>}
                </div>
                <a
                  href={`/category/${cat.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 whitespace-nowrap transition-colors"
                  title="Open the category page"
                >
                  {pluralize(cat.postCount ?? 0, "article")} <ExternalLink size={12} />
                </a>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest text-slate-400">Show</span>
                    <EditorSwitch checked={cat.showInNav} disabled={busySlug === cat.slug} onChange={(v) => toggleShow(cat, v)} label={`Show ${cat.name} in the header`} />
                  </div>
                  <EditorIconButton title="Edit tab" onClick={() => setEditor({ category: cat })}>
                    <Pencil size={15} />
                  </EditorIconButton>
                  <EditorIconButton title="Delete tab" danger onClick={() => setConfirm(cat)}>
                    <Trash2 size={15} />
                  </EditorIconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editor && <CategoryModal category={editor.category} onClose={() => setEditor(null)} onSaved={onSaved} />}

      <ConfirmDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete tab?"
        message={
          confirm
            ? (confirm.postCount ?? 0) > 0
              ? `"${confirm.name}" still has ${pluralize(confirm.postCount ?? 0, "article")}. Deleting will fail until they are moved to another category - consider hiding the tab instead.`
              : `"${confirm.name}" will be removed from the site header permanently.`
            : ""
        }
      />
    </div>
  );
}
