import { db } from "./db.js";
import type { SiteSettings, TutorSettings } from "./types.js";

export const DEFAULT_SITE: SiteSettings = {
  siteName: "PyDataMaster",
  siteSuffix: "i.o.",
  tagline: "The definitive interactive platform for Python Data Science learning. Master NumPy, Pandas, and Matplotlib.",
  hero: {
    badge: "Level Up Your Data Career",
    titleLine1: "Master Python",
    titleLine2: "Data Science Libraries",
    subtitle:
      "The definitive interactive guide to NumPy, Pandas, and Matplotlib. Learn by doing with real lessons, quizzes, an in-browser Python playground and an AI tutor.",
    primaryCta: "Start Module 1",
    secondaryCta: "Live Playground",
  },
  announcement: {
    enabled: true,
    text: "New: run real Python (NumPy, Pandas, Matplotlib) directly in your browser in the Playground.",
    link: "/playground",
  },
  social: {
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
    twitter: "",
    youtube: "",
  },
  contactEmail: "hello@pydatamaster.io",
  footerCredit: "Crafted with love for Data Pros",
  features: {
    playground: true,
    aiTutor: true,
    ads: false,
    blog: true,
    pricing: true,
    newsletter: true,
    signup: true,
  },
  pricing: {
    enabled: true,
    note: "Paid tiers (certified courses, job board and freelancing work) are coming soon. Everything below marked Free is available today.",
    plans: [
      {
        id: "free",
        name: "Learner",
        price: "$0",
        period: "forever",
        description: "Everything you need to master the core Python data stack.",
        features: [
          "All NumPy, Pandas & Matplotlib lessons",
          "Interactive quizzes & XP progress",
          "In-browser Python playground",
          "AI Tutor (fair-use)",
          "Community resources & cheat sheets",
        ],
        cta: "Start for free",
        highlighted: false,
        available: true,
      },
      {
        id: "pro",
        name: "Pro",
        price: "$12",
        period: "per month",
        description: "Certified learning paths and career tooling for serious learners.",
        features: [
          "Everything in Learner",
          "Verified completion certificates",
          "Advanced ML & MLOps modules",
          "Unlimited AI Tutor",
          "Priority support",
        ],
        cta: "Join waitlist",
        highlighted: true,
        available: false,
      },
      {
        id: "team",
        name: "Team",
        price: "$49",
        period: "per month",
        description: "Onboard and upskill your whole data team with shared dashboards.",
        features: [
          "Everything in Pro",
          "Team progress dashboard",
          "Custom curriculum & private modules",
          "SSO & admin controls",
          "Dedicated success manager",
        ],
        cta: "Contact sales",
        highlighted: false,
        available: false,
      },
    ],
  },
  adsense: { enabled: false, clientId: "" },
};

export const DEFAULT_TUTOR_PROMPT = `You are PyDataBot, a friendly and expert Data Science Tutor for the PyDataMaster learning platform.
You specialize in Python libraries: Pandas, NumPy, Matplotlib and Scikit-Learn.
Your goal is to help beginners understand data concepts, fix their code, and explain complex topics simply.
Keep answers concise (under ~200 words unless code is needed), encouraging, and formatted with Markdown.
When the learner shares code, refer to specific lines and show corrected snippets in fenced python code blocks.
If asked about monetization or ads, explain that learning these skills is valuable for high-paying careers.`;

export const DEFAULT_TUTOR: TutorSettings = {
  provider: "anthropic",
  anthropicModel: "claude-opus-5",
  geminiModel: "gemini-2.5-flash",
  anthropicApiKey: "",
  geminiApiKey: "",
  systemPrompt: DEFAULT_TUTOR_PROMPT,
  maxTokens: 1024,
  enabled: true,
};

export function getSetting<T>(key: string, fallback: T): T {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, JSON.stringify(value));
}

function mergeDeep<T extends Record<string, any>>(base: T, patch: Partial<T> | undefined): T {
  if (!patch || typeof patch !== "object") return base;
  const out: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const b = (base as Record<string, any>)[k];
    if (b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = mergeDeep(b, v as any);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function getSiteSettings(): SiteSettings {
  return mergeDeep(DEFAULT_SITE, getSetting<Partial<SiteSettings>>("site", {}));
}

export function saveSiteSettings(patch: Partial<SiteSettings>): SiteSettings {
  const merged = mergeDeep(getSiteSettings(), patch);
  setSetting("site", merged);
  return merged;
}

export function getTutorSettings(): TutorSettings {
  const stored = mergeDeep(DEFAULT_TUTOR, getSetting<Partial<TutorSettings>>("tutor", {}));
  // Environment keys act as fallbacks when nothing is stored in the DB.
  if (!stored.anthropicApiKey && process.env.ANTHROPIC_API_KEY) stored.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!stored.geminiApiKey && process.env.GEMINI_API_KEY) stored.geminiApiKey = process.env.GEMINI_API_KEY;
  return stored;
}

export function saveTutorSettings(patch: Partial<TutorSettings>): TutorSettings {
  const current = mergeDeep(DEFAULT_TUTOR, getSetting<Partial<TutorSettings>>("tutor", {}));
  const merged = mergeDeep(current, patch);
  setSetting("tutor", merged);
  return getTutorSettings();
}

/** Settings that are safe to expose to any visitor. Never includes API keys. */
export function publicSettings() {
  const site = getSiteSettings();
  const tutor = getTutorSettings();
  const hasKey =
    (tutor.provider === "anthropic" && !!tutor.anthropicApiKey) ||
    (tutor.provider === "gemini" && !!tutor.geminiApiKey) ||
    tutor.provider === "offline";
  return {
    ...site,
    tutor: {
      enabled: tutor.enabled && site.features.aiTutor,
      provider: tutor.provider,
      configured: hasKey,
      model: tutor.provider === "anthropic" ? tutor.anthropicModel : tutor.provider === "gemini" ? tutor.geminiModel : "offline",
    },
  };
}

/** Admin view of tutor settings with keys masked. */
export function maskedTutorSettings() {
  const t = getTutorSettings();
  const mask = (k: string) => (k ? `${k.slice(0, 6)}${"*".repeat(Math.max(0, Math.min(12, k.length - 10)))}${k.slice(-4)}` : "");
  return {
    ...t,
    anthropicApiKey: mask(t.anthropicApiKey),
    geminiApiKey: mask(t.geminiApiKey),
    hasAnthropicKey: !!t.anthropicApiKey,
    hasGeminiKey: !!t.geminiApiKey,
  };
}
