import { db, nowIso } from "./db.js";
import { loadModules } from "./content.js";
import type { ActivityItem, Badge, ProgressSummary } from "./types.js";

type Row = Record<string, any>;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function shiftDay(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function computeStreaks(userId: number): { streak: number; longestStreak: number; activeDays: number } {
  const rows = db
    .prepare("SELECT DISTINCT substr(created_at, 1, 10) AS day FROM activity WHERE user_id = ? ORDER BY day DESC")
    .all(userId) as Row[];
  const days = rows.map((r) => String(r.day));
  if (days.length === 0) return { streak: 0, longestStreak: 0, activeDays: 0 };

  const today = dayKey(nowIso());
  const yesterday = shiftDay(today, -1);
  let streak = 0;
  let cursor = days[0] === today ? today : days[0] === yesterday ? yesterday : null;
  if (cursor) {
    const set = new Set(days);
    while (set.has(cursor)) {
      streak++;
      cursor = shiftDay(cursor, -1);
    }
  }

  let longest = 1;
  let run = 1;
  const asc = [...days].sort();
  for (let i = 1; i < asc.length; i++) {
    if (shiftDay(asc[i - 1], 1) === asc[i]) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return { streak, longestStreak: Math.max(longest, streak), activeDays: days.length };
}

export function computeProgress(userId: number): ProgressSummary {
  const completedRows = db.prepare("SELECT lesson_id, completed_at FROM progress WHERE user_id = ? ORDER BY completed_at").all(userId) as Row[];
  const completed = completedRows.map((r) => String(r.lesson_id));
  const completedSet = new Set(completed);
  const xpRow = db.prepare("SELECT COALESCE(SUM(xp), 0) AS xp FROM activity WHERE user_id = ?").get(userId) as Row;
  const quizRow = db
    .prepare("SELECT COUNT(*) AS attempts, COALESCE(SUM(score), 0) AS correct, COALESCE(SUM(total), 0) AS total FROM quiz_attempts WHERE user_id = ?")
    .get(userId) as Row;
  const perfectQuiz = db
    .prepare("SELECT created_at FROM quiz_attempts WHERE user_id = ? AND total >= 2 AND score = total ORDER BY created_at LIMIT 1")
    .get(userId) as Row | undefined;
  const { streak, longestStreak } = computeStreaks(userId);

  const modules = loadModules();
  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const completedAt = (id: string) => completedRows.find((r) => r.lesson_id === id)?.completed_at ?? null;

  const badges: Badge[] = [];
  const first = completedRows[0]?.completed_at ?? null;
  badges.push({ id: "first-steps", name: "First Steps", description: "Complete your first lesson", icon: "Footprints", earned: completed.length >= 1, earnedAt: first });
  badges.push({
    id: "getting-serious",
    name: "Getting Serious",
    description: "Complete 5 lessons",
    icon: "Flame",
    earned: completed.length >= 5,
    earnedAt: completedRows[4]?.completed_at ?? null,
  });
  for (const m of modules) {
    if (m.lessons.length === 0) continue;
    const done = m.lessons.every((l) => completedSet.has(l.id));
    const last = done ? m.lessons.map((l) => completedAt(l.id)).filter(Boolean).sort().pop() ?? null : null;
    badges.push({ id: `module-${m.id}`, name: `${m.library || m.title} Master`, description: `Finish every lesson in ${m.title}`, icon: m.icon, earned: done, earnedAt: last });
  }
  badges.push({ id: "quiz-ace", name: "Quiz Ace", description: "Score 100% on a knowledge check", icon: "Award", earned: !!perfectQuiz, earnedAt: perfectQuiz?.created_at ?? null });
  badges.push({ id: "streak-3", name: "On a Roll", description: "Learn 3 days in a row", icon: "Zap", earned: longestStreak >= 3 });
  badges.push({ id: "streak-7", name: "Unstoppable", description: "Learn 7 days in a row", icon: "Trophy", earned: longestStreak >= 7 });
  badges.push({
    id: "completionist",
    name: "Completionist",
    description: "Complete the entire curriculum",
    icon: "Crown",
    earned: totalLessons > 0 && completed.length >= totalLessons,
  });

  const recent = db.prepare("SELECT id, type, ref_id, xp, created_at FROM activity WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 12").all(userId) as Row[];
  const recentActivity: ActivityItem[] = recent.map((r) => ({ id: Number(r.id), type: String(r.type), refId: r.ref_id ?? null, xp: Number(r.xp) || 0, createdAt: String(r.created_at) }));

  return {
    completedLessons: completed,
    xp: Number(xpRow?.xp) || 0,
    streak,
    longestStreak,
    badges,
    recentActivity,
    quizStats: { attempts: Number(quizRow?.attempts) || 0, correct: Number(quizRow?.correct) || 0, total: Number(quizRow?.total) || 0 },
    totalLessons,
  };
}

export function completeLesson(userId: number, lessonId: string): { alreadyDone: boolean; xpAwarded: number } {
  const lesson = db.prepare("SELECT id, xp FROM lessons WHERE id = ?").get(lessonId) as Row | undefined;
  if (!lesson) throw Object.assign(new Error("Lesson not found"), { status: 404 });
  const existing = db.prepare("SELECT 1 FROM progress WHERE user_id = ? AND lesson_id = ?").get(userId, lessonId);
  if (existing) return { alreadyDone: true, xpAwarded: 0 };
  const now = nowIso();
  const xp = Number(lesson.xp) || 50;
  db.prepare("INSERT INTO progress (user_id, lesson_id, completed_at) VALUES (?, ?, ?)").run(userId, lessonId, now);
  db.prepare("INSERT INTO activity (user_id, type, ref_id, xp, created_at) VALUES (?, 'lesson', ?, ?, ?)").run(userId, lessonId, xp, now);
  return { alreadyDone: false, xpAwarded: xp };
}

export function recordQuiz(userId: number, lessonId: string, score: number, total: number): { xpAwarded: number } {
  const now = nowIso();
  db.prepare("INSERT INTO quiz_attempts (user_id, lesson_id, score, total, created_at) VALUES (?, ?, ?, ?, ?)").run(userId, lessonId, score, total, now);
  const perfect = total >= 1 && score === total;
  const xp = 5 + (perfect ? 20 : 0);
  db.prepare("INSERT INTO activity (user_id, type, ref_id, xp, created_at) VALUES (?, ?, ?, ?, ?)").run(userId, perfect ? "quiz_perfect" : "quiz", lessonId, xp, now);
  return { xpAwarded: xp };
}

export function recordPlaygroundRun(userId: number): void {
  const today = nowIso().slice(0, 10);
  const already = db.prepare("SELECT 1 FROM activity WHERE user_id = ? AND type = 'playground' AND substr(created_at,1,10) = ?").get(userId, today);
  if (already) return;
  db.prepare("INSERT INTO activity (user_id, type, ref_id, xp, created_at) VALUES (?, 'playground', NULL, 10, ?)").run(userId, nowIso());
}
