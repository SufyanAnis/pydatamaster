import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { completeLesson, computeProgress, recordPlaygroundRun, recordQuiz } from "../progress-service.js";
import { db } from "../db.js";

export const progressRouter = Router();

progressRouter.use(requireAuth);

progressRouter.get("/", (req, res) => {
  res.json({ progress: computeProgress(req.user!.id) });
});

progressRouter.post("/complete", (req, res) => {
  const parsed = z.object({ lessonId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "lessonId is required" });
    return;
  }
  try {
    const result = completeLesson(req.user!.id, parsed.data.lessonId);
    res.json({ ...result, progress: computeProgress(req.user!.id) });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Could not record progress" });
  }
});

progressRouter.post("/quiz", (req, res) => {
  const parsed = z
    .object({ lessonId: z.string().min(1), score: z.number().int().min(0), total: z.number().int().min(1) })
    .safeParse(req.body);
  if (!parsed.success || parsed.data.score > parsed.data.total) {
    res.status(400).json({ error: "Invalid quiz result" });
    return;
  }
  const result = recordQuiz(req.user!.id, parsed.data.lessonId, parsed.data.score, parsed.data.total);
  res.json({ ...result, progress: computeProgress(req.user!.id) });
});

progressRouter.post("/playground-run", (req, res) => {
  recordPlaygroundRun(req.user!.id);
  res.json({ progress: computeProgress(req.user!.id) });
});

progressRouter.get("/leaderboard", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.avatar_color, COALESCE(SUM(a.xp), 0) AS xp, COUNT(DISTINCT p.lesson_id) AS lessons
       FROM users u
       LEFT JOIN activity a ON a.user_id = u.id
       LEFT JOIN progress p ON p.user_id = u.id
       WHERE u.status = 'active'
       GROUP BY u.id ORDER BY xp DESC, lessons DESC LIMIT 10`,
    )
    .all() as Record<string, any>[];
  res.json({
    leaders: rows.map((r, i) => ({ rank: i + 1, id: Number(r.id), name: String(r.name), avatarColor: String(r.avatar_color), xp: Number(r.xp), lessons: Number(r.lessons) })),
  });
});
