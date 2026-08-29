export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, opts);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

/**
 * Tailwind needs complete class names at build time, so every color option is spelled out here.
 * Use `colorClasses(color).text` etc. instead of building class strings dynamically.
 */
export interface ColorSet {
  text: string;
  bg: string;
  border: string;
  solid: string;
  gradient: string;
  soft: string;
  ring: string;
  hex: string;
}

const COLORS: Record<string, ColorSet> = {
  blue: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800", solid: "bg-blue-600", gradient: "from-blue-600 to-indigo-700", soft: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", ring: "ring-blue-500", hex: "#2563eb" },
  indigo: { text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800", solid: "bg-indigo-600", gradient: "from-indigo-600 to-violet-700", soft: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", ring: "ring-indigo-500", hex: "#4f46e5" },
  orange: { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", solid: "bg-orange-500", gradient: "from-orange-500 to-red-600", soft: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", ring: "ring-orange-500", hex: "#f97316" },
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", solid: "bg-emerald-600", gradient: "from-emerald-500 to-teal-700", soft: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", ring: "ring-emerald-500", hex: "#10b981" },
  amber: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", solid: "bg-amber-500", gradient: "from-amber-500 to-orange-600", soft: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", ring: "ring-amber-500", hex: "#f59e0b" },
  red: { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", solid: "bg-red-600", gradient: "from-red-500 to-rose-700", soft: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", ring: "ring-red-500", hex: "#ef4444" },
  rose: { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-800", solid: "bg-rose-600", gradient: "from-rose-500 to-pink-700", soft: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", ring: "ring-rose-500", hex: "#f43f5e" },
  yellow: { text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800", solid: "bg-yellow-500", gradient: "from-yellow-400 to-amber-600", soft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300", ring: "ring-yellow-500", hex: "#eab308" },
  cyan: { text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/20", border: "border-cyan-200 dark:border-cyan-800", solid: "bg-cyan-600", gradient: "from-cyan-500 to-blue-600", soft: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300", ring: "ring-cyan-500", hex: "#06b6d4" },
  sky: { text: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-900/20", border: "border-sky-200 dark:border-sky-800", solid: "bg-sky-500", gradient: "from-sky-500 to-indigo-600", soft: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", ring: "ring-sky-500", hex: "#0ea5e9" },
  purple: { text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800", solid: "bg-purple-600", gradient: "from-purple-600 to-fuchsia-700", soft: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", ring: "ring-purple-500", hex: "#9333ea" },
  violet: { text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-800", solid: "bg-violet-600", gradient: "from-violet-600 to-purple-700", soft: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", ring: "ring-violet-500", hex: "#7c3aed" },
  slate: { text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700", solid: "bg-slate-700", gradient: "from-slate-700 to-slate-900", soft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", ring: "ring-slate-500", hex: "#475569" },
};

export const COLOR_OPTIONS = Object.keys(COLORS);

export function colorClasses(color: string | undefined): ColorSet {
  return COLORS[color ?? "blue"] ?? COLORS.blue;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function downloadText(filename: string, text: string, type = "text/plain"): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
