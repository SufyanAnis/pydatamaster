import { useSite } from "../context/SiteContext";
import { cn } from "../lib/utils";

export type AdPlacement = "top" | "bottom" | "left" | "right" | "content";

const LABELS: Record<AdPlacement, string> = {
  top: "Top Banner",
  bottom: "Bottom Banner",
  left: "Left Rail",
  right: "Right Rail",
  content: "In-Article Ad",
};

/**
 * Renders an ad placeholder only when ads are enabled AND the specific placement is
 * turned on in Admin -> Settings -> Ads. Placements: top / bottom / left / right / content.
 */
export function AdSlot({ slot = "content", className }: { slot?: AdPlacement; className?: string }) {
  const { settings } = useSite();
  if (!settings?.features.ads) return null;
  const placements = settings.adsPlacements;
  const key = slot === "content" ? "inContent" : slot;
  if (placements && !placements[key as keyof typeof placements]) return null;

  const shape =
    slot === "top" || slot === "bottom"
      ? "w-full min-h-[90px]"
      : slot === "left" || slot === "right"
        ? "w-full min-h-[600px]"
        : "w-full min-h-[250px]";

  return (
    <div
      className={cn(
        "bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-sm font-medium select-none overflow-hidden",
        shape,
        className,
      )}
      aria-label="Advertisement"
    >
      <span className="mb-1 text-[9px] uppercase tracking-[0.3em] font-black">Advertisement</span>
      <span className="font-bold text-slate-500 text-xs">{LABELS[slot]}</span>
      {settings.adsense.enabled && settings.adsense.clientId && <span className="mt-1 text-[10px] font-mono">{settings.adsense.clientId}</span>}
    </div>
  );
}

/** Wraps page content with optional left/right ad rails on wide screens. */
export function AdRailLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useSite();
  const adsOn = !!settings?.features.ads;
  const left = adsOn && settings!.adsPlacements?.left;
  const right = adsOn && settings!.adsPlacements?.right;
  if (!left && !right) return <>{children}</>;
  return (
    <div className="flex gap-6 items-start">
      {left && (
        <aside className="hidden 2xl:block w-44 shrink-0 sticky top-28 no-print">
          <AdSlot slot="left" />
        </aside>
      )}
      <div className="flex-1 min-w-0">{children}</div>
      {right && (
        <aside className="hidden xl:block w-44 shrink-0 sticky top-28 no-print">
          <AdSlot slot="right" />
        </aside>
      )}
    </div>
  );
}
