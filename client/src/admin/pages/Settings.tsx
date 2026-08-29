import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, Code2, KeyRound, Plus, RotateCcw, Save, Sparkles, Trash2, Wifi } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { PricingPlan, SiteSettings, TutorProvider, TutorSettings } from "../../lib/types";
import { cn } from "../../lib/utils";
import { useSite } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Button, Field, Input, Pill, Spinner, Textarea, Toggle } from "../../components/ui";
import { EditorIconButton, EditorOrderButtons, EditorPageHeader, EditorTabs } from "../components/EditorChrome";
import { EditorListInput } from "../components/EditorListInput";

type SiteTab = "general" | "hero" | "announcement" | "social" | "features" | "pricing" | "adsense";
type TabId = SiteTab | "tutor";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "hero", label: "Hero" },
  { id: "announcement", label: "Announcement" },
  { id: "social", label: "Social" },
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
  { id: "adsense", label: "AdSense" },
  { id: "tutor", label: "AI Tutor" },
];

const FEATURES: { key: keyof SiteSettings["features"]; label: string; description: string }[] = [
  { key: "playground", label: "Playground", description: "In-browser Python playground and the Try it buttons on code examples." },
  { key: "aiTutor", label: "AI Tutor", description: "Floating tutor chat on every page. Also needs the AI Tutor tab enabled and configured." },
  { key: "ads", label: "Ads", description: "Render AdSense slots on public pages. Configure the AdSense tab first." },
  { key: "blog", label: "Blog", description: "Blog section, post pages and the navigation link." },
  { key: "pricing", label: "Pricing", description: "Pricing page and its navigation link." },
  { key: "newsletter", label: "Newsletter", description: "Email signup form in the footer." },
  { key: "signup", label: "Signup", description: "Allow visitors to create learner accounts. Existing users can still log in." },
];

const PROVIDERS: { id: TutorProvider; label: string; description: string }[] = [
  { id: "anthropic", label: "Anthropic Claude (recommended)", description: "Best reasoning and code help. Needs an Anthropic API key." },
  { id: "gemini", label: "Google Gemini", description: "Fast and inexpensive. Needs a Google AI Studio key." },
  { id: "offline", label: "Offline", description: "Answers from the curriculum only. No API calls, no cost." },
];

const ANTHROPIC_MODELS = ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"];
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];

interface TestResult {
  reply: string;
  provider: string;
  model: string;
  ms: number;
  note?: string | null;
  configuredProvider: string;
}

/* ------------------------------------------------------------- Helpers */
function siteSlice(tab: SiteTab, s: SiteSettings): Partial<SiteSettings> {
  switch (tab) {
    case "general":
      return { siteName: s.siteName, siteSuffix: s.siteSuffix, tagline: s.tagline, contactEmail: s.contactEmail, footerCredit: s.footerCredit };
    case "hero":
      return { hero: s.hero };
    case "announcement":
      return { announcement: s.announcement };
    case "social":
      return { social: s.social };
    case "features":
      return { features: s.features };
    case "pricing":
      return { pricing: s.pricing };
    case "adsense":
      return { adsense: s.adsense };
  }
}

function applySlice(target: SiteSettings, slice: Partial<SiteSettings>): SiteSettings {
  return { ...target, ...slice };
}

function tutorComparable(t: TutorSettings) {
  return { provider: t.provider, anthropicModel: t.anthropicModel, geminiModel: t.geminiModel, systemPrompt: t.systemPrompt, maxTokens: t.maxTokens, enabled: t.enabled };
}

