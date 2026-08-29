import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bell, BookOpen, CheckCircle2, ChevronRight, Compass, ExternalLink, Home as HomeIcon, Layers, Target, Telescope } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { api, errorMessage } from "../lib/api";
import type { PipelineStep, Resource } from "../lib/types";
import { Icon } from "../lib/icons";
import { cn, colorClasses } from "../lib/utils";
import { AdSlot } from "../components/AdSlot";
import { EmptyState, LinkButton, Skeleton } from "../components/ui";

const LIBRARY_KEYS = ["numpy", "pandas", "matplotlib", "scikit"];

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && t !== "org" && t !== "com");
}

export default function PipelineStepPage() {
  const { stepId } = useParams();
  const { modules } = useSite();
  const [steps, setSteps] = useState<PipelineStep[] | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ steps: PipelineStep[] }>("/content/pipeline")
      .then((d) => !cancelled && setSteps([...d.steps].sort((a, b) => a.number - b.number)))
      .catch((err) => !cancelled && setError(errorMessage(err, "Could not load the pipeline.")));
    api
      .get<{ resources: Resource[] }>("/content/resources")
      .then((d) => !cancelled && setResources(d.resources))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const step = steps?.find((s) => s.id === stepId) ?? null;
  usePageTitle(step ? `${step.title} - ${step.subtitle}` : "Pipeline");

  const { prev, next } = useMemo(() => {
    if (!steps || !step) return { prev: null as PipelineStep | null, next: null as PipelineStep | null };
    const i = steps.findIndex((s) => s.id === step.id);
    return { prev: i > 0 ? steps[i - 1] : null, next: i < steps.length - 1 ? steps[i + 1] : null };
  }, [steps, step]);

  const { matchedModules, matchedResources } = useMemo(() => {
    if (!step) return { matchedModules: [], matchedResources: [] as Resource[] };
    const text = `${step.title} ${step.subtitle}`.toLowerCase();
    const keys = LIBRARY_KEYS.filter((k) => text.includes(k));
    const mods = modules.filter((m) => {
      const hay = `${m.library} ${m.title}`.toLowerCase();
      return keys.some((k) => hay.includes(k));
    });
    const docs = resources.filter((r) => {
      if (r.category !== "docs") return false;
      const tokens = nameTokens(r.name);
      return tokens.length > 0 && tokens.every((t) => text.includes(t));
    });
    return { matchedModules: mods, matchedResources: docs };
  }, [step, modules, resources]);

  if (error)
    return (
      <EmptyState
        title="Pipeline unavailable"
        description={error}
        action={
          <LinkButton to="/" variant="dark">
            Back home
          </LinkButton>
        }
      />
    );

  if (!steps)
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-40" />
        <div className="grid sm:grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    );

  if (!step)
    return (
      <EmptyState
        icon={<Compass size={26} />}
        title="Pipeline step not found"
        description="This step may have been renamed or removed. Browse the full pipeline from the home page."
        action={
          <LinkButton to="/" variant="dark">
            View the pipeline
          </LinkButton>
        }
      />
    );

  const c = colorClasses(step.color);
  const total = steps.length || 10;

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-fade-in-up">
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 flex-wrap">
        <Link to="/" className="hover:text-blue-600 flex items-center gap-1">
          <HomeIcon size={12} /> Home
        </Link>
        <ChevronRight size={10} />
        <Link to="/" className="hover:text-blue-600">
          Pipeline
        </Link>
        <ChevronRight size={10} />
        <span className="text-blue-600">{step.title}</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-start gap-5">
          <div className={cn("hidden sm:flex w-20 h-20 rounded-[1.5rem] border-2 items-center justify-center shrink-0 bg-white dark:bg-slate-900 shadow-lg", c.text, c.border)}>
            <Icon name={step.icon} size={34} />
          </div>
          <div className="min-w-0">
            <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mb-4", c.bg, c.text, c.border)}>
              <Layers size={12} /> Phase {step.number} of {total}
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.05]">
              {step.title}
              <span className={cn("block text-2xl md:text-3xl mt-2 tracking-tight", c.text)}>{step.subtitle}</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-5">{step.purpose}</p>
          </div>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">
            <CheckCircle2 size={14} className={c.text} /> Key Concepts
          </h3>
          <ul className="space-y-2.5">
            {step.keyConcepts.map((k) => (
              <li key={k} className="flex items-start gap-2.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                <CheckCircle2 size={16} className={cn("shrink-0 mt-0.5", c.text)} />
                <span>{k}</span>
              </li>
            ))}
            {step.keyConcepts.length === 0 && <li className="text-sm text-slate-400 font-medium">No concepts listed yet.</li>}
          </ul>
        </div>
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">
            <Icon name={step.icon} size={14} className={c.text} /> {step.coreLabel || "Core Items"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {step.coreItems.map((item) => (
              <code key={item} className={cn("px-2.5 py-1.5 rounded-lg text-[12px] font-mono font-semibold border", c.bg, c.text, c.border)}>
                {item}
              </code>
            ))}
            {step.coreItems.length === 0 && <span className="text-sm text-slate-400 font-medium">Nothing listed yet.</span>}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">
            <Telescope size={14} className={c.text} /> Scope
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{step.scope}</p>
        </div>
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">
            <Target size={14} className={c.text} /> Outcome
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{step.outcome}</p>
        </div>
      </div>

      {/* Phase navigation */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-[2rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] -mr-20 -mt-20" />
        <div className="relative">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 block mb-1">Part of the phase</span>
          <h2 className="text-xl md:text-2xl font-black tracking-tight mb-1">{step.phase}</h2>
          <p className="text-slate-400 text-sm font-medium mb-6">{step.group}</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
            {prev ? (
              <Link to={`/pipeline/${prev.id}`} className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/15 hover:bg-white/10 transition-colors min-w-0">
                <ArrowLeft size={18} className="shrink-0" />
                <span className="text-left min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Previous step</span>
                  <span className="font-bold text-sm truncate block">
                    {prev.number}. {prev.title}
                  </span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={`/pipeline/${next.id}`} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-colors sm:text-right min-w-0">
                <span className="min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-blue-200">Next step</span>
                  <span className="font-bold text-sm truncate block">
                    {next.number}. {next.title}
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0" />
              </Link>
            ) : (
              <Link to="/courses" className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-colors">
                <span className="font-bold text-sm">Start learning</span>
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Learn it here */}
      <section className="card p-6 md:p-8 mb-8">
        <span className="eyebrow mb-2 block">Learn it here</span>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-5">Lessons and references for {step.subtitle}</h2>
        {matchedModules.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {matchedModules.map((m) => {
              const mc = colorClasses(m.color);
              const first = m.lessons[0];
              return (
                <Link key={m.id} to={first ? `/lesson/${m.id}/${first.id}` : "/courses"} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all group">
                  <span className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", mc.bg, mc.text)}>
                    <Icon name={m.icon} size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-slate-900 dark:text-white tracking-tight truncate group-hover:text-blue-600 transition-colors">{m.title}</span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                      {m.lessons.length} lessons · {m.level}
                    </span>
                  </span>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <BookOpen size={22} />
            </div>
            <p className="font-black text-slate-900 dark:text-white tracking-tight">Lessons for this step are coming soon</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 mb-4">We are writing hands-on modules for {step.subtitle}. Get a heads-up when they land.</p>
            <LinkButton to={`/notify?source=pipeline-${step.id}`} variant="dark" size="sm">
              <Bell size={14} /> Notify me
            </LinkButton>
          </div>
        )}

        {matchedResources.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Official documentation</h3>
            <div className="flex flex-wrap gap-2">
              {matchedResources.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors" title={r.description}>
                  <Icon name={r.icon} size={14} /> {r.name} <ExternalLink size={12} className="text-slate-400" />
                </a>
              ))}
            </div>
          </div>
        )}
        {matchedResources.length === 0 && matchedModules.length > 0 && (
          <p className="text-xs text-slate-400 font-medium">
            Looking for more?{" "}
            <Link to="/resources" className="underline hover:text-blue-600">
              Browse all resources
            </Link>
            .
          </p>
        )}
      </section>

      <AdSlot slot="content" className="h-40" />
    </div>
  );
}
