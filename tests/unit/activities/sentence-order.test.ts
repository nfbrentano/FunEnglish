import { describe, expect, it } from "vitest";
import {
  chunksOf,
  finalPunctuation,
  isCorrectOrder,
  misplaced,
  shuffleChunks,
  splitByWords,
} from "@/lib/activities/sentence-order";
import { validateActivity } from "@/lib/activities/validate";
import { validQuiz } from "./fixtures";

/** Repeatable "random" numbers (mulberry32), so shuffles are deterministic (RNF05). */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const sentenceOrder = (items: unknown[]) =>
  validateActivity({ ...validQuiz(), type: "sentence-order", content: { items } });

describe("pieces", () => {
  it("splits by words, keeps contractions whole and leaves the final punctuation out (D01, D02)", () => {
    expect(splitByWords("She doesn't like coffee.")).toEqual(["She", "doesn't", "like", "coffee"]);
    expect(finalPunctuation("Do you like tea?")).toBe("?");
    expect(finalPunctuation("No punctuation")).toBe("");
  });

  it("uses the manual split when there is one", () => {
    expect(
      chunksOf({ sentence: "We drink a lot of water.", chunks: ["We", "drink", "a lot of", "water"] }),
    ).toEqual(["We", "drink", "a lot of", "water"]);
  });
});

describe("checking (CT03)", () => {
  const item = { sentence: "She doesn't like coffee." };

  it("ignores the first capital and the final punctuation (CA03)", () => {
    expect(isCorrectOrder(["she", "doesn't", "like", "coffee"], item)).toBe(true);
    expect(isCorrectOrder(["She", "doesn’t", "like", "coffee."], item)).toBe(true);
    expect(isCorrectOrder(["coffee", "doesn't", "like", "she"], item)).toBe(false);
    expect(isCorrectOrder([], item)).toBe(false);
  });

  it("accepts the alternatives (CA04)", () => {
    const withAlt = { sentence: "I went home yesterday.", alternatives: ["Yesterday, I went home."] };
    expect(isCorrectOrder(["Yesterday", "I", "went", "home"], withAlt)).toBe(true);
    expect(isCorrectOrder(["I", "went", "home", "yesterday"], withAlt)).toBe(true);
    expect(isCorrectOrder(["home", "I", "went", "yesterday"], withAlt)).toBe(false);
  });

  it("marks the pieces out of place", () => {
    expect(misplaced(["She", "like", "doesn't", "coffee"], item)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});

describe("shuffling (CT02)", () => {
  it("never starts in an accepted order, whatever the seed", () => {
    const items = [
      { sentence: "She doesn't like coffee." },
      { sentence: "I go." },
      { sentence: "I went home yesterday.", alternatives: ["Yesterday I went home."] },
      { sentence: "the cat and the dog" },
    ];
    for (const item of items) {
      for (let seed = 0; seed < 200; seed++) {
        const chunks = chunksOf(item);
        const order = shuffleChunks(item, seeded(seed));
        expect([...order].sort()).toEqual(chunks.map((_, i) => i));
        expect(isCorrectOrder(order.map((i) => chunks[i]), item)).toBe(false);
      }
    }
  });

  it("is repeatable with the same seed", () => {
    const item = { sentence: "We always eat breakfast at seven." };
    expect(shuffleChunks(item, seeded(7))).toEqual(shuffleChunks(item, seeded(7)));
  });
});

describe("schema (CA01, CT01)", () => {
  it("accepts a sentence with pieces, alternatives, hint, translation and media", () => {
    const result = sentenceOrder([
      { sentence: "She doesn't like coffee.", translation: "Ela não gosta de café.", hint: "do" },
      {
        sentence: "We drink a lot of water.",
        chunks: ["We", "drink", "a lot of", "water"],
        alternatives: ["A lot of water we drink."],
        media: { kind: "tts", text: "We drink a lot of water." },
      },
    ]);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("refuses a sentence with a single piece, with a clear message", () => {
    const result = sentenceOrder([{ sentence: "Hello." }]);
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.errors.join(" ")).toContain(
      "A sentence needs at least two pieces to put in order",
    );
  });

  it("refuses pieces that don't make the sentence, alternatives with other words and > 14 pieces", () => {
    const wrongChunks = sentenceOrder([{ sentence: "I like tea.", chunks: ["I", "love", "tea"] }]);
    expect(wrongChunks.ok ? "" : wrongChunks.errors.join(" ")).toContain(
      "The pieces must make the sentence, in order",
    );
    const wrongAlt = sentenceOrder([{ sentence: "I like tea.", alternatives: ["Tea I love."] }]);
    expect(wrongAlt.ok ? "" : wrongAlt.errors.join(" ")).toContain(
      "An alternative must use the same words",
    );
    const long = sentenceOrder([{ sentence: Array.from({ length: 15 }, (_, i) => `w${i}`).join(" ") }]);
    expect(long.ok).toBe(false);
  });
});
