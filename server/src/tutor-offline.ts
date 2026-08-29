import { loadModules } from "./content.js";

const STOP = new Set(
  "the a an and or of to in on for with is are be how do does what why when which can i my me you your it this that from using use into about please explain help show tell give".split(" "),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, " ")
    .split(" ")
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/**
 * A dependable fallback tutor that answers from the curriculum when no AI provider is configured.
 * It finds the lessons most relevant to the question and returns their explanation and code.
 */
export function offlineTutorAnswer(question: string, context?: { lessonTitle?: string; code?: string }): string {
  const q = question.trim();
  const qTokens = tokens(q);
  const greeting = /^(hi|hello|hey|salam|assalam|yo|good (morning|evening|afternoon))\b/i.test(q);
  if (greeting && qTokens.length <= 3) {
    return "Hi! I'm PyData Tutor. Ask me about NumPy, Pandas, Matplotlib or Scikit-Learn - for example *\"How do I drop missing values?\"* or *\"What is broadcasting?\"*";
  }

  const modules = loadModules();
  const scored: { score: number; moduleTitle: string; moduleId: string; lesson: (typeof modules)[number]["lessons"][number] }[] = [];
  for (const m of modules) {
    for (const l of m.lessons) {
      const hay = `${l.title} ${l.summary} ${l.content}`.toLowerCase();
      const titleHay = l.title.toLowerCase();
      let score = 0;
      for (const t of qTokens) {
        if (titleHay.includes(t)) score += 4;
        if (hay.includes(t)) score += 1;
        if (l.codeExample.toLowerCase().includes(t)) score += 1;
      }
      if (context?.lessonTitle && l.title === context.lessonTitle) score += 2;
      if (score > 0) scored.push({ score, moduleTitle: m.title, moduleId: m.id, lesson: l });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return [
      "I couldn't match that to a lesson yet. Here are a few things I can help with:",
      "",
      "- **NumPy**: creating arrays, vectorized math, indexing, broadcasting, statistics",
      "- **Pandas**: DataFrames, selecting/filtering, cleaning, groupby, merging",
      "- **Matplotlib**: line, scatter, bar and histogram plots, subplots",
      "- **Scikit-Learn**: train/test split, regression, classification, evaluation",
      "",
      "Try rephrasing with a library or function name (e.g. `groupby`, `fillna`, `plt.scatter`).",
      context?.code ? "\n_Tip: I can see your code. Ask about a specific line or error message._" : "",
    ].join("\n");
  }

  const top = scored[0];
  const lesson = top.lesson;
  const firstParagraph = lesson.content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("```"))
    .slice(0, 2)
    .join("\n\n");
  const snippet = lesson.codeExample.split("\n").slice(0, 12).join("\n");
  const related = scored
    .slice(1, 3)
    .map((s) => `- [${s.lesson.title}](/lesson/${s.moduleId}/${s.lesson.id}) (${s.moduleTitle})`)
    .join("\n");

  return [
    `**${lesson.title}** - _${top.moduleTitle}_`,
    "",
    lesson.summary,
    "",
    firstParagraph,
    "",
    "```python",
    snippet,
    "```",
    "",
    `Open the full lesson: [${lesson.title}](/lesson/${top.moduleId}/${lesson.id})`,
    related ? `\nRelated lessons:\n${related}` : "",
    "",
    "_Offline tutor mode: connect an AI provider in Admin -> Settings for conversational answers._",
  ].join("\n");
}
