import { describe, expect, it } from "vitest";
import { collectTextFields, describePath, setAtPath, slugify } from "@/lib/admin/content-fields";

const content = {
  questions: [
    {
      prompt: "She ___ to school.",
      media: { kind: "image", src: "/images/a.webp", alt: "A school" },
      options: [{ text: "goes", correct: true }, { text: "go" }],
    },
  ],
};

describe("collectTextFields", () => {
  it("lists every human text with its path, skipping technical keys", () => {
    expect(collectTextFields(content)).toEqual([
      { path: ["questions", 0, "prompt"], value: "She ___ to school." },
      { path: ["questions", 0, "media", "alt"], value: "A school" },
      { path: ["questions", 0, "options", 0, "text"], value: "goes" },
      { path: ["questions", 0, "options", 1, "text"], value: "go" },
    ]);
  });

  it("ignores numbers and booleans", () => {
    expect(collectTextFields({ value: 100, correct: true })).toEqual([]);
  });
});

describe("setAtPath", () => {
  it("replaces one value without mutating the original", () => {
    const next = setAtPath(content, ["questions", 0, "options", 1, "text"], "went");
    expect(next.questions[0].options[1].text).toBe("went");
    expect(content.questions[0].options[1].text).toBe("go");
    expect(Array.isArray(next.questions)).toBe(true);
    expect(next.questions[0].media).toBe(content.questions[0].media);
  });
});

describe("describePath", () => {
  it("turns paths into readable labels", () => {
    expect(describePath(["questions", 2, "options", 0, "text"])).toBe(
      "Question 3 · Option 1 · text",
    );
    expect(describePath(["categories", 0, "clues", 1, "answer"])).toBe(
      "Category 1 · Clue 2 · answer",
    );
    expect(describePath(["cards", 0, "followUps", 1])).toBe("Card 1 · Follow up 2");
  });
});

describe("slugify", () => {
  it("builds lowercase hyphen slugs", () => {
    expect(slugify("Present Perfect Quiz!")).toBe("present-perfect-quiz");
    expect(slugify("  Café & Música  ")).toBe("cafe-musica");
  });
});
