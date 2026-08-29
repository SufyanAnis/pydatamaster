import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, ExternalLink, FileSpreadsheet, Github, Printer, Search, Users, Wrench, X } from "lucide-react";
import { usePageTitle } from "../context/SiteContext";
import { api, errorMessage } from "../lib/api";
import type { Resource } from "../lib/types";
import { Icon } from "../lib/icons";
import { cn } from "../lib/utils";
import { AdSlot } from "../components/AdSlot";
import { Alert, EmptyState, PageHero, Skeleton } from "../components/ui";
import { GlowPanel } from "../components/public";

function ExternalRow({ r }: { r: Resource }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-600 dark:hover:bg-blue-600 hover:border-blue-600 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/20 transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 group-hover:bg-white/15 group-hover:border-transparent group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
        <Icon name={r.icon} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-black text-sm text-slate-900 dark:text-white group-hover:text-white truncate transition-colors">{r.name}</span>
          <ExternalLink size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-white shrink-0 transition-colors" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-blue-100 font-medium mt-0.5 line-clamp-2 transition-colors">{r.description}</p>
      </div>
    </a>
  );
}

function LinkSection({ title, subtitle, icon, tone, items }: { title: string; subtitle: string; icon: ReactNode; tone: "blue" | "indigo"; items: Resource[] }) {
  const tones = { blue: "bg-blue-600 shadow-blue-500/30", indigo: "bg-indigo-600 shadow-indigo-500/30" };
  return (
    <section className="card p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className={cn("w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0", tones[tone])}>{icon}</div>
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 font-medium py-4 text-center">No matches in this section.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((r) => (
            <ExternalRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Resources() {
  usePageTitle("Resources");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const cheatRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ resources: Resource[] }>("/content/resources")
      .then((d) => {
        if (alive) setResources(d.resources);
      })
      .catch((err) => {
        if (alive) setError(errorMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return resources;
    return resources.filter((r) => r.name.toLowerCase().includes(s) || r.description.toLowerCase().includes(s));
  }, [resources, q]);

  const cheats = filtered.filter((r) => r.category === "cheatsheet");
  const docs = filtered.filter((r) => r.category === "docs");
  const tools = filtered.filter((r) => r.category === "tools");
  const searching = q.trim().length > 0;

  const scrollToCheats = () => cheatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="pb-10">
      <PageHero eyebrow="Knowledge Hub" title="Learning Resources" subtitle="Access the primary source materials and professional tools used by the world's leading data scientists.">
        <div className="relative max-w-md mx-auto mt-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Quick search: pandas, editor, docs..." className="input pl-11 pr-10 py-3.5 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" aria-label="Search resources" />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      </PageHero>

      {error && (
        <Alert type="error" className="mb-8">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="space-y-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-10">
          {searching && filtered.length === 0 && (
            <div className="card">
              <EmptyState title="No resources match" description={`Nothing found for "${q.trim()}". Try a library name or a broader keyword.`} icon={<Search size={26} />} />
            </div>
          )}

          {/* Cheat sheets */}
          <section ref={cheatRef} id="cheatsheets" className="scroll-mt-28">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <span className="eyebrow mb-2 block">Quick reference</span>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Cheat Sheets</h2>
              </div>
              <span className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Printer size={14} /> Printable as PDF
              </span>
            </div>
            {cheats.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-400 font-medium">{searching ? "No cheat sheets match your search." : "Cheat sheets are being prepared."}</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cheats.map((r, i) => (
                  <Link key={r.id} to={`/resources/cheatsheet/${r.id}`} className="card p-6 hover:shadow-xl transition-all group flex flex-col animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Icon name={r.icon} size={22} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mt-1">
                        <Printer size={12} /> Print / PDF
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">{r.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-3 flex-1 mb-5">{r.description}</p>
                    <span className="btn-secondary w-full py-3 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 dark:group-hover:bg-blue-600">
                      Open <ArrowRight size={14} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <LinkSection title="Official Documents" subtitle="Primary references maintained by the library authors." icon={<BookOpen size={22} />} tone="blue" items={docs} />
          <LinkSection title="Tools & Editors" subtitle="Environments and utilities used by working data scientists." icon={<Wrench size={22} />} tone="indigo" items={tools} />

          <div className="grid md:grid-cols-2 gap-6">
            <GlowPanel as="div" tone="slate" className="p-8 md:p-10 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6">
                <Users size={22} className="text-blue-300" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter mb-3">Open Source Community</h3>
              <p className="text-slate-300 font-medium leading-relaxed mb-8 flex-1">Connect with millions of developers on GitHub and StackOverflow. Contribution is the best way to learn.</p>
              <div className="flex flex-wrap gap-3">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="btn bg-white text-slate-900 px-6 py-3 hover:bg-amber-400">
                  <Github size={16} /> GitHub
                </a>
                <a href="https://stackoverflow.com" target="_blank" rel="noreferrer" className="btn bg-white/10 text-white border border-white/20 px-6 py-3 hover:bg-white/20">
                  StackOverflow <ExternalLink size={14} />
                </a>
              </div>
            </GlowPanel>
            <GlowPanel as="div" tone="indigo" className="p-8 md:p-10 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6">
                <FileSpreadsheet size={22} className="text-amber-400" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter mb-3">Cheat Sheets</h3>
              <p className="text-indigo-200 font-medium leading-relaxed mb-8 flex-1">Fast-track your learning with our synthesized reference guides for Pandas and NumPy operations.</p>
              <button onClick={scrollToCheats} className="btn bg-white text-indigo-900 px-6 py-3 hover:bg-amber-400 w-fit">
                Browse cheat sheets <ArrowRight size={16} />
              </button>
            </GlowPanel>
          </div>

          <AdSlot slot="content" className="h-48" />
        </div>
      )}
    </div>
  );
}
