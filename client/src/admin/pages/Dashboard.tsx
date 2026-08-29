import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowRight, Bell, BookOpen, Bot, Brain, CheckCircle2, Clock, Eye, FilePlus2, Mail, Newspaper, RefreshCw, Settings, Users } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { AdminStats, DayPoint } from "../../lib/types";
import { cn, timeAgo } from "../../lib/utils";
import { useSite, usePageTitle } from "../../context/SiteContext";
import { Alert, Avatar, Button, EmptyState, Skeleton, StatTile } from "../../components/ui";
import { CorePageHeader, CoreSection } from "../components/CorePageHeader";
import { MessageStatusPill, RolePill } from "../components/CoreStatus";

const PALETTE = ["#2563eb", "#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#8b5cf6", "#f97316"];

function useChartTheme() {
  const { theme } = useSite();
  const dark = theme === "dark";
  return useMemo(
    () => ({
      dark,
      grid: dark ? "#1e293b" : "#e2e8f0",
      axis: dark ? "#94a3b8" : "#64748b",
      cursor: dark ? "#1e293b" : "#f1f5f9",
      tooltip: {
        background: dark ? "#0f172a" : "#ffffff",
        border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        color: dark ? "#e2e8f0" : "#0f172a",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
      },
      label: { color: dark ? "#94a3b8" : "#64748b", fontWeight: 800, textTransform: "uppercase" as const, fontSize: 10, letterSpacing: "0.1em" },
      legend: { fontSize: 11, fontWeight: 700 },
    }),
    [dark],
  );
}

function fmtDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function sumLast(series: DayPoint[], n: number): number {
  return series.slice(-n).reduce((acc, p) => acc + p.count, 0);
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <CoreSection title={title} subtitle={subtitle} className={className} bodyClassName="p-3 sm:p-4">
      <div className="h-64 sm:h-72 w-full min-w-0">{children}</div>
    </CoreSection>
  );
}

