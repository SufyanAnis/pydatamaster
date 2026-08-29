import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

export type ToastType = "success" | "error" | "info" | "xp";
export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastApi {
  push: (t: Omit<ToastItem, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  xp: (amount: number, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let counter = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = counter++;
      setItems((list) => [...list.slice(-4), { ...t, id }]);
      window.setTimeout(() => remove(id), t.type === "error" ? 6000 : 4000);
    },
    [remove],
  );
  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, message) => push({ type: "success", title, message }),
      error: (title, message) => push({ type: "error", title, message }),
      info: (title, message) => push({ type: "info", title, message }),
      xp: (amount, message) => push({ type: "xp", title: `+${amount} XP`, message }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-24 right-4 sm:right-6 z-[90] flex flex-col gap-3 w-[min(92vw,360px)] pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl animate-fade-in-up backdrop-blur",
              t.type === "success" && "bg-white/95 dark:bg-slate-900/95 border-emerald-200 dark:border-emerald-800",
              t.type === "error" && "bg-white/95 dark:bg-slate-900/95 border-red-200 dark:border-red-800",
              t.type === "info" && "bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700",
              t.type === "xp" && "bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500 text-white",
            )}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "success" && <CheckCircle2 size={18} className="text-emerald-600" />}
              {t.type === "error" && <AlertCircle size={18} className="text-red-500" />}
              {t.type === "info" && <Info size={18} className="text-blue-600" />}
              {t.type === "xp" && <Sparkles size={18} className="text-amber-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-black tracking-tight", t.type !== "xp" && "text-slate-900 dark:text-white")}>{t.title}</p>
              {t.message && <p className={cn("text-xs mt-0.5 font-medium", t.type === "xp" ? "text-blue-100" : "text-slate-500 dark:text-slate-400")}>{t.message}</p>}
            </div>
            <button onClick={() => remove(t.id)} className={cn("p-1 rounded-lg", t.type === "xp" ? "text-blue-100 hover:text-white" : "text-slate-400 hover:text-slate-700 dark:hover:text-white")} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
