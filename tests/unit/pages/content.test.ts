import { describe, expect, it } from "vitest";
import {
  formatUpdated,
  loadFaq,
  loadMarkdownPage,
  parseFrontMatter,
  parseMarkdownPage,
} from "@/lib/pages/content";
import { homeHighlights } from "@/lib/catalog/sections";
import type { CatalogItem } from "@/lib/catalog/schema";

describe("content/pages", () => {
  it("parses front matter and renders Markdown", () => {
    const page = parseMarkdownPage(
      "---\ntitle: T\ndescription: D: with colon\nupdated: 2026-10-01\n---\n\n## Hi\n\n**bold** [x](/y)",
    );
    expect(page).toMatchObject({ title: "T", description: "D: with colon", updated: "2026-10-01" });
    expect(page.html).toContain("<h2>Hi</h2>");
    expect(page.html).toContain('<a href="/y">x</a>');
    expect(parseFrontMatter("no front matter").data).toEqual({});
  });

  it("rejects a page without its Last updated date", () => {
    expect(() => parseMarkdownPage("---\ntitle: T\ndescription: D\n---\nBody")).toThrow();
  });

  it.each(["about", "privacy", "terms"] as const)("%s.md is valid", (name) => {
    const page = loadMarkdownPage(name);
    expect(page.html.length).toBeGreaterThan(500);
    expect(formatUpdated(page.updated)).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
  });

  it("the Privacy Policy covers the minimum topics (RF07, CA04)", () => {
    const text = loadMarkdownPage("privacy").html.toLowerCase();
    for (const topic of [
      "name",
      "email",
      "photo",
      "favorite",
      "recently played",
      "contact form",
      "firebase",
      "google cloud",
      "youtube",
      "lgpd",
      "gdpr",
      "access",
      "correct",
      "delete",
      "sell your data",
      "nfgbrentano@gmail.com",
    ]) {
      expect(text, topic).toContain(topic);
    }
  });

  it("the FAQ has questions with rendered answers", () => {
    const faq = loadFaq();
    expect(faq.questions.length).toBeGreaterThanOrEqual(5);
    expect(faq.questions[1].html).toContain("<strong>favorites</strong>");
  });
});

describe("homeHighlights", () => {
  const item = (id: string, createdAt: string, featured = false) =>
    ({ id, createdAt, featured }) as CatalogItem;

  it("puts featured first, then fills with the newest", () => {
    const items = [
      item("old-featured", "2026-01-01T00:00:00.000Z", true),
      item("a", "2026-09-01T00:00:00.000Z"),
      item("b", "2026-09-02T00:00:00.000Z"),
      item("new-featured", "2026-08-01T00:00:00.000Z", true),
      item("c", "2026-09-03T00:00:00.000Z"),
    ];
    expect(homeHighlights(items, 4).map((i) => i.id)).toEqual([
      "new-featured",
      "old-featured",
      "c",
      "b",
    ]);
  });
});
