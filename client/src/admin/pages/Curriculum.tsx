import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Clock, HelpCircle, Layers, ListChecks, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { ChartType, Lesson, Module, QuizQuestion } from "../../lib/types";
import { cn, colorClasses, pct, slugify } from "../../lib/utils";
import { Icon } from "../../lib/icons";
import { useSite } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Pill, Select, Skeleton, StatTile, Textarea, Toggle } from "../../components/ui";
import { CodeBlock } from "../../components/CodeBlock";
import { describeError, EditorFooter, EditorIconButton, EditorOrderButtons, EditorPageHeader, EditorSwitch, EditorTabs, type EditorError } from "../components/EditorChrome";
import { EditorColorPicker, EditorIconPicker } from "../components/EditorPickers";
import { EditorMarkdown } from "../components/EditorMarkdown";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "none", label: "No chart" },
  { value: "bar", label: "Bar chart" },
  { value: "line", label: "Line chart" },
  { value: "scatter", label: "Scatter plot" },
  { value: "hist", label: "Histogram" },
];

/* ----------------------------------------------------------- Form shapes */
interface ModuleForm {
  id: string;
  title: string;
  description: string;
  library: string;
  icon: string;
  color: string;
  level: string;
  published: boolean;
}

function moduleToForm(m: Module | null): ModuleForm {
  if (m) return { id: m.id, title: m.title, description: m.description, library: m.library, icon: m.icon, color: m.color, level: m.level, published: m.published };
  return { id: "", title: "", description: "", library: "", icon: "BookOpen", color: "blue", level: "Beginner", published: true };
}

function moduleBody(f: ModuleForm) {
  return { title: f.title.trim(), description: f.description, library: f.library, icon: f.icon, color: f.color, level: f.level, published: f.published };
}

interface LessonForm {
  id: string;
  title: string;
  summary: string;
  content: string;
  codeExample: string;
  chartType: ChartType;
  xp: number;
  durationMin: number;
  published: boolean;
  quiz: QuizQuestion[];
}

function lessonToForm(l: Lesson | null): LessonForm {
  if (l) {
    return {
      id: l.id,
      title: l.title,
      summary: l.summary,
      content: l.content,
      codeExample: l.codeExample,
      chartType: l.chartType,
      xp: l.xp,
      durationMin: l.durationMin,
      published: l.published,
      quiz: l.quiz.map((q) => ({ question: q.question, options: [...q.options], correctAnswer: q.correctAnswer, explanation: q.explanation })),
    };
  }
  return { id: "", title: "", summary: "", content: "", codeExample: "", chartType: "none", xp: 50, durationMin: 8, published: true, quiz: [] };
}

function quizBody(quiz: QuizQuestion[]) {
  return quiz.map((q) => ({ question: q.question.trim(), options: q.options.map((o) => o.trim()), correctAnswer: q.correctAnswer, explanation: q.explanation }));
}

function lessonBody(moduleId: string, f: LessonForm) {
  return {
    moduleId,
    title: f.title.trim(),
    summary: f.summary,
    content: f.content,
    codeExample: f.codeExample,
    chartType: f.chartType,
    xp: f.xp,
    durationMin: f.durationMin,
    published: f.published,
    quiz: quizBody(f.quiz),
  };
}

function validateLesson(f: LessonForm): string | null {
  if (f.title.trim().length < 2) return "Title must be at least 2 characters.";
  if (!Number.isInteger(f.xp) || f.xp < 0 || f.xp > 1000) return "XP must be a whole number between 0 and 1000.";
  if (!Number.isInteger(f.durationMin) || f.durationMin < 1 || f.durationMin > 240) return "Duration must be a whole number between 1 and 240 minutes.";
  for (let i = 0; i < f.quiz.length; i++) {
    const q = f.quiz[i];
    if (q.question.trim().length < 3) return `Quiz question ${i + 1} needs at least 3 characters.`;
    if (q.options.length < 2 || q.options.length > 6) return `Quiz question ${i + 1} needs between 2 and 6 options.`;
    if (q.options.some((o) => !o.trim())) return `Quiz question ${i + 1} has an empty option.`;
    if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) return `Quiz question ${i + 1} needs a correct answer selected.`;
  }
  return null;
}

