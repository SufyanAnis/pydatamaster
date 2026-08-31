import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, RotateCcw, Save } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { SiteSettings } from "../../lib/types";
import { cn } from "../../lib/utils";
import { usePageTitle, useSite } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Button, Field, Input, Spinner, Textarea, Toggle } from "../../components/ui";
import { EditorPageHeader, EditorTabs } from "../components/EditorChrome";

type TabId = "general" | "announcement" | "social" | "ads";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "announcement", label: "Announcement" },
  { id: "social", label: "Social" },
  { id: "ads", label: "Ads" },
];

const PLACEMENTS: { key: keyof SiteSettings["adsPlacements"]; label: string; description: string }[] = [
  { key: "top", label: "Top banner", description: "Banner under the header." },
  { key: "bottom", label: "Bottom banner", description: "Banner above the footer." },
  { key: "left", label: "Left rail", description: "Sticky left rail - very wide screens." },
  { key: "right", label: "Right rail", description: "Sticky right rail - wide screens." },
  { key: "inContent", label: "In content", description: "Inside articles and between home sections." },
];

/* ------------------------------------------------------------- Helpers */
/** The slice of settings each tab owns; used for dirty-compare and for the PUT body (partial deep-merge server-side). */
function siteSlice(tab: TabId, s: SiteSettings): Partial<SiteSettings> {
  switch (tab) {
    case "general":
      return { siteName: s.siteName, siteSuffix: s.siteSuffix, tagline: s.tagline, contactEmail: s.contactEmail, footerCredit: s.footerCredit };
    case "announcement":
      return { announcement: s.announcement };
    case "social":
      return { social: s.social };
    case "ads":
      return { features: { ads: s.features.ads } as SiteSettings["features"], adsense: s.adsense, adsPlacements: s.adsPlacements };
  }
}

