import { describe, expect, it } from "vitest";
import { normalizeWordId, validateWordInput } from "@/lib/vocabulary/slug";

describe("normalizeWordId (RF04, RNF01, CA04)", () => {
  it("normalizes basic words to lowercase trimmed", () => {
    expect(normalizeWordId("Luggage")).toBe("luggage");
    expect(normalizeWordId(" luggage ")).toBe("luggage");
  });

  it("handles multi-word terms with hyphens", () => {
    expect(normalizeWordId("boarding pass")).toBe("boarding-pass");
    expect(normalizeWordId("  Boarding   Pass  ")).toBe("boarding-pass");
  });

  it("strips accents and diacritics", () => {
    expect(normalizeWordId("maçã")).toBe("maca");
    expect(normalizeWordId("café")).toBe("cafe");
    expect(normalizeWordId("Cartão de Embarque")).toBe("cartao-de-embarque");
  });

  it("handles punctuation and special characters safely", () => {
    expect(normalizeWordId("apple / pear")).toBe("apple-pear");
    expect(normalizeWordId("state-of-the-art")).toBe("state-of-the-art");
    expect(normalizeWordId("don't")).toBe("don-t");
  });

  it("falls back to 'word' for empty or non-alphanumeric input", () => {
    expect(normalizeWordId("")).toBe("word");
    expect(normalizeWordId("   ")).toBe("word");
    expect(normalizeWordId("???")).toBe("word");
  });
});

describe("validateWordInput (RF01)", () => {
  it("validates valid input", () => {
    const res = validateWordInput({
      term: "boarding pass",
      meaning: "cartão de embarque",
      example: "Show your boarding pass.",
    });
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("fails if term is empty or missing", () => {
    expect(validateWordInput({ term: "" }).valid).toBe(false);
    expect(validateWordInput({ term: "   " }).valid).toBe(false);
  });

  it("fails if term exceeds 80 characters", () => {
    const longTerm = "a".repeat(81);
    expect(validateWordInput({ term: longTerm }).valid).toBe(false);
  });

  it("fails if meaning exceeds 200 characters", () => {
    const longMeaning = "m".repeat(201);
    expect(validateWordInput({ term: "hello", meaning: longMeaning }).valid).toBe(false);
  });

  it("fails if example exceeds 200 characters", () => {
    const longExample = "e".repeat(201);
    expect(validateWordInput({ term: "hello", example: longExample }).valid).toBe(false);
  });
});
