import { describe, expect, it } from "vitest";
import { isBlankCorrect, normalizeAnswer, parseBlanks, withGaps } from "@/lib/activities/blanks";

describe("parseBlanks", () => {
  it("splits text and blanks, with alternatives", () => {
    expect(parseBlanks("She [[has|'s]] lived here since [[2010]].")).toEqual([
      { kind: "text", text: "She " },
      { kind: "blank", index: 0, answers: ["has", "'s"] },
      { kind: "text", text: " lived here since " },
      { kind: "blank", index: 1, answers: ["2010"] },
      { kind: "text", text: "." },
    ]);
  });
});

describe("isBlankCorrect", () => {
  it("ignores case, extra spaces and curly apostrophes, but not spelling", () => {
    expect(isBlankCorrect("Has ", ["has"])).toBe(true);
    expect(isBlankCorrect("don’t", ["don't"])).toBe(true);
    expect(isBlankCorrect("do   not", ["don't", "do not"])).toBe(true);
    expect(isBlankCorrect("hass", ["has"])).toBe(false);
    expect(isBlankCorrect("", ["has"])).toBe(false);
  });

  it("normalizes answers", () => {
    expect(normalizeAnswer("  It’S  ")).toBe("it's");
  });
});

describe("withGaps", () => {
  it("shows blanks as ___", () => {
    expect(withGaps("I [[am]] here.")).toBe("I ___ here.");
  });
});