/** Copies one tab's slice from `source` onto `target` without clobbering the other tabs' local edits. */
function mergeSlice(target: SiteSettings, tab: TabId, source: SiteSettings): SiteSettings {
  switch (tab) {
    case "general":
      return { ...target, siteName: source.siteName, siteSuffix: source.siteSuffix, tagline: source.tagline, contactEmail: source.contactEmail, footerCredit: source.footerCredit };
    case "announcement":
      return { ...target, announcement: source.announcement };
    case "social":
      return { ...target, social: source.social };
    case "ads":
      return { ...target, features: { ...target.features, ads: source.features.ads }, adsense: source.adsense, adsPlacements: source.adsPlacements };
  }
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
      {description && <p className="text-sm text-slate-500 font-medium mt-1">{description}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ Tabs */
function GeneralTab({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => onChange({ ...site, [k]: v });
  return (
    <div>
      <SectionTitle title="General" description="Site identity used in the header, footer and page titles." />
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Site name">
          <Input value={site.siteName} onChange={(e) => set("siteName", e.target.value)} />
        </Field>
        <Field label="Site suffix" hint="Small suffix after the name, e.g. i.o.">
          <Input value={site.siteSuffix} onChange={(e) => set("siteSuffix", e.target.value)} />
        </Field>
        <Field label="Tagline" className="md:col-span-2" hint="Used for meta descriptions and the footer.">
          <Textarea rows={2} className="min-h-[72px]" value={site.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Contact email">
          <Input type="email" value={site.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
        </Field>
        <Field label="Footer credit">
          <Input value={site.footerCredit} onChange={(e) => set("footerCredit", e.target.value)} />
        </Field>
      </div>
      <div className="mt-6 rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 font-black flex items-center justify-center">{(site.siteName || "P").charAt(0).toUpperCase()}</div>
        <div>
          <div className="font-black text-slate-900 tracking-tight">
            {site.siteName || "Site name"} <span className="text-amber-600 italic font-semibold">{site.siteSuffix}</span>
          </div>
          <div className="text-xs text-slate-400 font-medium">{site.footerCredit || "Footer credit"}</div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementTab({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const a = site.announcement;
  const set = <K extends keyof SiteSettings["announcement"]>(k: K, v: SiteSettings["announcement"][K]) => onChange({ ...site, announcement: { ...a, [k]: v } });
  return (
    <div>
      <SectionTitle title="Announcement bar" description="A slim amber banner shown above the header on every public page." />
      <div className="space-y-5 max-w-2xl">
        <Toggle checked={a.enabled} onChange={(v) => set("enabled", v)} label="Show announcement" description="Turn off to hide the bar without losing the text." />
        <Field label="Text">
          <Textarea rows={2} className="min-h-[72px]" value={a.text} onChange={(e) => set("text", e.target.value)} />
        </Field>
        <Field label="Link" hint="Internal path (/category/python) or full URL. Leave empty for plain text.">
          <Input value={a.link} onChange={(e) => set("link", e.target.value)} placeholder="/category/python" className="font-mono text-[13px]" />
        </Field>
        <div className={cn("rounded-2xl px-5 py-3 text-xs font-bold flex items-center gap-3 transition-opacity", a.enabled ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-400 opacity-60")}>
          <Megaphone size={14} className="shrink-0" />
          <span className="truncate">{a.text || "Announcement text"}</span>
          {a.link && <span className="ml-auto shrink-0 underline">Learn more</span>}
        </div>
      </div>
    </div>
  );
}

function SocialTab({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const s = site.social;
  const set = <K extends keyof SiteSettings["social"]>(k: K, v: SiteSettings["social"][K]) => onChange({ ...site, social: { ...s, [k]: v } });
  const rows: { key: keyof SiteSettings["social"]; label: string; placeholder: string }[] = [
    { key: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/company/..." },
    { key: "github", label: "GitHub", placeholder: "https://github.com/..." },
    { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/..." },
    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@..." },
  ];
  return (
    <div>
      <SectionTitle title="Social links" description="Shown as icons in the footer. Empty fields are hidden." />
      <div className="grid md:grid-cols-2 gap-5">
        {rows.map((r) => (
          <Field key={r.key} label={r.label}>
            <Input type="url" value={s[r.key]} onChange={(e) => set(r.key, e.target.value)} placeholder={r.placeholder} className="font-mono text-[13px]" />
          </Field>
        ))}
      </div>
    </div>
  );
}

function AdsTab({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const setAds = (v: boolean) => onChange({ ...site, features: { ...site.features, ads: v } });
  const setAdsense = (patch: Partial<SiteSettings["adsense"]>) => onChange({ ...site, adsense: { ...site.adsense, ...patch } });
  const setPlacement = (k: keyof SiteSettings["adsPlacements"], v: boolean) => onChange({ ...site, adsPlacements: { ...site.adsPlacements, [k]: v } });
  return (
    <div>
      <SectionTitle title="Ads" description="Control where ad slots appear on the public site and how AdSense is wired up." />
      <div className="space-y-8 max-w-2xl">
        <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-5">
          <Toggle checked={site.features.ads} onChange={setAds} label="Show ad slots on the public site" description="Master switch. When off, no ad slots render anywhere regardless of the placements below." />
        </div>

        <div className="rounded-3xl border border-slate-200 p-5 space-y-4">
          <span className="text-sm font-black text-slate-900">Google AdSense</span>
          <Toggle checked={site.adsense.enabled} onChange={(v) => setAdsense({ enabled: v })} label="Enable AdSense" description="Loads the AdSense script on public pages." />
          <Field label="Client ID" hint="Looks like ca-pub-1234567890123456.">
            <Input value={site.adsense.clientId} onChange={(e) => setAdsense({ clientId: e.target.value })} placeholder="ca-pub-" className="font-mono text-[13px]" />
          </Field>
          {site.adsense.enabled && !site.features.ads && <Alert type="warning">AdSense is enabled but the master ad switch above is off, so no ads will be shown.</Alert>}
        </div>

        <div>
          <span className="text-sm font-black text-slate-900 block mb-2">Placements</span>
          <p className="text-xs text-slate-500 font-medium mb-3">Where ad slots are allowed to appear. Each one can be switched independently.</p>
          <div className={cn("divide-y divide-slate-100 rounded-3xl border border-slate-200 px-5 transition-opacity", !site.features.ads && "opacity-60")}>
            {PLACEMENTS.map((p) => (
              <div key={p.key} className="py-1">
                <Toggle checked={site.adsPlacements[p.key]} onChange={(v) => setPlacement(p.key, v)} label={p.label} description={p.description} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Page */
export default function Settings() {
  usePageTitle("Settings");
  const toast = useToast();
  const { refreshSettings } = useSite();
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [savedSite, setSavedSite] = useState<SiteSettings | null>(null);
  const [tab, setTab] = useState<TabId>("general");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ site: SiteSettings }>("/admin/settings");
      setSite(d.site);
      setSavedSite(d.site);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isDirty = useCallback(
    (id: TabId): boolean => {
      if (!site || !savedSite) return false;
      return JSON.stringify(siteSlice(id, site)) !== JSON.stringify(siteSlice(id, savedSite));
    },
    [site, savedSite],
  );

  const anyDirty = useMemo(() => TABS.some((t) => isDirty(t.id)), [isDirty]);

  useEffect(() => {
    if (!anyDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  const revert = (id: TabId) => {
    if (site && savedSite) setSite(mergeSlice(site, id, savedSite));
  };

  const switchTab = (next: string) => {
    const id = next as TabId;
    if (id === tab) return;
    if (isDirty(tab)) {
      if (!window.confirm("You have unsaved changes on this tab. Discard them?")) return;
      revert(tab);
    }
    setTab(id);
  };

  const currentLabel = TABS.find((t) => t.id === tab)?.label ?? "Settings";

  const save = async () => {
    if (!site) return;
    setSaving(true);
    try {
      const res = await api.put<{ site: SiteSettings }>("/admin/settings/site", siteSlice(tab, site));
      setSavedSite(res.site);
      setSite((prev) => (prev ? mergeSlice(prev, tab, res.site) : res.site));
      await refreshSettings();
      toast.success("Settings saved", `${currentLabel} updated.`);
    } catch (e) {
      toast.error("Could not save settings", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (error && !site) {
    return (
      <div className="animate-fade-in">
        <EditorPageHeader eyebrow="System" title="Settings" />
        <Alert type="error">
          {error}{" "}
          <button className="underline font-bold" onClick={() => load()}>
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="animate-fade-in">
        <EditorPageHeader eyebrow="System" title="Settings" />
        <Spinner label="Loading settings" />
      </div>
    );
  }

  const dirty = isDirty(tab);

  return (
    <div className="animate-fade-in">
      <EditorPageHeader eyebrow="System" title="Settings" subtitle="Everything that shapes the public site. Each tab saves independently." />

      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <EditorTabs tabs={TABS.map((t) => ({ id: t.id, label: t.label, dirty: isDirty(t.id) }))} active={tab} onChange={switchTab} />
        </div>

        <div className="p-5 sm:p-8">
          {tab === "general" && <GeneralTab site={site} onChange={setSite} />}
          {tab === "announcement" && <AnnouncementTab site={site} onChange={setSite} />}
          {tab === "social" && <SocialTab site={site} onChange={setSite} />}
          {tab === "ads" && <AdsTab site={site} onChange={setSite} />}
        </div>

        <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-8 py-4 border-t border-slate-100 bg-white/90 backdrop-blur rounded-b-2xl">
          <div className="text-xs font-medium flex items-center gap-2">
            {dirty ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-700">Unsaved changes on {currentLabel}</span>
              </>
            ) : (
              <span className="text-slate-400">All changes on {currentLabel} are saved.</span>
            )}
          </div>
          <div className="flex justify-end gap-3">
            {dirty && (
              <Button variant="secondary" onClick={() => revert(tab)} disabled={saving}>
                <RotateCcw size={14} /> Discard
              </Button>
            )}
            <Button onClick={save} loading={saving} disabled={!dirty}>
              <Save size={14} /> Save {currentLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
