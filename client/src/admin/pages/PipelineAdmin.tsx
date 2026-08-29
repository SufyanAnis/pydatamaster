import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Workflow } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { PipelineStep } from "../../lib/types";
import { cn, colorClasses, slugify } from "../../lib/utils";
import { Icon } from "../../lib/icons";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Pill, Skeleton, Textarea } from "../../components/ui";
import { describeError, EditorFooter, EditorIconButton, EditorPageHeader, EditorTable, EditorTd, EditorTh, type EditorError } from "../components/EditorChrome";
import { EditorColorPicker, EditorIconPicker } from "../components/EditorPickers";
import { EditorListInput } from "../components/EditorListInput";

interface StepForm {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  purpose: string;
  keyConcepts: string[];
  coreLabel: string;
  coreItems: string[];
  scope: string;
  outcome: string;
  phase: string;
  group: string;
  color: string;
  icon: string;
}

function stepToForm(s: PipelineStep | null, nextNumber: number): StepForm {
  if (s) {
    return {
      id: s.id,
      number: s.number,
      title: s.title,
      subtitle: s.subtitle,
      purpose: s.purpose,
      keyConcepts: [...s.keyConcepts],
      coreLabel: s.coreLabel,
      coreItems: [...s.coreItems],
      scope: s.scope,
      outcome: s.outcome,
      phase: s.phase,
      group: s.group,
      color: s.color,
      icon: s.icon,
    };
  }
  return { id: "", number: nextNumber, title: "", subtitle: "", purpose: "", keyConcepts: [], coreLabel: "Core Functions", coreItems: [], scope: "", outcome: "", phase: "", group: "", color: "blue", icon: "Cpu" };
}

function stepBody(f: StepForm) {
  return {
    number: f.number,
    title: f.title.trim(),
    subtitle: f.subtitle,
    purpose: f.purpose,
    keyConcepts: f.keyConcepts,
    coreLabel: f.coreLabel,
    coreItems: f.coreItems,
    scope: f.scope,
    outcome: f.outcome,
    phase: f.phase,
    group: f.group,
    color: f.color,
    icon: f.icon,
  };
}

