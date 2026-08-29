import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Page title block used at the top of every admin page. */
export function CorePageHeader({ eyebrow, title, subtitle, actions, className }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8 animate-fade-in", className)}>
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow mb-2 block">{eyebrow}</span>}
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** Card with a compact header row; used for dashboard lists and detail sections. */
export function CoreSection({ title, subtitle, actions, children, className, bodyClassName }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className={cn("p-5 sm:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}
