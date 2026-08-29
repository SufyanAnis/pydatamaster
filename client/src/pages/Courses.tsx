import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, CheckCircle2, Clock, Layers, Sparkles, Zap } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import type { Module } from "../lib/types";
import { Icon } from "../lib/icons";
import { cn, colorClasses, pct } from "../lib/utils";
import { AdSlot } from "../components/AdSlot";
import { EmptyState, LinkButton, PageHero, Pill, ProgressBar, Skeleton } from "../components/ui";

type PillColor = "blue" | "slate" | "emerald" | "amber" | "red" | "indigo";
const LEVEL_COLORS: Record<string, PillColor> = { beginner: "emerald", intermediate: "amber", advanced: "red", expert: "indigo" };
const levelColor = (level: string): PillColor => LEVEL_COLORS[level.trim().toLowerCase()] ?? "slate";

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function ModuleCard({ module, index, completed, loggedIn }: { module: Module; index: number; completed: Set<string>; loggedIn: boolean }) {
  const c = colorClasses(module.color);
  const total = module.lessons.length;
  const done = module.lessons.filter((l) => completed.has(l.id)).length;
  const percent = pct(done, total);
  const next = module.lessons.find((l) => !completed.has(l.id)) ?? module.lessons[0];
  const minutes = module.lessons.reduce((n, l) => n + (l.durationMin || 0), 0);
  const xp = module.lessons.reduce((n, l) => n + (l.xp || 0), 0);
  const href = next ? `/lesson/${module.id}/${next.id}` : "/courses";
  const label = total === 0 ? "Coming soon" : percent === 100 ? "Review module" : done > 0 ? "Continue" : "Start module";

  const stats = [
    { icon: <Layers size={14} />, value: total, label: total === 1 ? "Lesson" : "Lessons" },
    { icon: <Clock size={14} />, value: formatMinutes(minutes), label: "Duration" },
    { icon: <Zap size={14} />, value: `${xp} XP`, label: "Reward" },
  ];

  return (
    <article className="card p-6 md:p-8 hover:shadow-xl transition-all animate-fade-in-up" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
        {/* Left: identity */}
        <div className="lg:w-[300px] shrink-0">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br shadow-lg", c.gradient)}>
              <Icon name={module.icon} size={30} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Module {String(index + 1).padStart(2, "0")}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight mb-3">{module.title}</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {module.library && <Pill color="blue">{module.library}</Pill>}
            {module.level && <Pill color={levelColor(module.level)}>{module.level}</Pill>}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{module.description}</p>
        </div>

        {/* Right: details */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="grid grid-cols-3 gap-3 mb-6">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 px-3 sm:px-4 py-3 min-w-0">
                <div className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-1", c.text)}>
                  {s.icon} <span className="truncate">{s.label}</span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="mb-6 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">What you will learn</div>
            <div className="flex flex-wrap gap-2">
              {module.lessons.map((l, i) => {
                const isDone = completed.has(l.id);
                return (
                  <Link
                    key={l.id}
                    to={`/lesson/${module.id}/${l.id}`}
                    title={l.summary}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                      isDone
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:border-emerald-400"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400",
                    )}
                  >
                    {isDone ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> : <span className="text-[10px] font-black text-slate-400 tabular-nums">{i + 1}</span>}
                    <span>{l.title}</span>
                  </Link>
                );
              })}
              {total === 0 && <span className="text-xs text-slate-400 font-medium">Lessons are being prepared.</span>}
            </div>
          </div>

          {loggedIn && total > 0 && (
            <div className="mb-5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                <span>
                  {done} of {total} completed
                </span>
                <span className={c.text}>{percent}%</span>
              </div>
              <ProgressBar value={percent} className="h-2" color={percent === 100 ? "emerald" : "blue"} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              {loggedIn ? (percent === 100 ? "Module complete - nice work!" : "Progress is saved to your profile") : "Free to start - no account required"}
            </span>
            {total > 0 ? (
              <Link to={href} className="btn-primary px-6 py-3">
                {label} <ArrowRight size={16} />
              </Link>
            ) : (
              <span className="btn-secondary px-6 py-3 opacity-60">{label}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Courses() {
  usePageTitle("Courses");
  const { modules, loading } = useSite();
  const { user, progress } = useAuth();
  const [level, setLevel] = useState("All");

  const levels = useMemo(() => {
    const seen: string[] = [];
    for (const m of modules) if (m.level && !seen.includes(m.level)) seen.push(m.level);
    return ["All", ...seen];
  }, [modules]);
  const completed = useMemo(() => new Set(progress?.completedLessons ?? []), [progress]);
  const visible = level === "All" ? modules : modules.filter((m) => m.level === level);
  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const totalMinutes = modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + (l.durationMin || 0), 0), 0);
  const doneCount = modules.reduce((n, m) => n + m.lessons.filter((l) => completed.has(l.id)).length, 0);

  return (
    <div className="pb-10">
      <PageHero eyebrow="Our learning path" title="Full Curriculum" subtitle="Explore our structured learning paths designed to take you from beginner to data science pro using Python's most powerful libraries." />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by level">
          {levels.map((lv) => (
            <button
              key={lv}
              role="tab"
              aria-selected={level === lv}
              onClick={() => setLevel(lv)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                level === lv ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400",
              )}
            >
              {lv}
            </button>
          ))}
        </div>
        {!loading && (
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{modules.length} modules</span>
            <span>{totalLessons} lessons</span>
            <span>{formatMinutes(totalMinutes)} total</span>
            {user && <span className="text-blue-600 dark:text-blue-400">{pct(doneCount, totalLessons)}% complete</span>}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title="No modules found" description="Try a different level filter, or check back soon - new modules are on the way." />
      ) : (
        <div className="space-y-6">
          {visible.map((m) => (
            <ModuleCard key={m.id} module={m} index={modules.indexOf(m)} completed={completed} loggedIn={!!user} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 md:p-10 text-center bg-white/60 dark:bg-slate-900/40">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-5">
          <Bell size={24} />
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">More to come</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto mb-6">More modules will update timely; you will be notified.</p>
        <LinkButton to="/notify?source=courses" variant="dark">
          Notify me <ArrowRight size={16} />
        </LinkButton>
      </div>

      <AdSlot slot="content" className="h-48 mt-8" />
    </div>
  );
}