function newPlan(n: number): PricingPlan {
  return { id: `plan-${n}`, name: "New plan", price: "$0", period: "per month", description: "", features: [], cta: "Get started", highlighted: false, available: true };
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{description}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ Site tabs */
function GeneralTab({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => onChange({ ...site, [k]: v });
  return (
    <div>
      <SectionTitle title="General" description="Site identity used in the header, footer, page titles and emails." />
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
      <div className="mt-6 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center">{(site.siteName || "P").charAt(0).toUpperCase()}</div>
        <div>
          <div className="font-black text-slate-900 dark:text-white tracking-tight">
            {site.siteName || "Site name"} <span className="text-blue-600 dark:text-blue-400">{site.siteSuffix}</span>
          </div>
          <div className="text-xs text-slate-400 font-medium">{site.footerCredit || "Footer credit"}</div>
        </div>
      </div>
    </div>
  );
}

function HeroTab({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const hero = site.hero;
  const set = <K extends keyof SiteSettings["hero"]>(k: K, v: SiteSettings["hero"][K]) => onChange({ ...site, hero: { ...hero, [k]: v } });
  return (
    <div>
      <SectionTitle title="Home page hero" description="The headline block at the top of the home page. The preview updates as you type." />
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="grid gap-5">
          <Field label="Badge" hint="Small pill above the title.">
            <Input value={hero.badge} onChange={(e) => set("badge", e.target.value)} />
          </Field>
          <Field label="Title line 1">
            <Input value={hero.titleLine1} onChange={(e) => set("titleLine1", e.target.value)} />
          </Field>
          <Field label="Title line 2" hint="Rendered in blue.">
            <Input value={hero.titleLine2} onChange={(e) => set("titleLine2", e.target.value)} />
          </Field>
          <Field label="Subtitle">
            <Textarea rows={3} className="min-h-[90px]" value={hero.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Primary CTA" hint="Links to the first lesson.">
              <Input value={hero.primaryCta} onChange={(e) => set("primaryCta", e.target.value)} />
            </Field>
            <Field label="Secondary CTA" hint="Links to the playground when enabled.">
              <Input value={hero.secondaryCta} onChange={(e) => set("secondaryCta", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="lg:sticky lg:top-6 self-start">
          <span className="label block mb-2">Live preview</span>
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-[2rem] p-7 md:p-9 text-white shadow-2xl overflow-hidden">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mb-5">
              <Sparkles size={12} className="text-amber-400" /> {hero.badge || "Badge"}
            </div>
            <div className="text-3xl md:text-4xl font-black tracking-tighter leading-[1.05] drop-shadow-xl">{hero.titleLine1 || "Title line 1"}</div>
            <div className="text-2xl md:text-3xl font-black tracking-tighter leading-[1.05] text-blue-400 drop-shadow-xl mb-5">{hero.titleLine2 || "Title line 2"}</div>
            <p className="text-slate-300 text-sm font-medium leading-relaxed mb-6 opacity-90">{hero.subtitle || "Subtitle"}</p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest">
                {hero.primaryCta || "Primary"} <ArrowRight size={14} />
              </span>
              {site.features.playground && (
                <span className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest">
                  <Code2 size={14} /> {hero.secondaryCta || "Secondary"}
                </span>
              )}
            </div>
          </div>
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
      <SectionTitle title="Announcement bar" description="A slim banner shown above the header on every public page." />
      <div className="space-y-5 max-w-2xl">
        <Toggle checked={a.enabled} onChange={(v) => set("enabled", v)} label="Show announcement" description="Turn off to hide the bar without losing the text." />
        <Field label="Text">
          <Textarea rows={2} className="min-h-[72px]" value={a.text} onChange={(e) => set("text", e.target.value)} />
        </Field>
        <Field label="Link" hint="Internal path (/playground) or full URL. Leave empty for plain text.">
          <Input value={a.link} onChange={(e) => set("link", e.target.value)} placeholder="/playground" className="font-mono text-[13px]" />
        </Field>
        <div className={cn("rounded-2xl px-5 py-3 text-xs font-bold flex items-center gap-3 transition-opacity", a.enabled ? "bg-slate-900 dark:bg-slate-800 text-white" : "bg-slate-100 dark:bg-slate-800/50 text-slate-400 opacity-60")}>
          <Sparkles size={14} className="text-amber-400 shrink-0" />
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
      <SectionTitle title="Social links" description="Shown in the footer. Empty fields are hidden." />
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

function FeaturesTab({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const f = site.features;
  const set = (k: keyof SiteSettings["features"], v: boolean) => onChange({ ...site, features: { ...f, [k]: v } });
  return (
    <div>
      <SectionTitle title="Feature flags" description="Switch whole areas of the public site on or off without redeploying." />
      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-w-2xl">
        {FEATURES.map((ft) => (
          <div key={ft.key} className="py-1">
            <Toggle checked={f[ft.key]} onChange={(v) => set(ft.key, v)} label={ft.label} description={ft.description} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanEditor({ plan, index, count, onChange, onMove, onRemove }: { plan: PricingPlan; index: number; count: number; onChange: (p: PricingPlan) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  const set = <K extends keyof PricingPlan>(k: K, v: PricingPlan[K]) => onChange({ ...plan, [k]: v });
  return (
    <div className={cn("rounded-3xl border p-5 sm:p-6 space-y-5", plan.highlighted ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-700")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan {index + 1}</span>
          {plan.highlighted && <Pill color="blue">Highlighted</Pill>}
          {!plan.available && <Pill color="amber">Coming soon</Pill>}
        </div>
        <div className="flex items-center gap-1">
          <EditorOrderButtons onUp={() => onMove(-1)} onDown={() => onMove(1)} disableUp={index === 0} disableDown={index === count - 1} />
          <EditorIconButton title="Remove plan" danger onClick={onRemove}>
            <Trash2 size={15} />
          </EditorIconButton>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="ID" hint="Stable key, e.g. free, pro, team.">
          <Input value={plan.id} onChange={(e) => set("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="font-mono" />
        </Field>
        <Field label="Name">
          <Input value={plan.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="CTA label">
          <Input value={plan.cta} onChange={(e) => set("cta", e.target.value)} />
        </Field>
        <Field label="Price">
          <Input value={plan.price} onChange={(e) => set("price", e.target.value)} placeholder="$12" />
        </Field>
        <Field label="Period">
          <Input value={plan.period} onChange={(e) => set("period", e.target.value)} placeholder="per month" />
        </Field>
        <div className="flex flex-col justify-end gap-1">
          <Toggle checked={plan.highlighted} onChange={(v) => set("highlighted", v)} label="Highlighted" />
          <Toggle checked={plan.available} onChange={(v) => set("available", v)} label="Available now" />
        </div>
        <Field label="Description" className="md:col-span-3">
          <Input value={plan.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <EditorListInput className="md:col-span-3" label="Features" value={plan.features} onChange={(v) => set("features", v)} rows={4} placeholder={"All lessons\nQuizzes and XP\nPlayground"} />
      </div>
    </div>
  );
}

function PricingTab({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const p = site.pricing;
  const setPricing = (patch: Partial<SiteSettings["pricing"]>) => onChange({ ...site, pricing: { ...p, ...patch } });
  const setPlans = (plans: PricingPlan[]) => setPricing({ plans });
  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= p.plans.length) return;
    const next = [...p.plans];
    [next[i], next[t]] = [next[t], next[i]];
    setPlans(next);
  };
  return (
    <div>
      <SectionTitle title="Pricing" description="Plans shown on the pricing page. The Pricing feature flag controls whether the page is linked at all." />
      <div className="space-y-5 max-w-2xl mb-8">
        <Toggle checked={p.enabled} onChange={(v) => setPricing({ enabled: v })} label="Show plans" description="When off, the pricing page shows only the note below." />
        <Field label="Note" hint="Shown above the plans, e.g. to explain what is coming soon.">
          <Textarea rows={2} className="min-h-[72px]" value={p.note} onChange={(e) => setPricing({ note: e.target.value })} />
        </Field>
      </div>
      <div className="space-y-5">
        {p.plans.map((plan, i) => (
          <PlanEditor key={i} plan={plan} index={i} count={p.plans.length} onChange={(np) => setPlans(p.plans.map((x, j) => (j === i ? np : x)))} onMove={(dir) => move(i, dir)} onRemove={() => setPlans(p.plans.filter((_, j) => j !== i))} />
        ))}
        <Button variant="secondary" onClick={() => setPlans([...p.plans, newPlan(p.plans.length + 1)])}>
          <Plus size={14} /> Add plan
        </Button>
      </div>
    </div>
  );
}

function AdsenseTab({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const a = site.adsense;
  return (
    <div>
      <SectionTitle title="Google AdSense" description="Ad slots only render when both this switch and the Ads feature flag are on." />
      <div className="space-y-5 max-w-2xl">
        <Toggle checked={a.enabled} onChange={(v) => onChange({ ...site, adsense: { ...a, enabled: v } })} label="Enable AdSense" description="Loads the AdSense script on public pages." />
        <Field label="Client ID" hint="Looks like ca-pub-1234567890123456.">
          <Input value={a.clientId} onChange={(e) => onChange({ ...site, adsense: { ...a, clientId: e.target.value } })} placeholder="ca-pub-" className="font-mono text-[13px]" />
        </Field>
        {a.enabled && !site.features.ads && <Alert type="warning">AdSense is enabled but the Ads feature flag is off, so no ads will be shown. Turn it on in the Features tab.</Alert>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Tutor tab */
function KeyField({ label, masked, hasKey, value, onChange, onClear, clearing, envVar }: { label: string; masked: string; hasKey: boolean; value: string; onChange: (v: string) => void; onClear: () => void; clearing: boolean; envVar: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="label">{label}</span>
        {hasKey ? (
          <span className="inline-flex items-center gap-2">
            <Pill color="emerald">
              <KeyRound size={10} /> Key set
            </Pill>
            <code className="text-[11px] font-mono text-slate-400">{masked}</code>
          </span>
        ) : (
          <Pill color="slate">No key</Pill>
        )}
      </div>
      <div className="flex gap-2">
        <Input type="password" autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} placeholder={hasKey ? "Enter a new key to replace" : "Paste API key"} className="font-mono text-[13px]" />
        {hasKey && (
          <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={onClear} loading={clearing} title="Remove the stored key">
            <Trash2 size={12} /> Remove key
          </Button>
        )}
      </div>
      <span className="block text-xs text-slate-400 font-medium px-1">
        Leave empty to keep the current key. Falls back to the <code className="font-mono">{envVar}</code> environment variable when nothing is stored.
      </span>
    </div>
  );
}

function TutorTab({
  tutor,
  onChange,
  newKeys,
  onNewKeys,
  onClearKey,
  clearing,
  onTest,
  testing,
  testResult,
  testError,
}: {
  tutor: TutorSettings;
  onChange: (t: TutorSettings) => void;
  newKeys: { anthropic: string; gemini: string };
  onNewKeys: (k: { anthropic: string; gemini: string }) => void;
  onClearKey: (p: "anthropic" | "gemini") => void;
  clearing: "anthropic" | "gemini" | null;
  onTest: () => void;
  testing: boolean;
  testResult: TestResult | null;
  testError: string | null;
}) {
  const set = <K extends keyof TutorSettings>(k: K, v: TutorSettings[K]) => onChange({ ...tutor, [k]: v });
  const activeHasKey = tutor.provider === "anthropic" ? !!tutor.hasAnthropicKey || !!newKeys.anthropic : tutor.provider === "gemini" ? !!tutor.hasGeminiKey || !!newKeys.gemini : true;

  return (
    <div>
      <SectionTitle title="AI Tutor" description="The floating chat assistant. Keys are stored server-side and never sent to the browser in full." />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8">
        <div className="space-y-6">
          <Toggle checked={tutor.enabled} onChange={(v) => set("enabled", v)} label="Tutor enabled" description="Also requires the AI Tutor feature flag in the Features tab." />

          <div className="space-y-2">
            <span className="label block">Provider</span>
            <div className="grid gap-2">
              {PROVIDERS.map((p) => {
                const active = tutor.provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set("provider", p.id)}
                    className={cn(
                      "flex items-start gap-3 text-left rounded-2xl border p-4 transition-all",
                      active ? "border-blue-500 bg-blue-50/60 dark:bg-blue-900/10 shadow-sm" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                    )}
                  >
                    <span className={cn("mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center", active ? "border-blue-600" : "border-slate-300 dark:border-slate-600")}>{active && <span className="w-2 h-2 rounded-full bg-blue-600" />}</span>
                    <span>
                      <span className="block text-sm font-black text-slate-900 dark:text-white">{p.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">{p.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {!activeHasKey && tutor.enabled && <Alert type="warning">The selected provider has no API key. The tutor will fall back to offline answers until a key is added here or via the environment.</Alert>}

          <Field label="Max tokens" hint="Length cap per reply (128 - 8192).">
            <Input type="number" min={128} max={8192} step={64} value={tutor.maxTokens} onChange={(e) => set("maxTokens", e.target.value === "" ? 0 : Number(e.target.value))} className="max-w-[200px]" />
          </Field>
        </div>

        <div className="space-y-6">
          <div className={cn("rounded-3xl border p-5 space-y-4 transition-opacity", tutor.provider === "anthropic" ? "border-blue-200 dark:border-blue-900/40" : "border-slate-200 dark:border-slate-700 opacity-80")}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900 dark:text-white">Anthropic</span>
              {tutor.provider === "anthropic" && <Pill color="blue">Active</Pill>}
            </div>
            <Field label="Model">
              <Input list="anthropic-models" value={tutor.anthropicModel} onChange={(e) => set("anthropicModel", e.target.value)} className="font-mono text-[13px]" />
              <datalist id="anthropic-models">
                {ANTHROPIC_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            <KeyField label="API key" masked={tutor.anthropicApiKey} hasKey={!!tutor.hasAnthropicKey} value={newKeys.anthropic} onChange={(v) => onNewKeys({ ...newKeys, anthropic: v })} onClear={() => onClearKey("anthropic")} clearing={clearing === "anthropic"} envVar="ANTHROPIC_API_KEY" />
          </div>

          <div className={cn("rounded-3xl border p-5 space-y-4 transition-opacity", tutor.provider === "gemini" ? "border-blue-200 dark:border-blue-900/40" : "border-slate-200 dark:border-slate-700 opacity-80")}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900 dark:text-white">Google Gemini</span>
              {tutor.provider === "gemini" && <Pill color="blue">Active</Pill>}
            </div>
            <Field label="Model">
              <Input list="gemini-models" value={tutor.geminiModel} onChange={(e) => set("geminiModel", e.target.value)} className="font-mono text-[13px]" />
              <datalist id="gemini-models">
                {GEMINI_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            <KeyField label="API key" masked={tutor.geminiApiKey} hasKey={!!tutor.hasGeminiKey} value={newKeys.gemini} onChange={(v) => onNewKeys({ ...newKeys, gemini: v })} onClear={() => onClearKey("gemini")} clearing={clearing === "gemini"} envVar="GEMINI_API_KEY" />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Field label="System prompt" hint="Sets the tutor's persona and rules. Lesson context and the learner's code are appended automatically.">
          <Textarea rows={8} className="min-h-[180px] font-mono text-[13px] leading-relaxed" value={tutor.systemPrompt} onChange={(e) => set("systemPrompt", e.target.value)} />
        </Field>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Wifi size={16} /> Test connection
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sends a short prompt using the saved configuration. Save your changes first.</p>
          </div>
          <Button variant="secondary" onClick={onTest} loading={testing}>
            <Bot size={14} /> Run test
          </Button>
        </div>
        {testError && <Alert type="error">{testError}</Alert>}
        {testResult && (
          <Alert type={testResult.note ? "warning" : "success"}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Pill color={testResult.provider === "offline" ? "amber" : "emerald"}>{testResult.provider}</Pill>
              <code className="text-xs font-mono">{testResult.model}</code>
              <span className="text-xs font-bold tabular-nums">{testResult.ms} ms</span>
            </div>
            {testResult.note && <p className="font-bold mb-2">{testResult.note}</p>}
            <p className="whitespace-pre-wrap">{testResult.reply}</p>
            {testResult.provider !== testResult.configuredProvider && <p className="mt-2 text-xs">The configured provider is {testResult.configuredProvider} but the reply came from {testResult.provider}. Check the API key and model name.</p>}
          </Alert>
        )}
        <Alert type="info">
          <span className="font-bold">Environment fallbacks.</span> When no key is stored here, the server uses <code className="font-mono">ANTHROPIC_API_KEY</code> / <code className="font-mono">GEMINI_API_KEY</code> from its environment. Removing a stored key makes the tutor fall back to those variables.
        </Alert>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Page */
export default function Settings() {
  const toast = useToast();
  const { refreshSettings } = useSite();
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [savedSite, setSavedSite] = useState<SiteSettings | null>(null);
  const [tutor, setTutor] = useState<TutorSettings | null>(null);
  const [savedTutor, setSavedTutor] = useState<TutorSettings | null>(null);
  const [newKeys, setNewKeys] = useState({ anthropic: "", gemini: "" });
  const [tab, setTab] = useState<TabId>("general");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState<"anthropic" | "gemini" | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ site: SiteSettings; tutor: TutorSettings }>("/admin/settings");
      setSite(d.site);
      setSavedSite(d.site);
      setTutor(d.tutor);
      setSavedTutor(d.tutor);
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
      if (id === "tutor") {
        if (!tutor || !savedTutor) return false;
        return JSON.stringify(tutorComparable(tutor)) !== JSON.stringify(tutorComparable(savedTutor)) || !!newKeys.anthropic || !!newKeys.gemini;
      }
      if (!site || !savedSite) return false;
      return JSON.stringify(siteSlice(id, site)) !== JSON.stringify(siteSlice(id, savedSite));
    },
    [site, savedSite, tutor, savedTutor, newKeys],
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
    if (id === "tutor") {
      setTutor(savedTutor);
      setNewKeys({ anthropic: "", gemini: "" });
    } else if (site && savedSite) {
      setSite(applySlice(site, siteSlice(id, savedSite)));
    }
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
    setSaving(true);
    try {
      if (tab === "tutor") {
        if (!tutor) return;
        if (!Number.isInteger(tutor.maxTokens) || tutor.maxTokens < 128 || tutor.maxTokens > 8192) {
          toast.error("Invalid max tokens", "Use a whole number between 128 and 8192.");
          return;
        }
        const body: Record<string, unknown> = { ...tutorComparable(tutor) };
        if (newKeys.anthropic.trim()) body.anthropicApiKey = newKeys.anthropic.trim();
        if (newKeys.gemini.trim()) body.geminiApiKey = newKeys.gemini.trim();
        const res = await api.put<{ tutor: TutorSettings }>("/admin/settings/tutor", body);
        setTutor(res.tutor);
        setSavedTutor(res.tutor);
        setNewKeys({ anthropic: "", gemini: "" });
      } else {
        if (!site) return;
        const res = await api.put<{ site: SiteSettings }>("/admin/settings/site", siteSlice(tab, site));
        setSavedSite(res.site);
        setSite((prev) => (prev ? applySlice(prev, siteSlice(tab, res.site)) : res.site));
      }
      await refreshSettings();
      toast.success("Settings saved", `${currentLabel} updated.`);
    } catch (e) {
      toast.error("Could not save settings", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async (provider: "anthropic" | "gemini") => {
    if (!window.confirm(`Remove the stored ${provider === "anthropic" ? "Anthropic" : "Gemini"} API key? The server will fall back to its environment variable, if set.`)) return;
    setClearing(provider);
    try {
      const res = await api.post<{ tutor: TutorSettings }>("/admin/settings/tutor/clear-key", { provider });
      // Keep any unsaved edits to other fields; only refresh key state from the server.
      setTutor((t) => (t ? { ...t, anthropicApiKey: res.tutor.anthropicApiKey, geminiApiKey: res.tutor.geminiApiKey, hasAnthropicKey: res.tutor.hasAnthropicKey, hasGeminiKey: res.tutor.hasGeminiKey } : res.tutor));
      setSavedTutor((t) => (t ? { ...t, anthropicApiKey: res.tutor.anthropicApiKey, geminiApiKey: res.tutor.geminiApiKey, hasAnthropicKey: res.tutor.hasAnthropicKey, hasGeminiKey: res.tutor.hasGeminiKey } : res.tutor));
      setNewKeys((k) => ({ ...k, [provider]: "" }));
      await refreshSettings();
      toast.success("Key removed");
    } catch (e) {
      toast.error("Could not remove key", errorMessage(e));
    } finally {
      setClearing(null);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      setTestResult(await api.post<TestResult>("/admin/settings/tutor/test"));
    } catch (e) {
      setTestError(errorMessage(e));
    } finally {
      setTesting(false);
    }
  };

  if (error && !site) {
    return (
      <div className="animate-fade-in">
        <EditorPageHeader eyebrow="Configuration" title="Settings" />
        <Alert type="error">
          {error}{" "}
          <button className="underline font-bold" onClick={() => load()}>
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  if (!site || !tutor) {
    return (
      <div className="animate-fade-in">
        <EditorPageHeader eyebrow="Configuration" title="Settings" />
        <Spinner label="Loading settings" />
      </div>
    );
  }

  const dirty = isDirty(tab);

  return (
    <div className="animate-fade-in">
      <EditorPageHeader eyebrow="Configuration" title="Settings" subtitle="Everything that shapes the public site. Each tab saves independently." />

      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <EditorTabs tabs={TABS.map((t) => ({ id: t.id, label: t.label, dirty: isDirty(t.id) }))} active={tab} onChange={switchTab} />
        </div>

        <div className="p-5 sm:p-8">
          {tab === "general" && <GeneralTab site={site} onChange={setSite} />}
          {tab === "hero" && <HeroTab site={site} onChange={setSite} />}
          {tab === "announcement" && <AnnouncementTab site={site} onChange={setSite} />}
          {tab === "social" && <SocialTab site={site} onChange={setSite} />}
          {tab === "features" && <FeaturesTab site={site} onChange={setSite} />}
          {tab === "pricing" && <PricingTab site={site} onChange={setSite} />}
          {tab === "adsense" && <AdsenseTab site={site} onChange={setSite} />}
          {tab === "tutor" && (
            <TutorTab tutor={tutor} onChange={setTutor} newKeys={newKeys} onNewKeys={setNewKeys} onClearKey={clearKey} clearing={clearing} onTest={test} testing={testing} testResult={testResult} testError={testError} />
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-b-3xl">
          <div className="text-xs font-medium flex items-center gap-2">
            {dirty ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-700 dark:text-amber-300">Unsaved changes on {currentLabel}</span>
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
