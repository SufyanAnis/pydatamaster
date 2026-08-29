import { Router } from "express";
import { z } from "zod";
import { db, nowIso } from "../db.js";

export const formsRouter = Router();

// Very small in-memory throttle to keep bots from flooding the inbox.
const recent = new Map<string, number[]>();
function throttled(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (recent.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) return true;
  list.push(now);
  recent.set(key, list);
  return false;
}

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email().max(160),
  message: z.string().trim().min(5).max(5000),
  profession: z.string().trim().max(120).optional().default(""),
  education: z.string().trim().max(120).optional().default(""),
  social: z.string().trim().max(300).optional().default(""),
  website: z.string().max(0).optional(), // honeypot
});

formsRouter.post("/contact", (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete the required fields with valid values." });
    return;
  }
  if (throttled(`contact:${req.ip}`, 5, 10 * 60 * 1000)) {
    res.status(429).json({ error: "Too many messages. Please try again later." });
    return;
  }
  const d = parsed.data;
  db.prepare(
    `INSERT INTO messages (first_name, last_name, email, message, profession, education, social, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
  ).run(d.firstName, d.lastName, d.email, d.message, d.profession, d.education, d.social, nowIso());
  res.status(201).json({ ok: true });
});

const waitlistSchema = z.object({
  email: z.string().trim().email().max(160),
  socialLink: z.string().trim().max(300).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  source: z.string().trim().max(40).optional().default("playground"),
});

formsRouter.post("/waitlist", (req, res) => {
  const parsed = waitlistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  if (throttled(`waitlist:${req.ip}`, 5, 10 * 60 * 1000)) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }
  const d = parsed.data;
  db.prepare("INSERT INTO waitlist (email, social_link, phone, source, created_at) VALUES (?, ?, ?, ?, ?)").run(
    d.email.toLowerCase(),
    d.socialLink,
    d.phone,
    d.source,
    nowIso(),
  );
  res.status(201).json({ ok: true });
});

formsRouter.post("/subscribe", (req, res) => {
  const parsed = z.object({ email: z.string().trim().email().max(160) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  if (throttled(`subscribe:${req.ip}`, 5, 10 * 60 * 1000)) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }
  db.prepare("INSERT INTO subscribers (email, status, created_at) VALUES (?, 'active', ?) ON CONFLICT(email) DO UPDATE SET status = 'active'").run(
    parsed.data.email.toLowerCase(),
    nowIso(),
  );
  res.status(201).json({ ok: true });
});
