// Shared domain types for the PyDataMaster server.
// The client keeps a mirrored copy in client/src/lib/types.ts.

export type Role = "learner" | "admin";
export type UserStatus = "active" | "banned";

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  goal: string;
  level: string;
  status: UserStatus;
  avatarColor: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export type ChartType = "none" | "bar" | "line" | "scatter" | "hist";

export interface QuizQuestion {
  id?: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  content: string; // markdown
  codeExample: string;
  chartType: ChartType;
  xp: number;
  durationMin: number;
  orderIndex: number;
  published: boolean;
  quiz: QuizQuestion[];
  updatedAt?: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  library: string;
  icon: string;
  color: string;
  level: string;
  orderIndex: number;
  published: boolean;
  lessons: Lesson[];
  updatedAt?: string;
}

export interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string; // markdown
  category: string;
  author: string;
  readTime: string;
  published: boolean;
  publishedAt: string;
  views: number;
  updatedAt?: string;
}

export interface PipelineStep {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  purpose: string;
  keyConcepts: string[];
  coreLabel: string;
  coreItems: string[];
  scope: string;
  outcome: string;
  phase: string;
  group: string;
  color: string;
  bgColor: string;
  icon: string;
}

export type ResourceCategory = "docs" | "tools" | "cheatsheet";

export interface Resource {
  id: number;
  name: string;
  url: string;
  description: string;
  category: ResourceCategory;
  icon: string;
  content: string; // markdown (cheat sheets)
  orderIndex: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  available: boolean;
}

export interface SiteSettings {
  siteName: string;
  siteSuffix: string;
  tagline: string;
  hero: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  announcement: { enabled: boolean; text: string; link: string };
  social: { linkedin: string; github: string; twitter: string; youtube: string };
  contactEmail: string;
  footerCredit: string;
  features: {
    playground: boolean;
    aiTutor: boolean;
    ads: boolean;
    blog: boolean;
    pricing: boolean;
    newsletter: boolean;
    signup: boolean;
  };
  pricing: { enabled: boolean; note: string; plans: PricingPlan[] };
  adsense: { enabled: boolean; clientId: string };
}

export type TutorProvider = "anthropic" | "gemini" | "offline";

export interface TutorSettings {
  provider: TutorProvider;
  anthropicModel: string;
  geminiModel: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  systemPrompt: string;
  maxTokens: number;
  enabled: boolean;
}

export interface ProgressSummary {
  completedLessons: string[];
  xp: number;
  streak: number;
  longestStreak: number;
  badges: Badge[];
  recentActivity: ActivityItem[];
  quizStats: { attempts: number; correct: number; total: number };
  totalLessons: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string | null;
}

export interface ActivityItem {
  id: number;
  type: string;
  refId: string | null;
  xp: number;
  createdAt: string;
}
