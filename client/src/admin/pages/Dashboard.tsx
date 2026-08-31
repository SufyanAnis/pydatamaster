import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ExternalLink, Eye, FilePlus2, Image, Mail, Newspaper, RefreshCw, Settings, Tags, Users } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { AdminStats, Category, Post, UploadedFile } from "../../lib/types";
import { cn, timeAgo } from "../../lib/utils";
import { usePageTitle } from "../../context/SiteContext";
import { Alert, Button, EmptyState, Skeleton, StatTile } from "../../components/ui";
import { CorePageHeader, CoreSection } from "../components/CorePageHeader";
import { MessageStatusPill } from "../components/CoreStatus";

/* Amber-forward palette on the light admin theme. */
const AMBER = "#f59e0b";
const AMBER_LIGHT = "#fbbf24";
const PALETTE = [AMBER, AMBER_LIGHT, "#d97706", "#fcd34d", "#b45309", "#64748b"];

const CHART = {
  grid: "#e2e8f0",
  axis: "#64748b",
  cursor: "#f1f5f9",
  tooltip: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: "#0f172a",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
  },
  label: { color: "#64748b", fontWeight: 800, textTransform: "uppercase" as const, fontSize: 10, letterSpacing: "0.1em" },
};

function fmtDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <CoreSection title={title} subtitle={subtitle} className={className} bodyClassName="p-3 sm:p-4">
      <div className="h-64 sm:h-72 w-full min-w-0">{children}</div>
    </CoreSection>
  );
}

function ListRow({ children, to, className }: { children: ReactNode; to?: string; className?: string }) {
  const cls = cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors", to && "hover:bg-amber-50/60", className);
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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
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
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mediaCount, setMediaCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const [s, p, c, u] = await Promise.allSettled([
      api.get<AdminStats>("/admin/stats"),
      api.get<{ posts: Post[] }>("/admin/posts"),
      api.get<{ categories: Category[] }>("/admin/categories"),
      api.get<{ files: UploadedFile[] }>("/admin/uploads"),
    ]);
    if (s.status === "fulfilled") setStats(s.value);
    else setError(errorMessage(s.reason, "Could not load statistics"));
    if (p.status === "fulfilled") setPosts(p.value.posts);
    if (c.status === "fulfilled") setCategories(c.value.categories);
    if (u.status === "fulfilled") setMediaCount(u.value.files.length);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryNames = useMemo(() => new Map(categories.map((c) => [c.slug, c.name])), [categories]);
  const activeCategories = useMemo(() => categories.filter((c) => c.showInNav).length, [categories]);
  const categoryChart = useMemo(() => categories.map((c) => ({ name: c.name, posts: c.postCount ?? 0 })), [categories]);
  const topPosts = useMemo(() => [...posts].sort((a, b) => b.views - a.views).slice(0, 6), [posts]);

  const header = (
    <CorePageHeader
      eyebrow="Overview"
      title="Dashboard"
      subtitle="A live snapshot of articles, traffic and inbound messages over the last 30 days."
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
  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = posts.length - publishedCount;

  const tiles = [
    { label: "Articles", value: totals.posts, icon: <Newspaper size={20} />, color: "amber", sub: `${publishedCount} published, ${draftCount} drafts` },
    { label: "Page views 30d", value: totals.pageViews30d, icon: <Eye size={20} />, color: "slate", sub: "Public site traffic" },
    { label: "New messages", value: totals.newMessages, icon: <Mail size={20} />, color: "amber", sub: `${totals.messages} total` },
    { label: "Users", value: totals.users, icon: <Users size={20} />, color: "slate", sub: `${totals.admins} admins` },
    { label: "Active categories", value: activeCategories, icon: <Tags size={20} />, color: "amber", sub: `${categories.length} total tabs` },
    { label: "Media files", value: mediaCount, icon: <Image size={20} />, color: "slate", sub: "Uploaded images" },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {header}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} label={tile.label} value={tile.value.toLocaleString()} icon={tile.icon} color={tile.color} sub={tile.sub} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 shrink-0">Quick actions</span>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/posts" className="btn-primary px-4 py-2.5 text-[10px]">
            <FilePlus2 size={14} /> New article
          </Link>
          <Link to="/admin/categories" className="btn-dark px-4 py-2.5 text-[10px]">
            <Tags size={14} /> Manage tabs
          </Link>
          <Link to="/admin/media" className="btn-secondary px-4 py-2.5 text-[10px]">
            <Image size={14} /> Media
          </Link>
          <Link to="/admin/settings" className="btn-secondary px-4 py-2.5 text-[10px]">
            <Settings size={14} /> Settings
          </Link>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Page views" subtitle="Views per day, last 30 days">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.pageViews} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" tickFormatter={fmtDay} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.label} cursor={{ fill: CHART.cursor }} labelFormatter={(v) => fmtDay(String(v))} />
              <Bar dataKey="count" name="Views" fill={AMBER} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Articles per category" subtitle="How the header tabs are filled">
          {categoryChart.length === 0 ? (
            <EmptyState title="No categories yet" description="Create a category to organise your articles into header tabs." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.label} cursor={{ fill: CHART.cursor }} />
                <Bar dataKey="posts" name="Articles" fill={AMBER} radius={[0, 8, 8, 0]} barSize={18}>
                  {categoryChart.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CoreSection
          title="Most viewed articles"
          subtitle="All-time views"
          bodyClassName="p-2 sm:p-3"
          actions={
            <Link to="/admin/posts" className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:underline inline-flex items-center gap-1">
              All articles <ArrowRight size={12} />
            </Link>
          }
        >
          {topPosts.length === 0 ? (
            <EmptyState title="No articles yet" description="Write your first article to see view counts here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {topPosts.map((p, i) => (
                <li key={p.id}>
                  <ListRow className="hover:bg-amber-50/60">
                    <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link to="/admin/posts" className="block text-sm font-black text-slate-900 truncate hover:text-amber-700">
                        {p.title}
                      </Link>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{categoryNames.get(p.category) ?? p.category}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-amber-600 tabular-nums">{p.views.toLocaleString()}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">views</div>
                    </div>
                    <a
                      href={`/blog/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors shrink-0"
                      title="View article"
                      aria-label="View article"
                    >
                      <ExternalLink size={14} />
                    </a>
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
            <ul className="divide-y divide-slate-100">
              {stats.topPages.map((p) => {
                const max = stats.topPages[0]?.views || 1;
                return (
                  <li key={p.path}>
                    <ListRow>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-mono font-bold text-slate-800 truncate">{p.path}</span>
                          <span className="text-sm font-black text-slate-900 tabular-nums shrink-0">{p.views}</span>
                        </div>
                        <div className="h-1.5 mt-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${Math.max(4, Math.round((p.views / max) * 100))}%` }} />
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
          title="Recent messages"
          subtitle="Latest contact form submissions"
          className="lg:col-span-2"
          bodyClassName="p-2 sm:p-3"
          actions={
            <Link to="/admin/inbox" className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:underline inline-flex items-center gap-1">
              Inbox <ArrowRight size={12} />
            </Link>
          }
        >
          {stats.recentMessages.length === 0 ? (
            <EmptyState title="No messages yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recentMessages.map((m) => (
                <li key={m.id}>
                  <ListRow to="/admin/inbox">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 truncate">
                          {m.first_name} {m.last_name}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap ml-auto">{timeAgo(m.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{m.message}</p>
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
