import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db, nowIso } from "../db.js";
import { getSiteSettings, getTutorSettings } from "../settings.js";
import { offlineTutorAnswer } from "../tutor-offline.js";
import type { TutorSettings } from "../types.js";

export const tutorRouter = Router();

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "model"]),
        text: z.string().max(8000),
      }),
    )
    .min(1)
    .max(40),
  context: z
    .object({
      lessonTitle: z.string().max(200).optional(),
      moduleTitle: z.string().max(200).optional(),
      code: z.string().max(12000).optional(),
      page: z.string().max(200).optional(),
    })
    .optional(),
});

type ChatMessage = z.infer<typeof chatSchema>["messages"][number];

const buckets = new Map<string, number[]>();
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) return true;
  list.push(now);
  buckets.set(key, list);
  return false;
}

function buildSystemPrompt(settings: TutorSettings, context?: z.infer<typeof chatSchema>["context"]): string {
  const parts = [settings.systemPrompt.trim()];
  if (context?.moduleTitle || context?.lessonTitle) {
    parts.push(`The learner is currently on the lesson "${context.lessonTitle ?? ""}" in the module "${context.moduleTitle ?? ""}".`);
  }
  if (context?.page) parts.push(`Current page: ${context.page}.`);
  if (context?.code) parts.push(`The learner's current code is:\n\n\`\`\`python\n${context.code}\n\`\`\``);
  return parts.join("\n\n");
}

export interface TutorResult {
  reply: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

const EFFORT_CAPABLE = /^claude-(fable-5|opus-5|sonnet-5|opus-4-[678]|sonnet-4-6)/;

export async function askAnthropic(settings: TutorSettings, system: string, messages: ChatMessage[]): Promise<TutorResult> {
  const client = new Anthropic({ apiKey: settings.anthropicApiKey });
  const model = settings.anthropicModel || "claude-opus-5";
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: Math.max(256, Math.min(4096, settings.maxTokens || 1024)),
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: messages.map((m): Anthropic.MessageParam => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
  };
  if (EFFORT_CAPABLE.test(model)) {
    (params as Anthropic.MessageCreateParamsNonStreaming & { output_config?: { effort: string } }).output_config = { effort: "medium" };
  }
  const response = await client.messages.create(params);
  if (response.stop_reason === "refusal") {
    return { reply: "I can't help with that particular request, but I'm happy to help with anything about Python data science.", provider: "anthropic", model, tokensIn: response.usage.input_tokens, tokensOut: response.usage.output_tokens };
  }
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return {
    reply: text || "I'm sorry, I couldn't generate a response at this time.",
    provider: "anthropic",
    model,
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
  };
}

export async function askGemini(settings: TutorSettings, system: string, messages: ChatMessage[]): Promise<TutorResult> {
  const model = settings.geminiModel || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.geminiApiKey)}`;
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.7, maxOutputTokens: Math.max(256, Math.min(4096, settings.maxTokens || 1024)) },
  };
  const resp = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw Object.assign(new Error(`Gemini API error ${resp.status}: ${detail.slice(0, 300)}`), { status: resp.status });
  }
  const data = (await resp.json()) as any;
  const text: string = (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("").trim();
  return {
    reply: text || "I'm sorry, I couldn't generate a response at this time.",
    provider: "gemini",
    model,
    tokensIn: Number(data?.usageMetadata?.promptTokenCount) || 0,
    tokensOut: Number(data?.usageMetadata?.candidatesTokenCount) || 0,
  };
}

export async function runTutor(messages: ChatMessage[], context?: z.infer<typeof chatSchema>["context"]): Promise<TutorResult & { note?: string }> {
  const settings = getTutorSettings();
  const system = buildSystemPrompt(settings, context);
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";

  const offline = (note?: string) => ({
    reply: offlineTutorAnswer(lastUser, { lessonTitle: context?.lessonTitle, code: context?.code }),
    provider: "offline",
    model: "curriculum-search",
    tokensIn: 0,
    tokensOut: 0,
    note,
  });

  if (settings.provider === "offline") return offline();
  if (settings.provider === "anthropic") {
    if (!settings.anthropicApiKey) return offline("Anthropic API key not configured; answered from the curriculum.");
    try {
      return await askAnthropic(settings, system, messages);
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) return offline("Anthropic API key is invalid; answered from the curriculum.");
      if (err instanceof Anthropic.RateLimitError) return offline("AI provider is rate-limited right now; answered from the curriculum.");
      if (err instanceof Anthropic.APIError) return offline(`AI provider error (${err.status}); answered from the curriculum.`);
      return offline("AI provider unreachable; answered from the curriculum.");
    }
  }
  if (settings.provider === "gemini") {
    if (!settings.geminiApiKey) return offline("Gemini API key not configured; answered from the curriculum.");
    try {
      return await askGemini(settings, system, messages);
    } catch (err: any) {
      return offline(`AI provider error${err?.status ? ` (${err.status})` : ""}; answered from the curriculum.`);
    }
  }
  return offline();
}

tutorRouter.post("/chat", async (req, res) => {
  const site = getSiteSettings();
  const tutor = getTutorSettings();
  if (!site.features.aiTutor || !tutor.enabled) {
    res.status(503).json({ error: "The AI Tutor is currently disabled." });
    return;
  }
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid chat payload." });
    return;
  }
  const key = req.user ? `u:${req.user.id}` : `ip:${req.ip}`;
  if (rateLimited(key, req.user ? 40 : 15, 10 * 60 * 1000)) {
    res.status(429).json({ error: "You're sending messages quickly - please wait a few minutes and try again." });
    return;
  }
  // Keep only the last 12 turns to bound token usage.
  const messages = parsed.data.messages.slice(-12);
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";
  const result = await runTutor(messages, parsed.data.context);
  db.prepare(
    "INSERT INTO tutor_logs (user_id, question, answer, provider, model, tokens_in, tokens_out, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(req.user?.id ?? null, lastUser.slice(0, 2000), result.reply.slice(0, 6000), result.provider, result.model, result.tokensIn, result.tokensOut, nowIso());
  res.json({ reply: result.reply, provider: result.provider, model: result.model, note: result.note ?? null });
});
