import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTIVITY_TYPES } from "@/lib/activities/schema/activity";
import { buildAiPrompt, parseAiAnswer, parseGuide } from "@/lib/admin/ai-prompt";
import { BLANK_CONTENT } from "@/lib/admin/templates";
import { StructuredEditor } from "@/components/admin/content/structured-editor";
import { render } from "@testing-library/react";

const guide = parseGuide(
  readFileSync(join(process.cwd(), "content/prompts/activities.md"), "utf8"),
);

describe("Create with AI (RF08, CA07)", () => {
  it("reads the prompt, the levels and every type from the guide", () => {
    expect(guide.prompt).toContain("You are an experienced ESL teacher");
    expect(Object.keys(guide.types).sort()).toEqual([...ACTIVITY_TYPES].sort());
    expect(guide.levels.beginner.cefr).toBe("A1–A2");
  });

  it("fills every placeholder with the request", () => {
    const prompt = buildAiPrompt(guide, {
      type: "flashcards",
      category: "vocabulary",
      level: "beginner",
      topic: "weather",
      count: 12,
    });
    expect(prompt).not.toMatch(/\{[A-Z_]+\}/);
    expect(prompt).toContain(
      "**flashcards** activity for the **vocabulary** category about **weather**",
    );
    expect(prompt).toContain("(A1–A2)");
    expect(prompt).toContain("Write exactly 12 cards.");
    // The template is a whole flashcards activity.
    const template = JSON.parse(prompt.slice(prompt.indexOf("{\n"), prompt.lastIndexOf("}") + 1));
    expect(template).toMatchObject({
      type: "flashcards",
      category: "vocabulary",
      levelMin: "beginner",
    });
    expect(template.content.cards[0].back.text).toBeTruthy();
  });

  it("turns the AI's answer into an AI draft pending review, even inside a code fence", () => {
    const prompt = buildAiPrompt(guide, {
      type: "quiz",
      category: "grammar",
      level: "intermediate",
      topic: "x",
    });
    const template = prompt.slice(prompt.indexOf("{\n"), prompt.lastIndexOf("}") + 1);
    const result = parseAiAnswer(`Here you go:\n\`\`\`json\n${template}\n\`\`\`\nEnjoy!`);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.activity).toMatchObject({
        status: "draft",
        origin: "ai",
        reviewStatus: "pending",
      });
  });

  it("explains invalid answers and saves nothing", () => {
    expect(parseAiAnswer("sorry, I can't")).toMatchObject({ ok: false });
    const invalid = parseAiAnswer('{"slug": "x", "type": "quiz"}');
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errors.length).toBeGreaterThan(0);
  });
});

describe("BLANK_CONTENT", () => {
  it.each(ACTIVITY_TYPES)("%s opens in the structured editor", (type) => {
    expect(() =>
      render(<StructuredEditor type={type} value={BLANK_CONTENT[type]} onChange={() => {}} />),
    ).not.toThrow();
  });
});
