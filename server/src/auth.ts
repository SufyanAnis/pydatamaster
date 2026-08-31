import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { q } from "./db.js";
import { getSetting, setSetting } from "./settings.js";
import type { PublicUser, Role, UserStatus } from "./types.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export const COOKIE_NAME = "pdm_token";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

let cachedSecret: string | null = null;
export async function getJwtSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }
  let stored = await getSetting<string>("jwt_secret", "");
  if (!stored) {
    stored = crypto.randomBytes(48).toString("hex");
    await setSetting("jwt_secret", stored);
  }
  cachedSecret = stored;
  return cachedSecret;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  goal: string;
  level: string;
  status: UserStatus;
  avatar_color: string;
  created_at: string;
  last_login_at: string | null;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    goal: row.goal,
    level: row.level,
    status: row.status,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export function findUserById(id: number): Promise<UserRow | undefined> {
  return q.get<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
}

export function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return q.get<UserRow>("SELECT * FROM users WHERE lower(email) = lower(?)", [email]);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signToken(userId: number): Promise<string> {
  return jwt.sign({ sub: String(userId) }, await getJwtSecret(), { expiresIn: "30d" });
}

/**
 * Sets the login cookie. `secure` is enabled automatically when the request arrived over HTTPS
 * (directly or via a trusted proxy such as Railway/Render/Fly), and can be forced with COOKIE_SECURE=1.
 */
export function setAuthCookie(req: Request, res: Response, token: string): void {
  const https = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1" || https,
    maxAge: THIRTY_DAYS_MS,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

/** Reads the auth cookie (or Bearer header) and attaches req.user when valid. */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
  const token = (req.cookies?.[COOKIE_NAME] as string | undefined) || bearer;
  if (!token) {
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, await getJwtSecret()) as { sub?: string };
    const id = Number(payload.sub);
    if (Number.isFinite(id)) {
      const row = await findUserById(id);
      if (row && row.status === "active") req.user = toPublicUser(row);
    }
  } catch {
    // invalid/expired token: treat as anonymous
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Please log in to continue." });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Please log in to continue." });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  next();
}

export const AVATAR_COLORS = ["blue", "indigo", "emerald", "amber", "rose", "violet", "cyan", "orange"];
export function pickAvatarColor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
