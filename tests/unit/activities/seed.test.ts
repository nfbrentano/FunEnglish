import { describe, expect, it } from "vitest";
import { prepareSeed } from "@/lib/activities/seed";
import { validQuiz } from "./fixtures";

const file = (path: string, data: unknown) => ({ path, contents: JSON.stringify(data) });

describe("prepareSeed", () => {
  it("marks files under ai/ as AI-generated and pending review", () => {
    const { activities, errors } = prepareSeed([file("ai/grammar/quiz.json", validQuiz())]);

    expect(errors).toEqual([]);
    expect(activities[0].doc).toMatchObject({ origin: "ai", reviewStatus: "pending" });
  });

  it("treats other files as human-made and reviewed, and keeps explicit values", () => {
    const { activities } = prepareSeed([
      file("grammar/quiz.json", validQuiz()),
      file("ai/grammar/other.json", { ...validQuiz(), slug: "other", reviewStatus: "reviewed" }),
    ]);

    expect(activities[0].doc).toMatchObject({ origin: "human", reviewStatus: "reviewed" });
    expect(activities[1].doc).toMatchObject({ origin: "ai", reviewStatus: "reviewed" });
  });

  it("adds search tokens from title and tags", () => {
    const { activities } = prepareSeed([
      file("a.json", { ...validQuiz(), title: "Café & Idioms", tags: ["Food"] }),
    ]);

    expect(activities[0].doc.searchTokens).toEqual(["cafe", "idioms", "food"]);
  });

  it("reports invalid files with their path and keeps the valid ones", () => {
    const broken = { ...validQuiz(), slug: "broken", type: "quiz", content: { cards: [] } };
    const { activities, errors } = prepareSeed([
      file("ai/grammar/ok.json", validQuiz()),
      file("ai/grammar/broken.json", broken),
      { path: "ai/grammar/not-json.json", contents: "{ nope" },
    ]);

    expect(activities.map((a) => a.path)).toEqual(["ai/grammar/ok.json"]);
    expect(errors.map((e) => e.path)).toEqual([
      "ai/grammar/broken.json",
      "ai/grammar/not-json.json",
    ]);
    expect(errors[0].messages[0]).toMatch(/^content\.questions/);
    expect(errors[1].messages[0]).toMatch(/^Invalid JSON/);
  });

  it("rejects a slug used by an earlier file", () => {
    const { activities, errors } = prepareSeed([
      file("a.json", validQuiz()),
      file("b.json", validQuiz()),
    ]);

    expect(activities).toHaveLength(1);
    expect(errors).toEqual([
      { path: "b.json", messages: ['slug: "present-perfect-quiz" is already used by a.json'] },
    ]);
  });
});
