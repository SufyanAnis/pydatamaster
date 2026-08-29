import { useEffect, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { Loader2, X, Inbox } from "lucide-react";
import { cn } from "../../lib/utils";

/* ----------------------------------------------------------------- Buttons */
type Variant = "primary" | "secondary" | "dark" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  dark: "btn-dark",
  ghost: "btn-ghost",
  danger: "btn bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20",
};
const SIZES = { sm: "px-4 py-2 text-[10px]", md: "px-6 py-3", lg: "px-8 py-4 text-sm" };

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES; loading?: boolean }) {
  return (
    <button className={cn(VARIANTS[variant], SIZES[size], className)} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
}: {
  to: string;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  const cls = cn(VARIANTS[variant], SIZES[size], className);
  if (external)
    return (
      <a href={to} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

/* ----------------------------------------------------------------- Layout */
export function Card({ className, children, hover }: { className?: string; children: ReactNode; hover?: boolean }) {
  return <div className={cn("card", hover && "hover:shadow-xl transition-all", className)}>{children}</div>;
}

export function SectionHeader({ eyebrow, title, subtitle, align = "center", className }: { eyebrow?: string; title: string; subtitle?: string; align?: "center" | "left"; className?: string }) {
  return (
    <div className={cn(align === "center" ? "text-center mx-auto max-w-3xl" : "text-left", "mb-10", className)}>
      {eyebrow && <span className="eyebrow mb-2 block">{eyebrow}</span>}
      <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{title}</h2>
      {subtitle && <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, subtitle, children, className }: { eyebrow?: string; title: ReactNode; subtitle?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("text-center max-w-3xl mx-auto mb-12 animate-fade-in", className)}>
      {eyebrow && <span className="eyebrow mb-4 block">{eyebrow}</span>}
      <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-5 tracking-tighter leading-[1.05]">{title}</h1>
      {subtitle && <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{subtitle}</p>}
      {children}
    </div>
  );
}

export function Pill({ children, className, color = "blue" }: { children: ReactNode; className?: string; color?: "blue" | "slate" | "emerald" | "amber" | "red" | "indigo" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-900/40",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-100 dark:border-amber-900/40",
    red: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-100 dark:border-red-900/40",
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/40",
  };
  return <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", colors[color], className)}>{children}</span>;
}

/* ----------------------------------------------------------------- Forms */
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 font-medium px-1">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input appearance-none", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input resize-y min-h-[120px]", className)} {...rest} />;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between gap-4 w-full text-left py-2" role="switch" aria-checked={checked}>
      <span>
        <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>
        {description && <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">{description}</span>}
      </span>
      <span className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </span>
    </button>
  );
}

/* ----------------------------------------------------------------- Feedback */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 text-slate-400 py-16", className)}>
      <Loader2 className="animate-spin" size={22} />
      {label && <span className="text-xs font-black uppercase tracking-widest">{label}</span>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-5">{icon ?? <Inbox size={26} />}</div>
      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto font-medium">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Alert({ type = "info", children, className }: { type?: "info" | "error" | "success" | "warning"; children: ReactNode; className?: string }) {
  const styles = {
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40 text-blue-800 dark:text-blue-200",
    error: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40 text-red-800 dark:text-red-200",
    success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200",
    warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-200",
  };
  return <div className={cn("rounded-2xl border px-4 py-3 text-sm font-medium", styles[type], className)}>{children}</div>;
}

/* ----------------------------------------------------------------- Modal */
export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn("bg-white dark:bg-slate-900 w-full rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl relative animate-fade-in-up my-4 max-h-[92vh] flex flex-col", sizes[size])}>
        <div className="flex items-center justify-between px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 sm:px-8 py-6 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onCancel, onConfirm, title, message, confirmLabel = "Delete", danger = true, loading }: { open: boolean; onCancel: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{message}</p>
      <div className="flex justify-end gap-3 mt-8">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- Misc */
export function Avatar({ name, color = "blue", size = "md", className }: { name: string; color?: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const gradients: Record<string, string> = {
    blue: "from-blue-600 to-indigo-700",
    indigo: "from-indigo-600 to-violet-700",
    emerald: "from-emerald-500 to-teal-700",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-pink-700",
    violet: "from-violet-600 to-purple-700",
    cyan: "from-cyan-500 to-blue-600",
    orange: "from-orange-500 to-red-600",
  };
  const sizes = { sm: "w-8 h-8 text-xs rounded-lg", md: "w-10 h-10 text-sm rounded-xl", lg: "w-16 h-16 text-2xl rounded-2xl", xl: "w-32 h-32 text-5xl rounded-[2rem]" };
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return <div className={cn("bg-gradient-to-br text-white font-black flex items-center justify-center shadow-lg shrink-0", gradients[color] ?? gradients.blue, sizes[size], className)}>{letter}</div>;
}

export function ProgressBar({ value, className, color = "blue" }: { value: number; className?: string; color?: "blue" | "emerald" | "amber" }) {
  const bars = { blue: "from-blue-500 via-blue-600 to-indigo-700", emerald: "from-emerald-400 to-emerald-600", amber: "from-amber-400 to-orange-500" };
  return (
    <div className={cn("relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner", className)}>
      <div className={cn("h-full bg-gradient-to-r rounded-full transition-all duration-1000 ease-out", bars[color])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function StatTile({ label, value, icon, color = "blue", sub }: { label: string; value: ReactNode; icon: ReactNode; color?: string; sub?: string }) {
  const map: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-500",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-600",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  };
  return (
    <div className="card p-6 hover:-translate-y-0.5 transition-all">
      <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center mb-4", map[color] ?? map.blue)}>{icon}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{sub}</div>}
    </div>
  );
}
