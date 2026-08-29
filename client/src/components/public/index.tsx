import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { cn } from "../../lib/utils";
import { PageHero } from "../ui";

/** Small uppercase "back" link used at the top of detail pages. Hidden when printing. */
export function BackLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={cn("group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-print", className)}>
      <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
      {children}
    </Link>
  );
}

/** Dark gradient panel with blurred glow circles - the same treatment as the Home hero. */
export function GlowPanel({ children, className, tone = "slate", as: Tag = "section" }: { children: ReactNode; className?: string; tone?: "slate" | "blue" | "indigo"; as?: "section" | "div" }) {
  const tones = {
    slate: "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 shadow-2xl",
    blue: "bg-gradient-to-br from-blue-600 to-indigo-800 shadow-2xl shadow-blue-500/20",
    indigo: "bg-indigo-900 shadow-xl shadow-indigo-500/20",
  };
  return (
    <Tag className={cn("rounded-[2.5rem] text-white relative overflow-hidden", tones[tone], className)}>
      <div className="relative z-10">{children}</div>
      <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/20 rounded-full blur-[110px] -mr-28 -mt-28 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-[110px] -ml-28 -mb-28 pointer-events-none" aria-hidden="true" />
    </Tag>
  );
}

/** Numbered section inside a legal document. */
export function LegalSection({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section id={`section-${number}`} className="scroll-mt-28">
      <h2 className="flex items-baseline gap-3 text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
        <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{String(number).padStart(2, "0")}</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-4 text-[15px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:font-bold [&_a:hover]:underline">
        {children}
      </div>
    </section>
  );
}

/** Shared frame for the Privacy / Terms pages: hero, "last updated" line, table of contents, sections. */
export function LegalPage({ eyebrow, title, subtitle, updated, sections, children }: { eyebrow: string; title: string; subtitle?: string; updated: string; sections: string[]; children: ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
      <PageHero eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="card p-6 sm:p-10 md:p-12">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
            <CalendarDays size={14} /> Last updated: {updated}
          </span>
          <nav aria-label="Contents" className="flex flex-wrap gap-2 md:justify-end">
            {sections.map((s, i) => (
              <a key={s} href={`#section-${i + 1}`} className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {i + 1}. {s}
              </a>
            ))}
          </nav>
        </div>
        <div className="space-y-12">{children}</div>
      </div>
    </div>
  );
}