/* --------------------------------------------------------------- Modal */
function StepModal({ step, nextNumber, phases, groups, onClose, onSaved }: { step: PipelineStep | null; nextNumber: number; phases: string[]; groups: string[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const isNew = !step;
  const [form, setForm] = useState<StepForm>(() => stepToForm(step, nextNumber));
  const [idTouched, setIdTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<EditorError | null>(null);

  const set = <K extends keyof StepForm>(k: K, v: StepForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const onTitle = (v: string) => setForm((f) => ({ ...f, title: v, id: isNew && !idTouched ? slugify(v) : f.id }));

  const save = async () => {
    if (!form.title.trim()) {
      setError({ message: "Step needs a title.", details: [] });
      return;
    }
    if (!Number.isInteger(form.number) || form.number < 1 || form.number > 99) {
      setError({ message: "Step number must be a whole number between 1 and 99.", details: [] });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (step) await api.put(`/admin/pipeline/${step.id}`, stepBody(form));
      else await api.post("/admin/pipeline", { ...stepBody(form), id: form.id ? slugify(form.id) : undefined });
      await onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const c = colorClasses(form.color);

  return (
    <Modal open onClose={onClose} title={isNew ? "New pipeline step" : `Edit step ${step?.number}`} size="lg">
      <div className="space-y-8">
        {/* Basics */}
        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className={cn("w-16 h-16 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg shrink-0", c.text)}>
              <Icon name={form.icon} size={28} />
            </div>
            <div className="min-w-0">
              <div className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px] truncate">
                {form.number}. {form.title || "Untitled step"}
              </div>
              <div className={cn("inline-block mt-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-current opacity-80", c.text)}>{form.subtitle || "Subtitle"}</div>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            <Field label="Number" hint="Display order.">
              <Input type="number" min={1} max={99} value={form.number} onChange={(e) => set("number", e.target.value === "" ? 0 : Number(e.target.value))} />
            </Field>
            <Field label="Title" className="md:col-span-3">
              <Input value={form.title} onChange={(e) => onTitle(e.target.value)} placeholder="e.g. Data Cleaning" autoFocus />
            </Field>
            <Field label="Subtitle" className="md:col-span-2" hint="Short tag under the title, e.g. the library used.">
              <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Pandas" />
            </Field>
            <Field label="ID (slug)" className="md:col-span-2" hint={isNew ? "Becomes the URL: /pipeline/<id>." : "IDs cannot be changed after creation."}>
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
          </div>
        </section>

        {/* Classification */}
        <section className="space-y-5">
          <span className="eyebrow block">Grouping and look</span>
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Phase" hint="Steps with the same phase are shown as one row on the home page.">
              <Input list="pipeline-phases" value={form.phase} onChange={(e) => set("phase", e.target.value)} placeholder="Phase 1 - Data manipulation" />
              <datalist id="pipeline-phases">
                {phases.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
            <Field label="Group" hint="Broader family, e.g. Foundations or Modeling.">
              <Input list="pipeline-groups" value={form.group} onChange={(e) => set("group", e.target.value)} />
              <datalist id="pipeline-groups">
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
            <EditorIconPicker value={form.icon} onChange={(v) => set("icon", v)} color={form.color} />
            <EditorColorPicker value={form.color} onChange={(v) => set("color", v)} />
          </div>
        </section>

        {/* Details */}
        <section className="space-y-5">
          <span className="eyebrow block">Step page content</span>
          <Field label="Purpose" hint="One paragraph: why this step exists.">
            <Textarea rows={3} className="min-h-[90px]" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} />
          </Field>
          <div className="grid md:grid-cols-2 gap-5">
            <EditorListInput label="Key concepts" value={form.keyConcepts} onChange={(v) => set("keyConcepts", v)} placeholder={"Vectorization\nBroadcasting\nIndexing"} rows={6} />
            <div className="space-y-5">
              <Field label="Core list label" hint="Heading for the list on the right, e.g. Core Functions.">
                <Input value={form.coreLabel} onChange={(e) => set("coreLabel", e.target.value)} />
              </Field>
              <EditorListInput label={form.coreLabel || "Core items"} value={form.coreItems} onChange={(v) => set("coreItems", v)} placeholder={"np.array()\nnp.arange()\nnp.reshape()"} rows={4} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Scope" hint="What is covered - and what is not.">
              <Textarea rows={4} className="min-h-[110px]" value={form.scope} onChange={(e) => set("scope", e.target.value)} />
            </Field>
            <Field label="Outcome" hint="What the learner can do afterwards.">
              <Textarea rows={4} className="min-h-[110px]" value={form.outcome} onChange={(e) => set("outcome", e.target.value)} />
            </Field>
          </div>
        </section>
      </div>
      <EditorFooter onCancel={onClose} onSave={save} saving={saving} error={error} saveLabel={isNew ? "Create step" : "Save step"}>
        {form.keyConcepts.length} concepts - {form.coreItems.length} {form.coreLabel.toLowerCase() || "items"}
      </EditorFooter>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Page */
export default function PipelineAdmin() {
  const toast = useToast();
  const [steps, setSteps] = useState<PipelineStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ step: PipelineStep | null } | null>(null);
  const [confirm, setConfirm] = useState<PipelineStep | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ steps: PipelineStep[] }>("/admin/pipeline");
      setSteps([...d.steps].sort((a, b) => a.number - b.number));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
      setSteps((s) => s ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const phases = useMemo(() => Array.from(new Set((steps ?? []).map((s) => s.phase).filter(Boolean))), [steps]);
  const groups = useMemo(() => Array.from(new Set((steps ?? []).map((s) => s.group).filter(Boolean))), [steps]);
  const nextNumber = useMemo(() => (steps ?? []).reduce((n, s) => Math.max(n, s.number), 0) + 1, [steps]);

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api.del(`/admin/pipeline/${confirm.id}`);
      toast.success("Step deleted", confirm.title);
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error("Could not delete step", errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const loading = steps === null;

  return (
    <div className="animate-fade-in">
      <EditorPageHeader
        eyebrow="Content"
        title="Learning pipeline"
        subtitle="The step-by-step roadmap shown on the home page. Steps are ordered by number and grouped by phase."
        actions={
          <Button onClick={() => setEditor({ step: null })}>
            <Plus size={16} /> New step
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
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Steps</h2>
            <p className="text-xs text-slate-400 font-medium">
              {phases.length} {phases.length === 1 ? "phase" : "phases"} - {groups.length} {groups.length === 1 ? "group" : "groups"}
            </p>
          </div>
          <Pill color="slate">{steps?.length ?? 0}</Pill>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : steps && steps.length === 0 ? (
          <EmptyState
            icon={<Workflow size={26} />}
            title="No pipeline steps"
            description="Add the steps of your learning roadmap to show them on the home page."
            action={
              <Button onClick={() => setEditor({ step: null })}>
                <Plus size={16} /> New step
              </Button>
            }
          />
        ) : (
          <EditorTable
            head={
              <>
                <EditorTh className="w-12">#</EditorTh>
                <EditorTh>Step</EditorTh>
                <EditorTh>Group</EditorTh>
                <EditorTh>Phase</EditorTh>
                <EditorTh>Color</EditorTh>
                <EditorTh>Icon</EditorTh>
                <EditorTh className="text-right">Actions</EditorTh>
              </>
            }
          >
            {steps?.map((s) => {
              const c = colorClasses(s.color);
              return (
                <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <EditorTd className="font-black tabular-nums text-slate-400">{s.number}</EditorTd>
                  <EditorTd>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", c.soft)}>
                        <Icon name={s.icon} size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 dark:text-white truncate">{s.title}</div>
                        <div className="text-xs text-slate-400 truncate">{s.subtitle}</div>
                      </div>
                    </div>
                  </EditorTd>
                  <EditorTd className="whitespace-nowrap">{s.group || <span className="text-slate-300 dark:text-slate-600">-</span>}</EditorTd>
                  <EditorTd className="max-w-[220px]">
                    <span className="block truncate">{s.phase || <span className="text-slate-300 dark:text-slate-600">-</span>}</span>
                  </EditorTd>
                  <EditorTd>
                    <span className="inline-flex items-center gap-2">
                      <span className={cn("w-4 h-4 rounded-full shrink-0", c.solid)} />
                      <span className="text-xs">{s.color}</span>
                    </span>
                  </EditorTd>
                  <EditorTd className="text-xs font-mono">{s.icon}</EditorTd>
                  <EditorTd>
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/pipeline/${s.id}`} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 px-2" title="View on site">
                        View
                      </a>
                      <EditorIconButton title="Edit step" onClick={() => setEditor({ step: s })}>
                        <Pencil size={15} />
                      </EditorIconButton>
                      <EditorIconButton title="Delete step" danger onClick={() => setConfirm(s)}>
                        <Trash2 size={15} />
                      </EditorIconButton>
                    </div>
                  </EditorTd>
                </tr>
              );
            })}
          </EditorTable>
        )}
      </div>

      {editor && <StepModal step={editor.step} nextNumber={nextNumber} phases={phases} groups={groups} onClose={() => setEditor(null)} onSaved={load} />}

      <ConfirmDialog open={confirm !== null} onCancel={() => setConfirm(null)} onConfirm={doDelete} loading={deleting} title="Delete step?" message={confirm ? `Step ${confirm.number} "${confirm.title}" will be removed from the pipeline and its page will stop resolving.` : ""} />
    </div>
  );
}
