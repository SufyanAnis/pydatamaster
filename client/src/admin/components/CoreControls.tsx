import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

/* ------------------------------------------------------------- Search box */
export function CoreSearch({ value, onChange, placeholder = "Search...", className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={cn("relative", className)}>
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className="input pl-10 pr-9 py-2.5 text-sm" aria-label={placeholder} />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Segmented filter */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function CoreSegmented<T extends string>({ options, value, onChange, className }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700", className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              active ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
            )}
          >
            {o.label}
            {typeof o.count === "number" && <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] tabular-nums", active ? "bg-blue-50 dark:bg-blue-900/30" : "bg-slate-200/70 dark:bg-slate-700")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- Icon button */
type Tone = "default" | "danger" | "success" | "primary";
const TONES: Record<Tone, string> = {
  default: "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20",
  primary: "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20",
  danger: "text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
  success: "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
};

export function CoreIconButton({ title, tone = "default", to, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { title: string; tone?: Tone; to?: string }) {
  const cls = cn("inline-flex items-center justify-center p-2 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none", TONES[tone], className);
  if (to)
    return (
      <Link to={to} title={title} aria-label={title} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" title={title} aria-label={title} className={cls} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- Pagination */
export function CorePagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
        Showing <strong className="text-slate-900 dark:text-white">{from}</strong>-<strong className="text-slate-900 dark:text-white">{to}</strong> of <strong className="text-slate-900 dark:text-white">{total}</strong>
      </span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} className="btn-secondary px-3 py-2 text-[10px]" aria-label="Previous page">
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="px-3 text-xs font-black text-slate-500 tabular-nums">
          {page} / {pages}
        </span>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} className="btn-secondary px-3 py-2 text-[10px]" aria-label="Next page">
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Key/value row */
export function CoreKeyValue({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 break-words">{children}</span>
    </div>
  );
}
