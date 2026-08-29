import { Router } from "express";
import { z } from "zod";
import { db, nowIso } from "../db.js";
import {
  clearAuthCookie,
  findUserByEmail,
  findUserById,
  hashPassword,
  pickAvatarColor,
  requireAuth,
  setAuthCookie,
  signToken,
  toPublicUser,
  verifyPassword,
} from "../auth.js";
import { getSiteSettings } from "../settings.js";
import { computeProgress } from "../progress-service.js";

export const authRouter = Router();

const GOALS = ["Data Analyst", "Data Scientist", "Machine Learning Engineer", "Business Intelligence", "Academic Research"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(200),
  goal: z.string().trim().max(60).optional(),
  level: z.string().trim().max(30).optional(),
});

authRouter.post("/signup", async (req, res) => {
  const site = getSiteSettings();
  if (!site.features.signup) {
    res.status(403).json({ error: "Sign-ups are currently closed." });
    return;
  }
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid name, email and a password of at least 6 characters." });
    return;
  }
  const { name, email, password } = parsed.data;
  const goal = GOALS.includes(parsed.data.goal ?? "") ? parsed.data.goal! : GOALS[0];
  const level = LEVELS.includes(parsed.data.level ?? "") ? parsed.data.level! : LEVELS[0];
  if (findUserByEmail(email)) {
    res.status(409).json({ error: "An account with this email already exists. Try logging in." });
    return;
  }
  const now = nowIso();
  const result = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, goal, level, status, avatar_color, created_at, last_login_at)
       VALUES (?, ?, ?, 'learner', ?, ?, 'active', ?, ?, ?)`,
    )
    .run(name, email.toLowerCase(), await hashPassword(password), goal, level, pickAvatarColor(email), now, now);
  const id = Number(result.lastInsertRowid);
  db.prepare("INSERT INTO activity (user_id, type, ref_id, xp, created_at) VALUES (?, 'joined', NULL, 25, ?)").run(id, now);
  setAuthCookie(req, res, signToken(id));
  const row = findUserById(id)!;
  res.status(201).json({ user: toPublicUser(row), progress: computeProgress(id) });
});

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter your email and password." });
    return;
  }
  const row = findUserByEmail(parsed.data.email);
  if (!row || !(await verifyPassword(parsed.data.password, row.password_hash))) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }
  if (row.status !== "active") {
    res.status(403).json({ error: "This account has been suspended. Contact support." });
    return;
  }
  db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(nowIso(), row.id);
  setAuthCookie(req, res, signToken(row.id));
  res.json({ user: toPublicUser({ ...row, last_login_at: nowIso() }), progress: computeProgress(row.id) });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  if (!req.user) {
    res.json({ user: null, progress: null });
    return;
  }
  res.json({ user: req.user, progress: computeProgress(req.user.id) });
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  goal: z.string().trim().max(60).optional(),
  level: z.string().trim().max(30).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(200).optional(),
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile data." });
    return;
  }
  const row = findUserById(req.user!.id)!;
  const d = parsed.data;
  if (d.newPassword) {
    if (!d.currentPassword || !(await verifyPassword(d.currentPassword, row.password_hash))) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashPassword(d.newPassword), row.id);
  }
  const goal = d.goal && GOALS.includes(d.goal) ? d.goal : row.goal;
  const level = d.level && LEVELS.includes(d.level) ? d.level : row.level;
  db.prepare("UPDATE users SET name = ?, goal = ?, level = ? WHERE id = ?").run(d.name ?? row.name, goal, level, row.id);
  res.json({ user: toPublicUser(findUserById(row.id)!) });
});

authRouter.get("/options", (_req, res) => {
  res.json({ goals: GOALS, levels: LEVELS });
});
