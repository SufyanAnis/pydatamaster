import { useCallback, useEffect, useMemo, useState } from "react";
import { BookMarked, ExternalLink, Link2, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { Resource, ResourceCategory } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Icon } from "../../lib/icons";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Skeleton, Textarea } from "../../components/ui";
import { describeError, EditorFooter, EditorIconButton, EditorPageHeader, EditorTable, EditorTabs, EditorTd, EditorTh, type EditorError } from "../components/EditorChrome";
import { EditorIconPicker } from "../components/EditorPickers";
import { EditorMarkdown } from "../components/EditorMarkdown";

const CATEGORIES: { id: ResourceCategory; label: string; description: string }[] = [
  { id: "docs", label: "Documentation", description: "Official references and guides linked from the resources page." },
  { id: "tools", label: "Tools", description: "Editors, notebooks and utilities worth installing." },
  { id: "cheatsheet", label: "Cheat sheets", description: "Markdown cheat sheets rendered on their own page inside the site." },
];

interface ResourceForm {
  name: string;
  url: string;
  description: string;
  category: ResourceCategory;
  icon: string;
  content: string;
}

function resourceToForm(r: Resource | null, category: ResourceCategory): ResourceForm {
  if (r) return { name: r.name, url: r.url, description: r.description, category: r.category, icon: r.icon, content: r.content };
  return { name: "", url: "", description: "", category, icon: category === "tools" ? "Terminal" : category === "cheatsheet" ? "BookOpen" : "Link", content: "" };
}

function resourceBody(f: ResourceForm) {
  return { name: f.name.trim(), url: f.url.trim(), description: f.description, category: f.category, icon: f.icon, content: f.category === "cheatsheet" ? f.content : "" };
}

