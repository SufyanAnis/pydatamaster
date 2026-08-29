import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, CheckCircle2, Code2, FileSpreadsheet, Sparkles, Trophy, Zap, Clock, Layers } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { PipelineStep, PostSummary } from "../lib/types";
import { Icon } from "../lib/icons";
import { colorClasses, pct, cn } from "../lib/utils";
import { AdSlot } from "../components/AdSlot";
import { ProgressBar, Skeleton } from "../components/ui";

const HERO_CODE = [
  ["k", "import"],
  ["", " pandas "],
  ["k", "as"],
  ["", " pd\n"],
  ["", "df = pd."],
  ["f", "read_csv"],
  ["", "("],
  ["s", '"sales.csv"'],
  ["", ")\n"],
  ["", "df."],
  ["f", "groupby"],
  ["", "("],
  ["s", '"region"'],
  ["", ")["],
  ["s", '"revenue"'],
  ["", "]."],
  ["f", "sum"],
  ["", "()\n"],
] as const;

function PhaseRow({ label, steps, tone }: { label: string; steps: PipelineStep[]; tone: "slate" | "blue" | "emerald" }) {
  const tones = {
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
  };
  return (
    <div className="space-y-6">
      <div className={cn("flex items-center gap-3 px-4 py-1 rounded-full w-fit mx-auto border", tones[tone])}>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className={cn("grid gap-6", steps.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3")}>
        {steps.map((s) => {
          const c = colorClasses(s.color);
          return (
            <Link key={s.id} to={`/pipeline/${s.id}`} className="flex flex-col items-center text-center group">
              <div className={cn("w-20 h-20 bg-white dark:bg-slate-900 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-current transition-all", c.text)}>
                <Icon name={s.icon} size={32} />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px] mb-1.5">
                {s.number}. {s.title}
              </h3>
              <div className={cn("text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-current opacity-80", c.text)}>{s.subtitle}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const { settings, modules, loading } = useSite();
  const { user, progress } = useAuth();
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  usePageTitle(null);

  useEffect(() => {
    api.get<{ steps: PipelineStep[] }>("/content/pipeline").then((d) => setSteps(d.steps)).catch(() => {});
    api.get<{ posts: PostSummary[] }>("/content/posts?limit=2").then((d) => setPosts(d.posts)).catch(() => {});
  }, []);

  const hero = settings?.hero;
  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const firstLesson = modules[0]?.lessons[0] ? `/lesson/${modules[0].id}/${modules[0].lessons[0].id}` : "/courses";
  const completed = new Set(progress?.completedLessons ?? []);

  // "Continue learning" target: first incomplete lesson.
  let continueHref = firstLesson;
  for (const m of modules) {
    const next = m.lessons.find((l) => !completed.has(l.id));
    if (next) {
      continueHref = `/lesson/${m.id}/${next.id}`;
      break;
    }
  }

  return (
    <div className="space-y-20 relative pb-10">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-[2.5rem] p-8 md:p-14 lg:p-16 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 grid lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-3 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
              <Sparkles size={14} className="text-amber-400" /> {hero?.badge ?? "Level Up Your Data Career"}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black mb-2 tracking-tighter leading-[1.05] drop-shadow-xl">{hero?.titleLine1 ?? "Master Python"}</h1>
            <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black mb-8 tracking-tighter leading-[1.05] text-blue-400 drop-shadow-xl">{hero?.titleLine2 ?? "Data Science Libraries"}</h2>
            <p className="text-slate-300 text-lg md:text-xl mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium opacity-90">{hero?.subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to={user ? continueHref : firstLesson} className="inline-flex justify-center items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 shadow-xl shadow-white/5">
                {user && progress?.completedLessons.length ? "Continue learning" : hero?.primaryCta ?? "Start Module 1"} <ArrowRight size={18} />
              </Link>
              {settings?.features.playground !== false && (
                <Link to="/playground" className="inline-flex justify-center items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-blue-500 shadow-xl shadow-blue-500/20">
                  <Code2 size={18} /> {hero?.secondaryCta ?? "Live Playground"}
                </Link>
              )}
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              {[
                { v: modules.length || "4", l: "Modules" },
                { v: totalLessons || "19", l: "Lessons" },
                { v: "Free", l: "To start" },
              ].map((s) => (
                <div key={s.l} className="text-center lg:text-left">
                  <div className="text-2xl md:text-3xl font-black text-white">{s.v}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 hidden lg:block">
            <div className="rounded-3xl bg-slate-950/80 border border-white/10 shadow-2xl overflow-hidden animate-float">
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">playground.py</span>
              </div>
              <pre className="p-5 text-[13px] font-mono leading-relaxed text-slate-200">
                {HERO_CODE.map(([cls, txt], i) => (
                  <span key={i} className={cls ? `tok-${cls}` : ""}>
                    {txt}
                  </span>
                ))}
              </pre>
              <div className="px-5 pb-5">
                <div className="rounded-xl bg-black/40 border border-white/5 p-4 font-mono text-[12px] text-slate-300">
                  <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">output</div>
                  <div>region</div>
                  <div>East&nbsp;&nbsp;&nbsp;&nbsp;165</div>
                  <div>North&nbsp;&nbsp;&nbsp;400</div>
                  <div>South&nbsp;&nbsp;&nbsp;200</div>
                  <div className="text-slate-500">Name: revenue, dtype: int64</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] -ml-32 -mb-32" />
      </section>

      {/* Curriculum */}
      <section>
        <div className="text-center mb-12">
          <span className="eyebrow mb-2 block">Our Learning Path</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Comprehensive Curriculum</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((m, idx) => {
              const c = colorClasses(m.color);
              const done = m.lessons.filter((l) => completed.has(l.id)).length;
              const percent = pct(done, m.lessons.length);
              const next = m.lessons.find((l) => !completed.has(l.id)) ?? m.lessons[0];
              return (
                <div key={m.id} className="card p-6 md:p-7 hover:shadow-xl transition-all group flex flex-col animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="flex items-center gap-4 mb-5">
                    <div className={cn("p-3 rounded-2xl shrink-0", c.bg, c.text)}>
                      <Icon name={m.icon} size={24} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{m.title}</h3>
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", c.text)}>
                        {m.lessons.length} lessons · {m.level}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-5 leading-relaxed font-medium line-clamp-3">{m.description}</p>
                  <div className="space-y-2.5 mb-6 flex-1">
                    {m.lessons.slice(0, 3).map((l) => (
                      <div key={l.id} className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <CheckCircle2 size={14} className={cn("shrink-0", completed.has(l.id) ? "text-emerald-500" : "text-blue-500/60")} />
                        <span className="truncate">{l.title}</span>
                      </div>
                    ))}
                    {m.lessons.length > 3 && <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-6">+{m.lessons.length - 3} more</div>}
                  </div>
                  {user && (
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        <span>Progress</span>
                        <span className={c.text}>{percent}%</span>
                      </div>
                      <ProgressBar value={percent} className="h-2" />
                    </div>
                  )}
                  <Link
                    to={next ? `/lesson/${m.id}/${next.id}` : "/courses"}
                    className="flex items-center justify-center w-full py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all border border-slate-100 dark:border-slate-700 group-hover:border-blue-600"
                  >
                    {percent === 100 ? "Review course" : done > 0 ? "Continue" : "Join course"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pipeline */}
      <section>
        <div className="text-center mb-12">
          <span className="eyebrow mb-2 block">The Full Stack Architecture</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">The Data Science Pipeline</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium max-w-2xl mx-auto">Ten tools, three phases. Click any step to see what it does, what to learn, and what you'll be able to build.</p>
        </div>
        {steps.length > 0 && (
          <div className="space-y-16">
            <PhaseRow label="Phase 1: Data Manipulation" steps={steps.slice(0, 3)} tone="slate" />
            <PhaseRow label="Phase 2: Machine Learning & AI" steps={steps.slice(3, 7)} tone="blue" />
            <PhaseRow label="Phase 3: Automation & MLOps" steps={steps.slice(7, 10)} tone="emerald" />
          </div>
        )}
      </section>

      {/* Why */}
      <section className="grid md:grid-cols-3 gap-6">
        {[
          { icon: <Code2 size={26} />, title: "Real Python, in your browser", text: "The playground runs actual NumPy, Pandas, Matplotlib and Scikit-Learn code client-side. No installs, no sign-up required.", color: "blue", to: "/playground" },
          { icon: <Bot size={26} />, title: "AI tutor on every page", text: "Stuck on a concept or an error? The tutor knows which lesson you're on and what code you're running.", color: "indigo", to: "#tutor" },
          { icon: <Trophy size={26} />, title: "XP, streaks & badges", text: "Every lesson and quiz earns XP. Keep your streak alive, unlock badges and climb the leaderboard.", color: "amber", to: user ? "/progress" : "/signup" },
        ].map((f) => {
          const c = colorClasses(f.color);
          return (
            <div key={f.title} className="card p-8 hover:shadow-xl transition-all">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", c.bg, c.text)}>{f.icon}</div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-3">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{f.text}</p>
            </div>
          );
        })}
      </section>

      {/* News + resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Latest News</h2>
            <Link to="/blog" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
              All posts
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {posts.map((p) => (
              <article key={p.id} className="card p-6 hover:shadow-xl transition-all group/card">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{p.category}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={11} /> {p.readTime}
                  </span>
                </div>
                <h3 className="font-black text-slate-800 dark:text-white mb-3 leading-tight text-lg group-hover/card:text-blue-600 transition-colors">
                  <Link to={`/blog/${p.id}`}>{p.title}</Link>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 font-medium">{p.excerpt}</p>
                <Link to={`/blog/${p.id}`} className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-4 transition-all">
                  Read more <ArrowRight size={14} className="text-blue-600" />
                </Link>
              </article>
            ))}
            {posts.length === 0 && [0, 1].map((i) => <Skeleton key={i} className="h-44" />)}
          </div>
        </section>
        <section>
          <div className="bg-indigo-900 rounded-3xl p-8 text-white text-center shadow-xl shadow-indigo-500/20 h-full flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
              <FileSpreadsheet size={24} className="text-amber-400" />
            </div>
            <h3 className="font-black text-xl mb-3 tracking-tight relative">Interactive Cheat Sheets</h3>
            <p className="text-xs text-indigo-200 mb-6 font-medium leading-relaxed relative">Professional-grade quick reference guides for NumPy, Pandas and Matplotlib - readable online or printable as PDF.</p>
            <Link to="/resources" className="inline-block w-full py-3 bg-white text-indigo-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg relative">
              Browse resources
            </Link>
          </div>
        </section>
      </div>

      {/* CTA */}
      {!user && settings?.features.signup !== false && (
        <section className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-10 md:p-14 text-center text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 blur-[100px] rounded-full -mr-20 -mt-20" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-4">
              <Zap size={14} className="text-amber-300" /> Free learner profile
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">Save your progress. Earn XP. Build a streak.</h2>
            <p className="text-blue-100 font-medium max-w-xl mx-auto mb-8">Create a profile in 20 seconds to track completed lessons, quiz scores and badges across devices.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup" className="btn bg-white text-blue-700 px-8 py-4 hover:bg-amber-400 hover:text-slate-900">
                Create learner profile
              </Link>
              <Link to="/courses" className="btn bg-blue-500/30 text-white border border-white/20 px-8 py-4 hover:bg-blue-500/50">
                <Layers size={16} /> Browse curriculum
              </Link>
            </div>
          </div>
        </section>
      )}

      <AdSlot slot="content" className="h-40" />
    </div>
  );
}
