import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatIssuePath, validateActivity, MAX_ACTIVITY_BYTES } from "@/lib/activities/validate";
import { validQuiz } from "./fixtures";

function withChanges(changes: (a: ReturnType<typeof validQuiz>) => void) {
  const activity = validQuiz();
  changes(activity);
  return activity;
}

describe("validateActivity", () => {
  it("accepts a complete activity and applies defaults", () => {
    const result = validateActivity(validQuiz());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.activity).toMatchObject({
      schemaVersion: 1,
      status: "draft",
      featured: false,
      tags: [],
    });
    expect(result.activity.type).toBe("quiz");
  });

  it("rejects content that does not match the type", () => {
    const result = validateActivity(
      withChanges((a) => {
        a.content = { cards: [{ front: { text: "cat" }, back: { text: "gato" } }] };
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([expect.stringMatching(/^content\.questions/)]),
    });
  });

  it("points at the question without a correct option", () => {
    const result = validateActivity(
      withChanges((a) => {
        (
          a.content as { questions: { options: { correct?: boolean }[] }[] }
        ).questions[0].options[0].correct = false;
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      errors: ["content.questions[0].options: Each question needs at least one correct option"],
    });
  });

  it("requires alt text on images", () => {
    const result = validateActivity(
      withChanges((a) => (a.thumbnail = { src: "/x.webp", alt: " ", source: "ai" })),
    );

    expect(result).toMatchObject({ ok: false, errors: ["thumbnail.alt: Images need alt text"] });
  });

  it.each([
    ["an unknown category", (a: Record<string, unknown>) => (a.category = "cooking"), "category"],
    [
      "an inverted level range",
      (a: Record<string, unknown>) => (a.levelMax = "beginner"),
      "levelMax",
    ],
    ["an invalid slug", (a: Record<string, unknown>) => (a.slug = "Present Perfect!"), "slug"],
  ])("rejects %s", (_, change, field) => {
    const result = validateActivity(withChanges(change));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(new RegExp(`^${field}:`));
  });

  it("rejects activities above the size limit", () => {
    const result = validateActivity(
      withChanges((a) => (a.description = "x".repeat(MAX_ACTIVITY_BYTES))),
    );
    expect(result).toMatchObject({ ok: false, errors: [expect.stringMatching(/limit is 200 KB/)] });
  });

  it("rejects fill-blanks items without blanks and quiz boards with too few clues", () => {
    const fillBlanks = validateActivity(
      withChanges((a) => {
        a.type = "fill-blanks";
        a.content = { mode: "typing", items: [{ text: "No blanks here." }] };
      }),
    );
    expect(fillBlanks).toMatchObject({
      ok: false,
      errors: [expect.stringMatching(/^content\.items\[0\]\.text: .*\[\[answer\]\]/)],
    });

    const clue = { value: 100, question: "Q", answer: "A" };
    const board = validateActivity(
      withChanges((a) => {
        a.type = "quiz-board";
        a.content = {
          categories: [
            { name: "A", clues: [clue, clue] },
            { name: "B", clues: [clue, clue, clue] },
            { name: "C", clues: [clue, clue, clue] },
          ],
        };
      }),
    );
    expect(board).toMatchObject({
      ok: false,
      errors: [expect.stringMatching(/^content\.categories\[0\]\.clues:/)],
    });
  });
});

describe("formatIssuePath", () => {
  it("formats array indexes with brackets", () => {
    expect(formatIssuePath(["content", "questions", 2, "options"])).toBe(
      "content.questions[2].options",
    );
  });
});

describe("content/activities", () => {
  const dir = join(process.cwd(), "content", "activities");
  const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) =>
    f.endsWith(".json"),
  );

  it.each(files)("%s is valid", (file) => {
    const result = validateActivity(JSON.parse(readFileSync(join(dir, file), "utf8")));
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
