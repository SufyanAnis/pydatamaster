import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Award, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Circle, ClipboardCheck, Code2, Crown, Flame, Lock, LogOut, Medal, PartyPopper, Settings, Sparkles, Star, Target, Trophy, Zap } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../lib/api";
import type { ActivityItem, Leader, Lesson, Module } from "../lib/types";
import { Icon } from "../lib/icons";
import { cn, colorClasses, formatDate, pct, timeAgo } from "../lib/utils";
import { Avatar, Button, LinkButton, Pill, ProgressBar, Skeleton, Spinner, StatTile } from "../components/ui";

interface ModuleStat {
  module: Module;
  completed: number;
  total: number;
  percent: number;
  next: Lesson | null;
}

function SectionTitle({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-5">
      <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900 dark:text-white tracking-tight">
        <span className="text-blue-600 dark:text-blue-400">{icon}</span>
        {title}
      </h2>
      {action}
    </div>
  );
}

function activityMeta(item: ActivityItem, lessonTitle: string | null): { label: string; icon: ReactNode; color: string } {
  const title = lessonTitle ?? "a lesson";
  switch (item.type) {
    case "lesson":
      return { label: `Completed ${title}`, icon: <BookOpen size={16} />, color: "emerald" };
    case "quiz":
      return { label: `Passed the quiz for ${title}`, icon: <ClipboardCheck size={16} />, color: "blue" };
    case "quiz_perfect":
      return { label: `Perfect score on the ${title} quiz`, icon: <Award size={16} />, color: "amber" };
    case "playground":
      return { label: "Ran code in the Python Playground", icon: <Code2 size={16} />, color: "indigo" };
    case "joined":
      return { label: "Joined PyDataMaster", icon: <Sparkles size={16} />, color: "violet" };
    default:
      return { label: item.type.replace(/_/g, " "), icon: <Zap size={16} />, color: "slate" };
  }
}

