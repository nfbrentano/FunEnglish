import { describe, expect, it } from "vitest";
import { stepFontSize } from "@/lib/board/text-style";

describe("stepFontSize (RF06, CA06, CA15, CT07)", () => {
  it("CT07 / CA06: steps font size up and down along discrete scale", () => {
    // 24 -> +1: 28
    expect(stepFontSize(24, 1)).toBe(28);
    // 28 -> -1: 24
    expect(stepFontSize(28, -1)).toBe(24);
  });

  it("CT07 / CA15: saturates at upper and lower boundaries", () => {
    // 96 -> +1: 96 (upper limit)
    expect(stepFontSize(96, 1)).toBe(96);
    // 12 -> -1: 12 (lower limit)
    expect(stepFontSize(12, -1)).toBe(12);
  });

  it("CT07: jumps to nearest step when current font size is not on scale", () => {
    // 25 -> +1: next step above 25 is 28
    expect(stepFontSize(25, 1)).toBe(28);
    // 25 -> -1: previous step below 25 is 24
    expect(stepFontSize(25, -1)).toBe(24);
  });
});
