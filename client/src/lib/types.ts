// Mirrors server/src/types.ts plus API response shapes used by the client.

export type Role = "learner" | "admin";
export type UserStatus = "active" | "banned";

export interface User {
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
  content: string;
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
  content: string;
  category: string; // category slug
  coverImage: string;
  author: string;
  readTime: string;
  published: boolean;
  publishedAt: string;
  views: number;
  updatedAt?: string;
}
export type PostSummary = Omit<Post, "content">;

export interface Category {
  slug: string;
  name: string;
  description: string;
  orderIndex: number;
  showInNav: boolean;
  postCount?: number;
}

export interface Page {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
  modifiedAt?: string;
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
  content: string;
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
  adsPlacements: { top: boolean; bottom: boolean; left: boolean; right: boolean; inContent: boolean };
}

export interface PublicSettings extends SiteSettings {
  tutor: { enabled: boolean; provider: string; configured: boolean; model: string };
  nav: { slug: string; name: string }[];
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
  hasAnthropicKey?: boolean;
  hasGeminiKey?: boolean;
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

export interface Progress {
  completedLessons: string[];
  xp: number;
  streak: number;
  longestStreak: number;
  badges: Badge[];
  recentActivity: ActivityItem[];
  quizStats: { attempts: number; correct: number; total: number };
  totalLessons: number;
}

export interface SearchHit {
  type: "post" | "page" | "category";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface Leader {
  rank: number;
  id: number;
  name: string;
  avatarColor: string;
  xp: number;
  lessons: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  note?: string | null;
  provider?: string;
}

// ---- Admin -----------------------------------------------------------------

export interface AdminUser extends User {
  lessonsDone: number;
  xp: number;
}

export interface DayPoint {
  day: string;
  count: number;
}

export interface AdminStats {
  totals: {
    users: number;
    learners: number;
    admins: number;
    modules: number;
    lessons: number;
    posts: number;
    completions: number;
    quizAttempts: number;
    newMessages: number;
    messages: number;
    waitlist: number;
    subscribers: number;
    tutorChats: number;
    pageViews30d: number;
    activeUsers7d: number;
  };
  signups: DayPoint[];
  completions: DayPoint[];
  pageViews: DayPoint[];
  tutorUsage: DayPoint[];
  topLessons: { id: string; title: string; module_title: string; completions: number }[];
  moduleProgress: { id: string; title: string; lessons: number; completions: number }[];
  topPages: { path: string; views: number }[];
  recentUsers: User[];
  recentMessages: { id: number; first_name: string; last_name: string; email: string; message: string; status: string; created_at: string }[];
  goals: { goal: string; count: number }[];
  levels: { level: string; count: number }[];
}

export interface ContactMessage {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  profession: string;
  education: string;
  social: string;
  status: "new" | "read" | "replied" | "archived";
  adminNote: string;
  createdAt: string;
}

export interface WaitlistEntry {
  id: number;
  email: string;
  socialLink: string;
  phone: string;
  source: string;
  createdAt: string;
}

export interface Subscriber {
  id: number;
  email: string;
  status: string;
  createdAt: string;
}

export interface TutorLog {
  id: number;
  user: { name: string; email: string } | null;
  question: string;
  answer: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  createdAt: string;
}
