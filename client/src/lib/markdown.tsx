import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { highlight, escapeHtml } from "./highlight";
import { cn } from "./utils";

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code(this: unknown, token: { text: string; lang?: string }) {
      const lang = (token.lang || "").trim().split(/\s+/)[0];
      const label = lang || "code";
      return `<div class="md-code not-prose"><div class="md-code-bar"><span>${escapeHtml(label)}</span></div><pre><code class="language-${escapeHtml(label)}">${highlight(token.text, lang)}</code></pre></div>`;
    },
  },
});

export function renderMarkdown(md: string): string {
  const html = marked.parse(md || "", { async: false }) as string;
  return DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] });
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className={cn("prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:before:content-none prose-code:after:content-none", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
