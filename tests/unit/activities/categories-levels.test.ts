import { describe, expect, it } from "vitest";
import { CATEGORIES, getCategory } from "@/lib/activities/categories";
import { levelInRange, levelLabel } from "@/lib/activities/levels";

describe("CATEGORIES", () => {
  it("lists the 9 categories in catalog order with every field", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      "fun",
      "grammar",
      "listening",
      "pictures",
      "reading",
      "speaking",
      "videos",
      "vocabulary",
      "writing",
    ]);
    for (const category of CATEGORIES) {
      expect(category.name).not.toBe("");
      expect(category.subtitle).not.toBe("");
      expect(category.icon).not.toBe("");
      expect(category.color).toMatch(/^var\(--cat-/);
    }
  });

  it("finds a category by id", () => {
    expect(getCategory("speaking")?.subtitle).toBe("Conversation practice");
    expect(getCategory("cooking")).toBeUndefined();
  });
});

describe("levelLabel", () => {
  it.each([
    ["beginner", "beginner", "Beg"],
    ["beginner", "intermediate", "Beg–Inter"],
    ["beginner", "advanced", "All levels"],
    ["intermediate", "intermediate", "Inter"],
    ["intermediate", "advanced", "Inter–Adv"],
    ["advanced", "advanced", "Adv"],
  ] as const)("%s–%s → %s", (min, max, label) => {
    expect(levelLabel(min, max)).toBe(label);
  });

  it("rejects an inverted range", () => {
    expect(() => levelLabel("advanced", "beginner")).toThrow(RangeError);
  });
});

describe("levelInRange", () => {
  it("includes the bounds and excludes levels outside", () => {
    expect(levelInRange("intermediate", "beginner", "intermediate")).toBe(true);
    expect(levelInRange("advanced", "beginner", "intermediate")).toBe(false);
  });
});
