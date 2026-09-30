import { describe, expect, it } from "vitest";
import { buildSearchTokens, normalizeText } from "@/lib/activities/search";

describe("buildSearchTokens", () => {
  it("normalizes accents and case and drops symbols", () => {
    expect(buildSearchTokens("Café & Idioms")).toEqual(["cafe", "idioms"]);
  });

  it("includes tags without duplicates", () => {
    expect(buildSearchTokens("Phrasal Verbs 4", ["verbs", "Phrasal verbs"])).toEqual([
      "phrasal",
      "verbs",
    ]);
  });

  it("normalizes free text for matching", () => {
    expect(normalizeText("Pronúncia")).toBe("pronuncia");
  });
});
