import { useState, type ReactNode } from "react";
import { Columns2, Eye, PenLine } from "lucide-react";
import { Markdown } from "../../lib/markdown";
import { cn } from "../../lib/utils";

type Mode = "write" | "preview" | "split";

export function EditorMarkdown({
  value,
  onChange,
  label = "Content (Markdown)",
  placeholder = "Write Markdown here...",
  rows = 18,
  hint,
  className,
  allowSplit = true,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
  className?: string;
  allowSplit?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("write");
  const modes: { id: Mode; label: string; icon: ReactNode; className?: string }[] = [
    { id: "write", label: "Write", icon: <PenLine size={12} /> },
    { id: "preview", label: "Preview", icon: <Eye size={12} /> },
  ];
  if (allowSplit) modes.push({ id: "split", label: "Split", icon: <Columns2 size={12} />, className: "hidden lg:inline-flex" });

  const editor = (
    <textarea
      className="input font-mono text-[13px] leading-relaxed resize-y min-h-[240px] custom-scrollbar"
      rows={rows}
      value={value}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  const preview = (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-5 min-h-[240px] max-h-[65vh] overflow-y-auto custom-scrollbar">
      {value.trim() ? <Markdown content={value} /> : <p className="text-sm text-slate-400 font-medium">Nothing to preview yet.</p>}
    </div>
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="label">{label}</span>
        <div className="inline-flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                m.className ?? "inline-flex",
                mode === m.id ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
              )}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>
      {mode === "split" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {editor}
          {preview}
        </div>
      ) : mode === "preview" ? (
        preview
      ) : (
        editor
      )}
      {hint && <span className="block text-xs text-slate-400 font-medium px-1">{hint}</span>}
    </div>
  );
}