export default function Progress() {
  usePageTitle("My Progress");
  const { modules, loading: siteLoading } = useSite();
  const { user, progress, logout } = useAuth();
  const navigate = useNavigate();

  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [leadersError, setLeadersError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ leaders: Leader[] }>("/progress/leaderboard")
      .then((d) => !cancelled && setLeaders(d.leaders))
      .catch((err) => !cancelled && setLeadersError(errorMessage(err, "Could not load the leaderboard.")));
    return () => {
      cancelled = true;
    };
  }, []);

  const completedIds = progress?.completedLessons;
  const moduleStats = useMemo<ModuleStat[]>(() => {
    const done = new Set(completedIds ?? []);
    return modules.map((m) => {
      const completed = m.lessons.filter((l) => done.has(l.id)).length;
      return { module: m, completed, total: m.lessons.length, percent: pct(completed, m.lessons.length), next: m.lessons.find((l) => !done.has(l.id)) ?? null };
    });
  }, [modules, completedIds]);

  const lessonIndex = useMemo(() => {
    const map = new Map<string, { lesson: Lesson; module: Module }>();
    for (const m of modules) for (const l of m.lessons) map.set(l.id, { lesson: l, module: m });
    return map;
  }, [modules]);

  if (!user || !progress) return <Spinner label="Loading your progress" />;

  const totalLessons = progress.totalLessons || modules.reduce((n, m) => n + m.lessons.length, 0);
  const doneCount = progress.completedLessons.length;
  const completion = pct(doneCount, totalLessons);
  const nextUp = moduleStats.find((s) => s.next);
  const continueHref = nextUp && nextUp.next ? `/lesson/${nextUp.module.id}/${nextUp.next.id}` : "/courses";
  const earnedBadges = progress.badges.filter((b) => b.earned).length;
  const quiz = progress.quizStats;

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-10 pb-10 animate-fade-in-up">
      {/* Profile header */}
      <section className="card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <Avatar name={user.name} color={user.avatarColor} size="xl" className="mx-auto md:mx-0" />
          <div className="flex-1 text-center md:text-left min-w-0">
            <span className="eyebrow mb-2 block">Learner dashboard</span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight truncate">{user.name}&apos;s Progress</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
              <Pill color="blue">
                <Target size={11} /> {user.goal}
              </Pill>
              <Pill color="indigo">
                <Zap size={11} /> {user.level}
              </Pill>
              <Pill color="slate">Active since {formatDate(user.createdAt, { year: "numeric", month: "short", day: "numeric" })}</Pill>
              {user.role === "admin" && <Pill color="amber">Admin</Pill>}
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-3 justify-center shrink-0">
            <LinkButton to="/profile" variant="secondary" size="sm">
              <Settings size={14} /> Edit profile
            </LinkButton>
            <Button variant="ghost" size="sm" onClick={onLogout} loading={loggingOut}>
              <LogOut size={14} /> Log out
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatTile label="Total XP" value={progress.xp.toLocaleString()} icon={<Star size={20} />} color="blue" sub={`${earnedBadges} badge${earnedBadges === 1 ? "" : "s"} earned`} />
        <StatTile label="Streak" value={`${progress.streak} day${progress.streak === 1 ? "" : "s"}`} icon={<Flame size={20} />} color="orange" sub={`Longest: ${progress.longestStreak} day${progress.longestStreak === 1 ? "" : "s"}`} />
        <StatTile label="Completion" value={`${completion}%`} icon={<Target size={20} />} color="emerald" sub={`of ${totalLessons} lessons`} />
        <StatTile label="Lessons" value={`${doneCount}/${totalLessons}`} icon={<BookOpen size={20} />} color="indigo" sub={nextUp ? `Next: ${nextUp.module.title}` : "All complete"} />
        <StatTile label="Quiz accuracy" value={quiz.total ? `${pct(quiz.correct, quiz.total)}%` : "--"} icon={<ClipboardCheck size={20} />} color="amber" sub={`${quiz.correct}/${quiz.total} correct in ${quiz.attempts} attempt${quiz.attempts === 1 ? "" : "s"}`} />
      </section>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-10 min-w-0">
          {/* Continue learning */}
          <section>
            {siteLoading && modules.length === 0 ? (
              <Skeleton className="h-36" />
            ) : nextUp && nextUp.next ? (
              <Link to={continueHref} className="card p-6 md:p-7 flex flex-col sm:flex-row sm:items-center gap-5 hover:shadow-xl hover:-translate-y-0.5 transition-all group border-blue-100 dark:border-blue-900/40">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", colorClasses(nextUp.module.color).bg, colorClasses(nextUp.module.color).text)}>
                  <Icon name={nextUp.module.icon} size={26} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="eyebrow mb-1 block">Continue learning</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-blue-600 transition-colors">{nextUp.next.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                    {nextUp.module.title} · Lesson {nextUp.module.lessons.indexOf(nextUp.next) + 1} of {nextUp.total} · {nextUp.next.durationMin} min · {nextUp.next.xp} XP
                  </p>
                </div>
                <span className="btn-primary px-5 py-3 shrink-0 self-start sm:self-center">
                  Resume <ArrowRight size={16} />
                </span>
              </Link>
            ) : (
              <div className="card p-6 md:p-7 flex flex-col sm:flex-row sm:items-center gap-5 border-emerald-100 dark:border-emerald-900/40">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <PartyPopper size={26} />
                </div>
                <div className="flex-1">
                  <span className="eyebrow mb-1 block">All caught up</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">You have completed every published lesson.</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Keep your streak alive in the playground, or revisit a module to sharpen your skills.</p>
                </div>
                <LinkButton to="/playground" variant="dark" size="sm" className="shrink-0">
                  <Code2 size={14} /> Open playground
                </LinkButton>
              </div>
            )}
          </section>

          {/* Roadmap */}
          <section>
            <SectionTitle icon={<BookOpen size={20} />} title="Curriculum Roadmap" action={<span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{modules.length} modules</span>} />
            <div className="space-y-3">
              {siteLoading && modules.length === 0 && [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
              {moduleStats.map(({ module: m, completed, total, percent }) => {
                const c = colorClasses(m.color);
                const open = !!expanded[m.id];
                const done = new Set(progress.completedLessons);
                return (
                  <div key={m.id} className="card overflow-hidden">
                    <button type="button" onClick={() => setExpanded((e) => ({ ...e, [m.id]: !open }))} className="w-full text-left p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" aria-expanded={open}>
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", c.bg, c.text)}>
                        <Icon name={m.icon} size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <h3 className="font-black text-slate-900 dark:text-white tracking-tight truncate">{m.title}</h3>
                          <span className={cn("text-[10px] font-black uppercase tracking-widest shrink-0", percent === 100 ? "text-emerald-600" : c.text)}>
                            {percent === 100 ? "Complete" : `${percent}%`}
                          </span>
                        </div>
                        <ProgressBar value={percent} className="h-2" color={percent === 100 ? "emerald" : "blue"} />
                        <p className="text-[11px] font-bold text-slate-400 mt-1.5">
                          {completed}/{total} lessons · {m.level}
                        </p>
                      </div>
                      <span className="text-slate-400 shrink-0">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                    </button>
                    {open && (
                      <ol className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-1 animate-fade-in">
                        {m.lessons.map((l, i) => {
                          const isDone = done.has(l.id);
                          return (
                            <li key={l.id}>
                              <Link to={`/lesson/${m.id}/${l.id}`} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                {isDone ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <Circle size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                                <span className="flex-1 truncate">
                                  {i + 1}. {l.title}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">{l.xp} XP</span>
                              </Link>
                            </li>
                          );
                        })}
                        {m.lessons.length === 0 && <li className="px-3 py-2 text-xs font-medium text-slate-400">No lessons published yet.</li>}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Badges */}
          <section>
            <SectionTitle icon={<Award size={20} />} title="Badges" action={<span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{earnedBadges}/{progress.badges.length} unlocked</span>} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {progress.badges.map((b) => (
                <div key={b.id} className={cn("card p-5 text-center flex flex-col items-center transition-all", b.earned ? "hover:-translate-y-0.5 hover:shadow-xl border-amber-100 dark:border-amber-900/30" : "opacity-70")} title={b.description}>
                  <div className="relative mb-3">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", b.earned ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-400 grayscale")}>
                      <Icon name={b.icon} size={26} />
                    </div>
                    {!b.earned && (
                      <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                        <Lock size={11} />
                      </span>
                    )}
                  </div>
                  <h4 className={cn("font-black text-sm tracking-tight leading-tight", b.earned ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}>{b.name}</h4>
                  <p className="text-[11px] font-medium text-slate-400 mt-1 leading-snug">{b.earned && b.earnedAt ? `Earned ${formatDate(b.earnedAt, { month: "short", day: "numeric", year: "numeric" })}` : b.description}</p>
                </div>
              ))}
              {progress.badges.length === 0 && <p className="col-span-full text-sm text-slate-400 font-medium">No badges available yet.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-10 min-w-0">
          {/* Recent activity */}
          <section>
            <SectionTitle icon={<Zap size={20} />} title="Recent activity" />
            <div className="card divide-y divide-slate-100 dark:divide-slate-800">
              {progress.recentActivity.length === 0 && <p className="p-6 text-sm text-slate-400 font-medium text-center">No activity yet. Complete a lesson to get started.</p>}
              {progress.recentActivity.map((a) => {
                const hit = a.refId ? lessonIndex.get(a.refId) : undefined;
                const meta = activityMeta(a, hit?.lesson.title ?? null);
                const c = colorClasses(meta.color);
                const inner = (
                  <>
                    <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", c.bg, c.text)}>{meta.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">{meta.label}</span>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{timeAgo(a.createdAt)}</span>
                    </span>
                    {a.xp > 0 && <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 shrink-0">+{a.xp} XP</span>}
                  </>
                );
                return hit ? (
                  <Link key={a.id} to={`/lesson/${hit.module.id}/${hit.lesson.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {inner}
                  </Link>
                ) : (
                  <div key={a.id} className="flex items-center gap-3 p-4">
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Leaderboard */}
          <section>
            <SectionTitle icon={<Trophy size={20} />} title="Leaderboard" />
            <div className="card overflow-hidden">
              {leaders === null && !leadersError && (
                <div className="p-4 space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              )}
              {leadersError && <p className="p-6 text-sm text-red-600 dark:text-red-400 font-medium text-center">{leadersError}</p>}
              {leaders && leaders.length === 0 && <p className="p-6 text-sm text-slate-400 font-medium text-center">No learners on the board yet.</p>}
              {leaders && leaders.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left px-4 py-3 w-12">#</th>
                      <th className="text-left px-2 py-3">Learner</th>
                      <th className="text-right px-2 py-3">Lessons</th>
                      <th className="text-right px-4 py-3">XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaders.map((l) => {
                      const me = l.id === user.id;
                      return (
                        <tr key={l.id} className={cn("border-b border-slate-50 dark:border-slate-800/60 last:border-0", me && "bg-blue-50 dark:bg-blue-900/20")}>
                          <td className="px-4 py-3 font-black text-slate-500 dark:text-slate-400">
                            {l.rank === 1 ? <Crown size={16} className="text-amber-500" /> : l.rank === 2 ? <Medal size={16} className="text-slate-400" /> : l.rank === 3 ? <Medal size={16} className="text-amber-700" /> : l.rank}
                          </td>
                          <td className="px-2 py-3">
                            <span className="flex items-center gap-2.5 min-w-0">
                              <Avatar name={l.name} color={l.avatarColor} size="sm" />
                              <span className={cn("font-bold truncate", me ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200")}>
                                {l.name}
                                {me && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-blue-500">you</span>}
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-3 text-right font-bold text-slate-600 dark:text-slate-300">{l.lessons}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white">{l.xp.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-8 md:p-12 text-center text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 blur-[100px] rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-400/20 blur-[100px] rounded-full -ml-20 -mb-20" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-4">
            <Flame size={14} className="text-amber-300" /> {progress.streak > 0 ? `${progress.streak}-day streak` : "Start a streak today"}
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-3">Ready for the next challenge?</h2>
          <p className="text-blue-100 font-medium max-w-xl mx-auto mb-8">
            {nextUp && nextUp.next ? `Up next: ${nextUp.next.title} in ${nextUp.module.title}. Worth ${nextUp.next.xp} XP.` : "You have finished the curriculum. Keep practising in the playground to hold your place on the leaderboard."}
          </p>
          <Link to={continueHref} className="btn bg-white text-blue-700 px-8 py-4 hover:bg-amber-400 hover:text-slate-900">
            Continue learning <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
