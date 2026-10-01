// Build-time only (server components during `next build`): reads content/pages and renders
// Markdown to HTML, so the browser downloads no Markdown parser.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";
import { z } from "zod";

const PAGES_DIR = join(process.cwd(), "content", "pages");

const meta = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  updated: z.iso.date(),
});

export type MarkdownPage = z.infer<typeof meta> & { html: string };

/** Splits `---` front matter (simple `key: value` lines) from the body. */
export function parseFrontMatter(source: string): { data: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source.replace(/\r\n/g, "\n"));
  if (!match) return { data: {}, body: source };
  const data = Object.fromEntries(
    match[1]
      .split("\n")
      .filter((line) => line.includes(":"))
      .map((line) => {
        const i = line.indexOf(":");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
  return { data, body: match[2] };
}

export const renderMarkdown = (markdown: string) => marked.parse(markdown, { async: false });

export function parseMarkdownPage(source: string): MarkdownPage {
  const { data, body } = parseFrontMatter(source);
  return { ...meta.parse(data), html: renderMarkdown(body) };
}

export function loadMarkdownPage(name: "about" | "privacy" | "terms"): MarkdownPage {
  return parseMarkdownPage(readFileSync(join(PAGES_DIR, `${name}.md`), "utf8"));
}

const faqSchema = meta.extend({
  questions: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1),
});

export type Faq = z.infer<typeof meta> & { questions: { question: string; html: string }[] };

export function loadFaq(): Faq {
  const { questions, ...rest } = faqSchema.parse(
    JSON.parse(readFileSync(join(PAGES_DIR, "faq.json"), "utf8")),
  );
  return {
    ...rest,
    questions: questions.map(({ question, answer }) => ({
      question,
      html: renderMarkdown(answer),
    })),
  };
}

/** "2026-10-01" → "October 1, 2026" (fixed time zone: the date is a calendar day). */
export function formatUpdated(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
