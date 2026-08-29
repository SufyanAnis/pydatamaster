import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ApiError } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Alert, Button } from "../../components/ui";

/* ------------------------------------------------------------ Page header */
export function EditorPageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
      <div>
        <span className="eyebrow mb-2 block">{eyebrow}</span>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{title}</h1>
        {subtitle && <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Tabs */
export interface EditorTab {
  id: string;
  label: string;
  badge?: ReactNode;
  dirty?: boolean;
}

export function EditorTabs({ tabs, active, onChange, className }: { tabs: EditorTab[]; active: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto custom-scrollbar pb-1", className)} role="tablist">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              isActive ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
            )}
          >
            {t.label}
            {t.badge !== undefined && t.badge !== null && (
              <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] tabular-nums", isActive ? "bg-white/20 dark:bg-slate-900/10" : "bg-slate-100 dark:bg-slate-800")}>{t.badge}</span>
            )}
            {t.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- Small controls */
export function EditorIconButton({ title, onClick, children, danger, disabled, className }: { title: string; onClick: () => void; children: ReactNode; danger?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-2 rounded-xl transition-colors disabled:opacity-30 disabled:pointer-events-none",
        danger ? "text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EditorOrderButtons({ onUp, onDown, disableUp, disableDown }: { onUp: () => void; onDown: () => void; disableUp?: boolean; disableDown?: boolean }) {
  const cls = "p-0.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none transition-colors";
  return (
    <div className="flex flex-col shrink-0">
      <button type="button" className={cls} onClick={onUp} disabled={disableUp} title="Move up" aria-label="Move up">
        <ChevronUp size={14} />
      </button>
      <button type="button" className={cls} onClick={onDown} disabled={disableDown} title="Move down" aria-label="Move down">
        <ChevronDown size={14} />
      </button>
    </div>
  );
}

/** Compact switch without a label row - for table rows and list items. */
export function EditorSwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700")}
    >
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

/* ------------------------------------------------------- Errors + footer */
export interface EditorError {
  message: string;
  details: string[];
}

/** Turns an ApiError (including zod `flatten()` details) into something readable. */
export function describeError(err: unknown, fallback = "Something went wrong"): EditorError {
  const details: string[] = [];
  if (err instanceof ApiError) {
    const d = err.details as { fieldErrors?: Record<string, string[] | undefined>; formErrors?: string[] } | undefined;
    if (d && typeof d === "object") {
      for (const [field, msgs] of Object.entries(d.fieldErrors ?? {})) {
        if (msgs && msgs.length) details.push(`${field}: ${msgs.join(", ")}`);
      }
      for (const m of d.formErrors ?? []) details.push(m);
    }
    return { message: err.message || fallback, details };
  }
  if (err instanceof Error) return { message: err.message || fallback, details };
  return { message: fallback, details };
}

export function EditorErrorAlert({ error, className }: { error: EditorError | null; className?: string }) {
  if (!error) return null;
  return (
    <Alert type="error" className={className}>
      <p>{error.message}</p>
      {error.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs list-disc pl-4">
          {error.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}

export function EditorFooter({ onCancel, onSave, saving, saveLabel = "Save changes", error, children }: { onCancel: () => void; onSave: () => void; saving?: boolean; saveLabel?: string; error?: EditorError | null; children?: ReactNode }) {
  return (
    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
      <EditorErrorAlert error={error ?? null} />
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs text-slate-400 font-medium">{children}</div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} loading={saving}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Table */
export function EditorTable({ head, children, className }: { head: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto custom-scrollbar", className)}>
      <table className="w-full text-left text-sm min-w-[720px]">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">{head}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  );
}

export function EditorTh({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap", className)}>{children}</th>;
}

export function EditorTd({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-slate-700 dark:text-slate-300 font-medium", className)}>{children}</td>;
}