function ListRow({ children, to, className }: { children: ReactNode; to?: string; className?: string }) {
  const cls = cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors", to && "hover:bg-slate-50 dark:hover:bg-slate-800/60", className);
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  return <div className={cls}>{children}</div>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  usePageTitle("Admin dashboard");
  const t = useChartTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setStats(await api.get<AdminStats>("/admin/stats"));
    } catch (err) {
      setError(errorMessage(err, "Could not load statistics"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const trend = useMemo(() => {
    if (!stats) return [];
    const byDay = new Map<string, { day: string; signups: number; completions: number }>();
    for (const p of stats.signups) byDay.set(p.day, { day: p.day, signups: p.count, completions: 0 });
    for (const p of stats.completions) {
      const row = byDay.get(p.day) ?? { day: p.day, signups: 0, completions: 0 };
      row.completions = p.count;
      byDay.set(p.day, row);
    }
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [stats]);

  const goals = useMemo(() => (stats ? stats.goals.filter((g) => g.count > 0).map((g) => ({ ...g, goal: g.goal || "Unspecified" })) : []), [stats]);

  const header = (
    <CorePageHeader
      eyebrow="Overview"
      title="Dashboard"
      subtitle="A live snapshot of learners, content engagement and inbound activity over the last 30 days."
      actions={
        <Button variant="secondary" size="sm" onClick={() => load(true)} loading={refreshing} disabled={loading}>
          <RefreshCw size={14} className={cn(refreshing && "animate-spin")} /> Refresh
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <div>
        {header}
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div>
        {header}
        <Alert type="error" className="flex items-center justify-between gap-4 flex-wrap">
          <span>{error ?? "Could not load statistics"}</span>
          <Button size="sm" variant="secondary" onClick={() => load()}>
            Try again
          </Button>
        </Alert>
      </div>
    );
  }

  const { totals } = stats;
  const newThisWeek = sumLast(stats.signups, 7);
  const completionsWeek = sumLast(stats.completions, 7);
  const tutorWeek = sumLast(stats.tutorUsage, 7);
  const viewsWeek = sumLast(stats.pageViews, 7);

  const tiles = [
    { label: "Users", value: totals.users, icon: <Users size={20} />, color: "blue", sub: `+${newThisWeek} this week` },
    { label: "Active users 7d", value: totals.activeUsers7d, icon: <Activity size={20} />, color: "emerald", sub: `${totals.learners} learners, ${totals.admins} admins` },
    { label: "Lesson completions", value: totals.completions, icon: <CheckCircle2 size={20} />, color: "indigo", sub: `+${completionsWeek} this week` },
    { label: "Quiz attempts", value: totals.quizAttempts, icon: <Brain size={20} />, color: "purple", sub: `${totals.lessons} lessons in ${totals.modules} modules` },
    { label: "New messages", value: totals.newMessages, icon: <Mail size={20} />, color: "amber", sub: `${totals.messages} total` },
    { label: "Waitlist", value: totals.waitlist, icon: <Clock size={20} />, color: "orange", sub: "Pro plan sign-ups" },
    { label: "Subscribers", value: totals.subscribers, icon: <Bell size={20} />, color: "rose", sub: "Active newsletter" },
    { label: "Tutor chats", value: totals.tutorChats, icon: <Bot size={20} />, color: "blue", sub: `+${tutorWeek} this week` },
    { label: "Page views 30d", value: totals.pageViews30d, icon: <Eye size={20} />, color: "slate", sub: `${viewsWeek} in the last 7 days` },
    { label: "Blog posts", value: totals.posts, icon: <Newspaper size={20} />, color: "indigo", sub: "Published and drafts" },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {header}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} label={tile.label} value={tile.value.toLocaleString()} icon={tile.icon} color={tile.color} sub={tile.sub} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 shrink-0">Quick actions</span>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/curriculum" className="btn-primary px-4 py-2.5 text-[10px]">
            <BookOpen size={14} /> New lesson
          </Link>
          <Link to="/admin/blog" className="btn-dark px-4 py-2.5 text-[10px]">
            <FilePlus2 size={14} /> New post
          </Link>
          <Link to="/admin/inbox" className="btn-secondary px-4 py-2.5 text-[10px]">
            <Mail size={14} /> Inbox
            {totals.newMessages > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px]">{totals.newMessages}</span>}
          </Link>
          <Link to="/admin/settings" className="btn-secondary px-4 py-2.5 text-[10px]">
            <Settings size={14} /> Settings
          </Link>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Signups and completions" subtitle="Daily counts over the last 30 days">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="dashSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashCompletions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
              <XAxis dataKey="day" tickFormatter={fmtDay} stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={t.tooltip} labelStyle={t.label} labelFormatter={(v) => fmtDay(String(v))} />
              <Legend iconType="circle" wrapperStyle={t.legend} />
              <Area type="monotone" dataKey="signups" name="Signups" stroke="#2563eb" strokeWidth={2.5} fill="url(#dashSignups)" />
              <Area type="monotone" dataKey="completions" name="Completions" stroke="#10b981" strokeWidth={2.5} fill="url(#dashCompletions)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Page views" subtitle="Views per day, last 30 days">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.pageViews} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
              <XAxis dataKey="day" tickFormatter={fmtDay} stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={t.tooltip} labelStyle={t.label} cursor={{ fill: t.cursor }} labelFormatter={(v) => fmtDay(String(v))} />
              <Bar dataKey="count" name="Views" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Completions by module" subtitle="Total lesson completions per module">
          {stats.moduleProgress.length === 0 ? (
            <EmptyState title="No modules yet" description="Create a module in the curriculum editor to see progress here." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.moduleProgress} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} horizontal={false} />
                <XAxis type="number" stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="title" width={130} stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={t.tooltip} labelStyle={t.label} cursor={{ fill: t.cursor }} formatter={(value, name, item) => [`${value} (${item.payload?.lessons ?? 0} lessons)`, name]} />
                <Bar dataKey="completions" name="Completions" fill="#2563eb" radius={[0, 8, 8, 0]} barSize={18}>
                  {stats.moduleProgress.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Learner goals" subtitle="What learners said they are aiming for">
          {goals.length === 0 ? (
            <EmptyState title="No learners yet" description="Goal distribution appears once learners sign up." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={goals} dataKey="count" nameKey="goal" innerRadius="52%" outerRadius="82%" paddingAngle={3} stroke="none">
                  {goals.map((g, i) => (
                    <Cell key={g.goal} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={t.tooltip} labelStyle={t.label} />
                <Legend iconType="circle" wrapperStyle={t.legend} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CoreSection
          title="Top lessons"
          subtitle="Most completed lessons"
          bodyClassName="p-2 sm:p-3"
          actions={
            <Link to="/admin/curriculum" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline inline-flex items-center gap-1">
              Curriculum <ArrowRight size={12} />
            </Link>
          }
        >
          {stats.topLessons.length === 0 ? (
            <EmptyState title="No lessons yet" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.topLessons.map((l, i) => (
                <li key={l.id}>
                  <ListRow>
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 dark:text-white truncate">{l.title}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{l.module_title}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-blue-600 tabular-nums">{l.completions}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">done</div>
                    </div>
                  </ListRow>
                </li>
              ))}
            </ul>
          )}
        </CoreSection>

        <CoreSection title="Top pages" subtitle="Most visited paths, last 30 days" bodyClassName="p-2 sm:p-3">
          {stats.topPages.length === 0 ? (
            <EmptyState title="No page views yet" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.topPages.map((p) => {
                const max = stats.topPages[0]?.views || 1;
                return (
                  <li key={p.path}>
                    <ListRow>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">{p.path}</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums shrink-0">{p.views}</span>
                        </div>
                        <div className="h-1.5 mt-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${Math.max(4, Math.round((p.views / max) * 100))}%` }} />
                        </div>
                      </div>
                    </ListRow>
                  </li>
                );
              })}
            </ul>
          )}
        </CoreSection>

        <CoreSection
          title="Recent users"
          subtitle="Latest sign-ups"
          bodyClassName="p-2 sm:p-3"
          actions={
            <Link to="/admin/users" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline inline-flex items-center gap-1">
              All users <ArrowRight size={12} />
            </Link>
          }
        >
          {stats.recentUsers.length === 0 ? (
            <EmptyState title="No users yet" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recentUsers.map((u) => (
                <li key={u.id}>
                  <ListRow to={`/admin/users/${u.id}`}>
                    <Avatar name={u.name} color={u.avatarColor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 dark:text-white truncate">{u.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                    </div>
                    <div className="hidden sm:block">
                      <RolePill role={u.role} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{timeAgo(u.createdAt)}</span>
                  </ListRow>
                </li>
              ))}
            </ul>
          )}
        </CoreSection>

        <CoreSection
          title="Recent messages"
          subtitle="Latest contact form submissions"
          bodyClassName="p-2 sm:p-3"
          actions={
            <Link to="/admin/inbox" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline inline-flex items-center gap-1">
              Inbox <ArrowRight size={12} />
            </Link>
          }
        >
          {stats.recentMessages.length === 0 ? (
            <EmptyState title="No messages yet" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recentMessages.map((m) => (
                <li key={m.id}>
                  <ListRow to="/admin/inbox">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {m.first_name} {m.last_name}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap ml-auto">{timeAgo(m.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{m.message}</p>
                    </div>
                    <MessageStatusPill status={m.status} />
                  </ListRow>
                </li>
              ))}
            </ul>
          )}
        </CoreSection>
      </div>
    </div>
  );
}
