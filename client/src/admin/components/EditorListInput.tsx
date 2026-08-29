import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

export function linesToList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function listToLines(list: string[]): string {
  return list.join("\n");
}

/**
 * "One item per line" textarea for string[] fields.
 * Keeps the raw text locally so a trailing newline is not swallowed while typing;
 * re-syncs from `value` only when the parent changes the list to something else.
 */
export function EditorListInput({
  value,
  onChange,
  label,
  hint = "One item per line.",
  rows = 5,
  placeholder,
  className,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
  hint?: string;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(() => listToLines(value));
  const incoming = value.join("\n");

  useEffect(() => {
    if (linesToList(text).join("\n") !== incoming) setText(listToLines(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const count = linesToList(text).length;

  return (
    <label className={cn("block space-y-2", className)}>
      <span className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 tabular-nums">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </span>
      <textarea
        className="input resize-y font-mono text-[13px] leading-relaxed"
        rows={rows}
        value={text}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          onChange(linesToList(e.target.value));
        }}
      />
      {hint && <span className="block text-xs text-slate-400 font-medium px-1">{hint}</span>}
    </label>
  );
}