function newQuestion(): QuizQuestion {
  return { question: "", options: ["", ""], correctAnswer: 0, explanation: "" };
}

function cleanId(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/* ----------------------------------------------------------- Module modal */
function ModuleModal({ module, onClose, onSaved }: { module: Module | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const isNew = !module;
  const [form, setForm] = useState<ModuleForm>(() => moduleToForm(module));
  const [idTouched, setIdTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<EditorError | null>(null);

  const set = <K extends keyof ModuleForm>(k: K, v: ModuleForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const onTitle = (v: string) => setForm((f) => ({ ...f, title: v, id: isNew && !idTouched ? slugify(v) : f.id }));

  const save = async () => {
    if (form.title.trim().length < 2) {
      setError({ message: "Title must be at least 2 characters.", details: [] });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (module) await api.put(`/admin/modules/${module.id}`, moduleBody(form));
      else await api.post("/admin/modules", { ...moduleBody(form), id: form.id ? slugify(form.id) : undefined });
      await onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isNew ? "New module" : "Edit module"} size="lg">
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Title" className="md:col-span-2">
          <Input value={form.title} onChange={(e) => onTitle(e.target.value)} placeholder="e.g. NumPy Fundamentals" autoFocus />
        </Field>
        <Field label="ID (slug)" hint={isNew ? "Used in lesson URLs. Generated from the title; edit if needed." : "IDs cannot be changed after creation."}>
          <Input
            value={form.id}
            readOnly={!isNew}
            onChange={(e) => {
              setIdTouched(true);
              set("id", cleanId(e.target.value));
            }}
            className={cn("font-mono", !isNew && "opacity-60 cursor-not-allowed")}
            placeholder="numpy-fundamentals"
          />
        </Field>
        <Field label="Library" hint="Shown as a tag on the module card.">
          <Input value={form.library} onChange={(e) => set("library", e.target.value)} placeholder="NumPy" />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea rows={3} className="min-h-[90px]" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What will learners be able to do after this module?" />
        </Field>
        <EditorIconPicker value={form.icon} onChange={(v) => set("icon", v)} color={form.color} />
        <EditorColorPicker value={form.color} onChange={(v) => set("color", v)} />
        <Field label="Level">
          <Select value={form.level} onChange={(e) => set("level", e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Toggle checked={form.published} onChange={(v) => set("published", v)} label="Published" description="Visible to learners on the public site." />
        </div>
      </div>
      <EditorFooter onCancel={onClose} onSave={save} saving={saving} error={error} saveLabel={isNew ? "Create module" : "Save module"}>
        {isNew ? "New modules are appended to the end of the list." : `Editing ${module?.id}`}
      </EditorFooter>
    </Modal>
  );
}

/* ------------------------------------------------------------ Quiz editor */
function QuizEditor({ quiz, onChange }: { quiz: QuizQuestion[]; onChange: (q: QuizQuestion[]) => void }) {
  const update = (i: number, patch: Partial<QuizQuestion>) => onChange(quiz.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= quiz.length) return;
    const next = [...quiz];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(quiz.filter((_, j) => j !== i));
  const setOption = (i: number, j: number, v: string) => update(i, { options: quiz[i].options.map((o, k) => (k === j ? v : o)) });
  const addOption = (i: number) => {
    if (quiz[i].options.length >= 6) return;
    update(i, { options: [...quiz[i].options, ""] });
  };
  const removeOption = (i: number, j: number) => {
    const q = quiz[i];
    if (q.options.length <= 2) return;
    const options = q.options.filter((_, k) => k !== j);
    let correct = q.correctAnswer;
    if (j < correct) correct -= 1;
    else if (j === correct) correct = 0;
    update(i, { options, correctAnswer: Math.min(correct, options.length - 1) });
  };

  return (
    <div className="space-y-5">
      {quiz.length === 0 && (
        <EmptyState
          icon={<HelpCircle size={26} />}
          title="No quiz questions yet"
          description="Add multiple-choice questions to check understanding at the end of the lesson. Learners earn XP for correct answers."
          action={
            <Button variant="secondary" onClick={() => onChange([newQuestion()])}>
              <Plus size={14} /> Add first question
            </Button>
          }
        />
      )}
      {quiz.map((q, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Question {i + 1}</span>
            <div className="flex items-center gap-1">
              <EditorOrderButtons onUp={() => move(i, -1)} onDown={() => move(i, 1)} disableUp={i === 0} disableDown={i === quiz.length - 1} />
              <EditorIconButton title="Remove question" danger onClick={() => remove(i)}>
                <Trash2 size={15} />
              </EditorIconButton>
            </div>
          </div>
          <Field label="Question">
            <Textarea rows={2} className="min-h-[64px]" value={q.question} onChange={(e) => update(i, { question: e.target.value })} placeholder="What does np.arange(0, 10, 2) return?" />
          </Field>
          <div className="space-y-2">
            <span className="label block">Options (select the correct answer)</span>
            {q.options.map((o, j) => (
              <div key={j} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`quiz-correct-${i}`}
                  checked={q.correctAnswer === j}
                  onChange={() => update(i, { correctAnswer: j })}
                  className="w-4 h-4 accent-emerald-600 shrink-0"
                  aria-label={`Mark option ${j + 1} as correct`}
                />
                <Input value={o} onChange={(e) => setOption(i, j, e.target.value)} placeholder={`Option ${j + 1}`} className={cn("py-2", q.correctAnswer === j && "ring-2 ring-emerald-500/40 border-emerald-400")} />
                <EditorIconButton title="Remove option" danger disabled={q.options.length <= 2} onClick={() => removeOption(i, j)}>
                  <Trash2 size={14} />
                </EditorIconButton>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => addOption(i)} disabled={q.options.length >= 6}>
              <Plus size={12} /> Add option ({q.options.length}/6)
            </Button>
          </div>
          <Field label="Explanation" hint="Shown after answering, whether right or wrong.">
            <Textarea rows={2} className="min-h-[64px]" value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} placeholder="Why is that the correct answer?" />
          </Field>
        </div>
      ))}
      {quiz.length > 0 && (
        <Button variant="secondary" onClick={() => onChange([...quiz, newQuestion()])} disabled={quiz.length >= 20}>
          <Plus size={14} /> Add question ({quiz.length}/20)
        </Button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- Lesson modal */
function LessonModal({ moduleId, moduleTitle, lesson, onClose, onSaved }: { moduleId: string; moduleTitle: string; lesson: Lesson | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const isNew = !lesson;
  const [tab, setTab] = useState("basics");
  const [form, setForm] = useState<LessonForm>(() => lessonToForm(lesson));
  const [idTouched, setIdTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<EditorError | null>(null);

  const set = <K extends keyof LessonForm>(k: K, v: LessonForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const onTitle = (v: string) => setForm((f) => ({ ...f, title: v, id: isNew && !idTouched ? slugify(v) : f.id }));

  const save = async () => {
    const problem = validateLesson(form);
    if (problem) {
      setError({ message: problem, details: [] });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (lesson) await api.put(`/admin/lessons/${lesson.id}`, lessonBody(moduleId, form));
      else await api.post("/admin/lessons", { ...lessonBody(moduleId, form), id: form.id ? slugify(form.id) : undefined });
      await onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "basics", label: "Basics" },
    { id: "content", label: "Content" },
    { id: "code", label: "Code" },
    { id: "quiz", label: "Quiz", badge: form.quiz.length },
  ];

  return (
    <Modal open onClose={onClose} title={isNew ? `New lesson in ${moduleTitle}` : `Edit lesson`} size="xl">
      <EditorTabs tabs={tabs} active={tab} onChange={setTab} className="mb-6" />

      {tab === "basics" && (
        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Title" className="md:col-span-2">
            <Input value={form.title} onChange={(e) => onTitle(e.target.value)} placeholder="e.g. Creating Arrays" autoFocus />
          </Field>
          <Field label="ID (slug)" hint={isNew ? "Used in the lesson URL. Generated from the title." : "IDs cannot be changed after creation."}>
            <Input
              value={form.id}
              readOnly={!isNew}
              onChange={(e) => {
                setIdTouched(true);
                set("id", cleanId(e.target.value));
              }}
              className={cn("font-mono", !isNew && "opacity-60 cursor-not-allowed")}
              placeholder="creating-arrays"
            />
          </Field>
          <Field label="Chart type" hint="Renders an interactive sample chart under the code example.">
            <Select value={form.chartType} onChange={(e) => set("chartType", e.target.value as ChartType)}>
              {CHART_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Summary" className="md:col-span-2" hint="One or two sentences shown in the lesson list.">
            <Textarea rows={2} className="min-h-[72px]" value={form.summary} onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field label="XP reward" hint="0 - 1000">
            <Input type="number" min={0} max={1000} value={form.xp} onChange={(e) => set("xp", e.target.value === "" ? 0 : Number(e.target.value))} />
          </Field>
          <Field label="Duration (minutes)" hint="1 - 240">
            <Input type="number" min={1} max={240} value={form.durationMin} onChange={(e) => set("durationMin", e.target.value === "" ? 0 : Number(e.target.value))} />
          </Field>
          <div className="md:col-span-2">
            <Toggle checked={form.published} onChange={(v) => set("published", v)} label="Published" description="Unpublished lessons are hidden from learners but stay editable here." />
          </div>
        </div>
      )}

      {tab === "content" && (
        <EditorMarkdown
          value={form.content}
          onChange={(v) => set("content", v)}
          label="Lesson content (Markdown)"
          rows={22}
          hint="GitHub-flavoured Markdown. Fenced code blocks tagged python are syntax highlighted on the lesson page."
        />
      )}

      {tab === "code" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Field label="Code example (Python)" hint="Learners can copy this and run it in the playground.">
            <textarea
              className="input font-mono text-[13px] leading-relaxed resize-y min-h-[320px] custom-scrollbar"
              rows={18}
              spellCheck={false}
              value={form.codeExample}
              onChange={(e) => set("codeExample", e.target.value)}
              placeholder={"import numpy as np\narr = np.arange(10)\nprint(arr)"}
            />
          </Field>
          <div className="space-y-2">
            <span className="label block">Preview</span>
            {form.codeExample.trim() ? (
              <CodeBlock code={form.codeExample} tryIt={false} filename={`${form.id || "example"}.py`} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 min-h-[200px] flex items-center justify-center text-sm text-slate-400 font-medium">Type some code to see the preview.</div>
            )}
          </div>
        </div>
      )}

      {tab === "quiz" && <QuizEditor quiz={form.quiz} onChange={(q) => set("quiz", q)} />}

      <EditorFooter onCancel={onClose} onSave={save} saving={saving} error={error} saveLabel={isNew ? "Create lesson" : "Save lesson"}>
        {form.quiz.length} quiz {form.quiz.length === 1 ? "question" : "questions"} - {form.xp} XP - {form.durationMin} min
      </EditorFooter>
    </Modal>
  );
}

/* ----------------------------------------------------------------- Page */
type Confirm = { kind: "module"; module: Module } | { kind: "lesson"; lesson: Lesson } | null;

export default function Curriculum() {
  const toast = useToast();
  const { refreshModules } = useSite();
  const [modules, setModules] = useState<Module[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moduleEditor, setModuleEditor] = useState<{ module: Module | null } | null>(null);
  const [lessonEditor, setLessonEditor] = useState<{ lesson: Lesson | null } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ modules: Module[] }>("/admin/modules");
      setModules(d.modules);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
      setModules((m) => m ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modules || modules.length === 0) return;
    if (!selectedId || !modules.some((m) => m.id === selectedId)) setSelectedId(modules[0].id);
  }, [modules, selectedId]);

  const afterMutation = useCallback(async () => {
    await load();
    refreshModules();
  }, [load, refreshModules]);

  const selected = useMemo(() => modules?.find((m) => m.id === selectedId) ?? null, [modules, selectedId]);

  const stats = useMemo(() => {
    const list = modules ?? [];
    const lessons = list.flatMap((m) => m.lessons);
    const quiz = lessons.reduce((n, l) => n + l.quiz.length, 0);
    const publishedLessons = lessons.filter((l) => l.published).length;
    const publishedModules = list.filter((m) => m.published).length;
    return { modules: list.length, publishedModules, lessons: lessons.length, publishedLessons, quiz, publishedPct: pct(publishedLessons, lessons.length) };
  }, [modules]);

  /* ---- module actions ---- */
  const moveModule = async (index: number, dir: -1 | 1) => {
    if (!modules) return;
    const t = index + dir;
    if (t < 0 || t >= modules.length) return;
    const next = [...modules];
    [next[index], next[t]] = [next[t], next[index]];
    setModules(next);
    try {
      await api.post("/admin/modules/reorder", { ids: next.map((m) => m.id) });
      refreshModules();
    } catch (e) {
      toast.error("Could not reorder modules", errorMessage(e));
      load();
    }
  };

  const toggleModule = async (m: Module) => {
    const published = !m.published;
    setModules((list) => list?.map((x) => (x.id === m.id ? { ...x, published } : x)) ?? list);
    try {
      await api.put(`/admin/modules/${m.id}`, { ...moduleBody(moduleToForm(m)), published });
      refreshModules();
      toast.success(published ? "Module published" : "Module unpublished", m.title);
    } catch (e) {
      toast.error("Could not update module", errorMessage(e));
      load();
    }
  };

  /* ---- lesson actions ---- */
  const moveLesson = async (index: number, dir: -1 | 1) => {
    if (!selected) return;
    const t = index + dir;
    if (t < 0 || t >= selected.lessons.length) return;
    const next = [...selected.lessons];
    [next[index], next[t]] = [next[t], next[index]];
    setModules((list) => list?.map((m) => (m.id === selected.id ? { ...m, lessons: next } : m)) ?? list);
    try {
      await api.post("/admin/lessons/reorder", { moduleId: selected.id, ids: next.map((l) => l.id) });
      refreshModules();
    } catch (e) {
      toast.error("Could not reorder lessons", errorMessage(e));
      load();
    }
  };

  const toggleLesson = async (l: Lesson) => {
    const published = !l.published;
    setModules((list) => list?.map((m) => (m.id === l.moduleId ? { ...m, lessons: m.lessons.map((x) => (x.id === l.id ? { ...x, published } : x)) } : m)) ?? list);
    try {
      await api.put(`/admin/lessons/${l.id}`, { ...lessonBody(l.moduleId, lessonToForm(l)), published });
      refreshModules();
      toast.success(published ? "Lesson published" : "Lesson unpublished", l.title);
    } catch (e) {
      toast.error("Could not update lesson", errorMessage(e));
      load();
    }
  };

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.kind === "module") {
        await api.del(`/admin/modules/${confirm.module.id}`);
        toast.success("Module deleted", confirm.module.title);
      } else {
        await api.del(`/admin/lessons/${confirm.lesson.id}`);
        toast.success("Lesson deleted", confirm.lesson.title);
      }
      setConfirm(null);
      await afterMutation();
    } catch (e) {
      toast.error("Could not delete", errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const loading = modules === null;

  return (
    <div className="animate-fade-in">
      <EditorPageHeader
        eyebrow="Content"
        title="Curriculum"
        subtitle="Modules, lessons, code examples and quizzes. Changes go live on the public site as soon as they are saved."
        actions={
          <Button onClick={() => setModuleEditor({ module: null })}>
            <Plus size={16} /> New module
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

      {/* Summary row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)
        ) : (
          <>
            <StatTile label="Modules" value={stats.modules} icon={<Layers size={20} />} color="blue" sub={`${stats.publishedModules} published`} />
            <StatTile label="Lessons" value={stats.lessons} icon={<BookOpen size={20} />} color="indigo" sub={`${stats.publishedLessons} published`} />
            <StatTile label="Quiz questions" value={stats.quiz} icon={<ListChecks size={20} />} color="amber" sub="across all lessons" />
            <StatTile label="Published" value={`${stats.publishedPct}%`} icon={<CheckCircle2 size={20} />} color="emerald" sub="of lessons live" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start">
        {/* Modules */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Modules</h2>
              <p className="text-xs text-slate-400 font-medium">Select a module to manage its lessons.</p>
            </div>
            <Pill color="slate">{stats.modules}</Pill>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : modules && modules.length === 0 ? (
            <EmptyState
              icon={<Layers size={26} />}
              title="No modules yet"
              description="Create your first module to start building the curriculum."
              action={
                <Button onClick={() => setModuleEditor({ module: null })}>
                  <Plus size={16} /> New module
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {modules?.map((m, i) => {
                const c = colorClasses(m.color);
                const isSel = m.id === selectedId;
                return (
                  <div
                    key={m.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(m.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedId(m.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                      isSel ? "border-blue-500 bg-blue-50/60 dark:bg-blue-900/10 shadow-sm" : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600",
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", c.soft)}>
                      <Icon name={m.icon} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-black text-sm text-slate-900 dark:text-white truncate">{m.title}</span>
                        {!m.published && <Pill color="amber">Draft</Pill>}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        {m.library || "No library"} - {m.lessons.length} {m.lessons.length === 1 ? "lesson" : "lessons"} - {m.level}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <EditorSwitch checked={m.published} onChange={() => toggleModule(m)} label={m.published ? "Unpublish module" : "Publish module"} />
                      <EditorOrderButtons onUp={() => moveModule(i, -1)} onDown={() => moveModule(i, 1)} disableUp={i === 0} disableDown={i === modules.length - 1} />
                      <EditorIconButton title="Edit module" onClick={() => setModuleEditor({ module: m })}>
                        <Pencil size={15} />
                      </EditorIconButton>
                      <EditorIconButton title="Delete module" danger onClick={() => setConfirm({ kind: "module", module: m })}>
                        <Trash2 size={15} />
                      </EditorIconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lessons */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">{selected ? selected.title : "Lessons"}</h2>
              <p className="text-xs text-slate-400 font-medium">{selected ? `${selected.lessons.length} ${selected.lessons.length === 1 ? "lesson" : "lessons"} in this module` : "Select a module on the left."}</p>
            </div>
            {selected && (
              <Button size="sm" onClick={() => setLessonEditor({ lesson: null })}>
                <Plus size={14} /> New lesson
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : !selected ? (
            <EmptyState icon={<BookOpen size={26} />} title="No module selected" description="Pick a module to see and edit its lessons." />
          ) : selected.lessons.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={26} />}
              title="No lessons in this module"
              description="Add the first lesson with content, a code example and an optional quiz."
              action={
                <Button onClick={() => setLessonEditor({ lesson: null })}>
                  <Plus size={16} /> New lesson
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {selected.lessons.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0 text-xs font-black tabular-nums">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-black text-sm text-slate-900 dark:text-white truncate">{l.title}</span>
                      {!l.published && <Pill color="amber">Draft</Pill>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Zap size={11} /> {l.xp} XP
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {l.durationMin} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <HelpCircle size={11} /> {l.quiz.length} {l.quiz.length === 1 ? "question" : "questions"}
                      </span>
                      {l.chartType !== "none" && <span className="uppercase tracking-widest text-[10px]">{l.chartType}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <EditorSwitch checked={l.published} onChange={() => toggleLesson(l)} label={l.published ? "Unpublish lesson" : "Publish lesson"} />
                    <EditorOrderButtons onUp={() => moveLesson(i, -1)} onDown={() => moveLesson(i, 1)} disableUp={i === 0} disableDown={i === selected.lessons.length - 1} />
                    <EditorIconButton title="Edit lesson" onClick={() => setLessonEditor({ lesson: l })}>
                      <Pencil size={15} />
                    </EditorIconButton>
                    <EditorIconButton title="Delete lesson" danger onClick={() => setConfirm({ kind: "lesson", lesson: l })}>
                      <Trash2 size={15} />
                    </EditorIconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {moduleEditor && <ModuleModal module={moduleEditor.module} onClose={() => setModuleEditor(null)} onSaved={afterMutation} />}
      {lessonEditor && selected && <LessonModal moduleId={selected.id} moduleTitle={selected.title} lesson={lessonEditor.lesson} onClose={() => setLessonEditor(null)} onSaved={afterMutation} />}

      <ConfirmDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
        loading={deleting}
        title={confirm?.kind === "module" ? "Delete module?" : "Delete lesson?"}
        message={
          confirm?.kind === "module"
            ? `"${confirm.module.title}" and all ${confirm.module.lessons.length} of its lessons, quizzes and learner progress for them will be permanently removed.`
            : confirm?.kind === "lesson"
              ? `"${confirm.lesson.title}" and its quiz will be permanently removed. Learner completions for this lesson are lost.`
              : ""
        }
      />
    </div>
  );
}
