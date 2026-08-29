import { useSite } from "../context/SiteContext";
import { cn } from "../lib/utils";

/** Renders an ad placeholder only when ads are enabled in Admin -> Settings. */
export function AdSlot({ slot = "content", className }: { slot?: "header" | "sidebar" | "content"; className?: string }) {
  const { settings } = useSite();
  if (!settings?.features.ads) return null;
  const label = slot === "header" ? "Top Banner Ad" : slot === "sidebar" ? "Sidebar Ad" : "In-Article Ad";
  return (
    <div className={cn("bg-slate-100 dark:bg-slate-900/60 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-sm font-medium select-none overflow-hidden min-h-[96px]", className)} aria-label="Advertisement">
      <span className="mb-1 text-[10px] uppercase tracking-[0.3em] font-black">Advertisement</span>
      <span className="font-bold text-slate-500">{label}</span>
      {settings.adsense.enabled && settings.adsense.clientId && <span className="mt-1 text-[10px] font-mono">{settings.adsense.clientId}</span>}
    </div>
  );
}