/* --------------------------------------------------------------- Modal */
function ResourceModal({ resource, defaultCategory, onClose, onSaved }: { resource: Resource | null; defaultCategory: ResourceCategory; onClose: () => void; onSaved: () => Promise<void> }) {
  const isNew = !resource;
  const [form, setForm] = useState<ResourceForm>(() => resourceToForm(resource, defaultCategory));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<EditorError | null>(null);

  const set = <K extends keyof ResourceForm>(k: K, v: ResourceForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isCheat = form.category === "cheatsheet";

  const save = async () => {
    if (!form.name.trim()) {
      setError({ message: "Resource needs a name.", details: [] });
      return;
    }
    if (!isCheat && !form.url.trim()) {
      setError({ message: "Documentation and tool resources need a URL.", details: [] });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (resource) await api.put(`/admin/resources/${resource.id}`, resourceBody(form));
      else await api.post("/admin/resources", resourceBody(form));
      await onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isNew ? "New resource" : "Edit resource"} size={isCheat ? "xl" : "lg"}>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Name" className="md:col-span-2">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Pandas User Guide" autoFocus />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => set("category", e.target.value as ResourceCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <EditorIconPicker value={form.icon} onChange={(v) => set("icon", v)} />
        <Field label="URL" className="md:col-span-2" hint={isCheat ? "Optional for cheat sheets - link to the upstream reference if there is one." : "Opens in a new tab from the resources page."}>
          <Input type="url" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" className="font-mono text-[13px]" />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea rows={2} className="min-h-[72px]" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="One sentence on why this is useful." />
        </Field>
        {isCheat && (
          <div className="md:col-span-2">
            <EditorMarkdown value={form.content} onChange={(v) => set("content", v)} label="Cheat sheet content (Markdown)" rows={22} hint="Rendered at /resources/cheatsheet/<id>. Use headings to split sections and fenced python blocks for snippets." />
          </div>
        )}
      </div>
      <EditorFooter onCancel={onClose} onSave={save} saving={saving} error={error} saveLabel={isNew ? "Create resource" : "Save resource"}>
        {CATEGORIES.find((c) => c.id === form.category)?.description}
      </EditorFooter>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Page */
export default function ResourcesAdmin() {
  const toast = useToast();
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ResourceCategory>("docs");
  const [editor, setEditor] = useState<{ resource: Resource | null } | null>(null);
  const [confirm, setConfirm] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ resources: Resource[] }>("/admin/resources");
      setResources(d.resources);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
      setResources((r) => r ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const list = resources ?? [];
    return { docs: list.filter((r) => r.category === "docs").length, tools: list.filter((r) => r.category === "tools").length, cheatsheet: list.filter((r) => r.category === "cheatsheet").length };
  }, [resources]);

  const visible = useMemo(() => (resources ?? []).filter((r) => r.category === tab).sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id), [resources, tab]);
  const current = CATEGORIES.find((c) => c.id === tab) ?? CATEGORIES[0];

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api.del(`/admin/resources/${confirm.id}`);
      toast.success("Resource deleted", confirm.name);
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error("Could not delete resource", errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const loading = resources === null;
  const tabIcons: Record<ResourceCategory, JSX.Element> = { docs: <Link2 size={26} />, tools: <Wrench size={26} />, cheatsheet: <BookMarked size={26} /> };

  return (
    <div className="animate-fade-in">
      <EditorPageHeader
        eyebrow="Content"
        title="Resources"
        subtitle="External documentation, recommended tools and in-site cheat sheets shown on the resources page."
        actions={
          <Button onClick={() => setEditor({ resource: null })}>
            <Plus size={16} /> New resource
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
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <EditorTabs tabs={CATEGORIES.map((c) => ({ id: c.id, label: c.label, badge: counts[c.id] }))} active={tab} onChange={(id) => setTab(id as ResourceCategory)} />
          <p className="text-xs text-slate-400 font-medium mt-3 px-1">{current.description}</p>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={tabIcons[tab]}
            title={`No ${current.label.toLowerCase()} yet`}
            description={current.description}
            action={
              <Button onClick={() => setEditor({ resource: null })}>
                <Plus size={16} /> Add {tab === "cheatsheet" ? "cheat sheet" : tab === "tools" ? "tool" : "documentation link"}
              </Button>
            }
          />
        ) : (
          <EditorTable
            head={
              <>
                <EditorTh className="w-16">Icon</EditorTh>
                <EditorTh>Name</EditorTh>
                <EditorTh>Description</EditorTh>
                <EditorTh>{tab === "cheatsheet" ? "Page / source" : "URL"}</EditorTh>
                <EditorTh className="text-right">Actions</EditorTh>
              </>
            }
          >
            {visible.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                <EditorTd>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Icon name={r.icon} size={18} />
                  </div>
                </EditorTd>
                <EditorTd>
                  <div className="font-black text-slate-900 dark:text-white">{r.name}</div>
                  {tab === "cheatsheet" && <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{r.content.trim() ? `${r.content.trim().split(/\s+/).length} words` : "Empty"}</div>}
                </EditorTd>
                <EditorTd className="max-w-[360px]">
                  <span className="block truncate text-xs">{r.description || <span className="text-slate-300 dark:text-slate-600">-</span>}</span>
                </EditorTd>
                <EditorTd className="max-w-[260px]">
                  <div className="flex flex-col gap-1">
                    {tab === "cheatsheet" && (
                      <a href={`/resources/cheatsheet/${r.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline w-fit">
                        Open cheat sheet <ExternalLink size={11} />
                      </a>
                    )}
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 text-xs font-mono truncate max-w-full hover:underline", tab === "cheatsheet" ? "text-slate-400" : "text-blue-600 dark:text-blue-400")} title={r.url}>
                        <span className="truncate">{r.url.replace(/^https?:\/\//, "")}</span> <ExternalLink size={11} className="shrink-0" />
                      </a>
                    ) : (
                      tab !== "cheatsheet" && <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                    )}
                  </div>
                </EditorTd>
                <EditorTd>
                  <div className="flex items-center justify-end gap-1">
                    <EditorIconButton title="Edit resource" onClick={() => setEditor({ resource: r })}>
                      <Pencil size={15} />
                    </EditorIconButton>
                    <EditorIconButton title="Delete resource" danger onClick={() => setConfirm(r)}>
                      <Trash2 size={15} />
                    </EditorIconButton>
                  </div>
                </EditorTd>
              </tr>
            ))}
          </EditorTable>
        )}
      </div>

      {editor && <ResourceModal resource={editor.resource} defaultCategory={tab} onClose={() => setEditor(null)} onSaved={load} />}

      <ConfirmDialog open={confirm !== null} onCancel={() => setConfirm(null)} onConfirm={doDelete} loading={deleting} title="Delete resource?" message={confirm ? `"${confirm.name}" will be removed from the resources page.` : ""} />
    </div>
  );
}
