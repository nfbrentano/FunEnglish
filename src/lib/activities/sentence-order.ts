// Sentence Builder (SDD/2026-10-05_15-atividade-ordenar-frases.md): pieces, shuffling and checking.
// Pure functions, shared by the schema, the player, the admin editor and the live room.
import { shuffled } from "@/components/player/plugins/shuffle";
import { normalizeAnswer } from "./blanks";

export type SentenceOrderItem = {
  sentence: string;
  chunks?: string[];
  alternatives?: string[];
};

/** The final punctuation stays fixed at the end of the line, not a piece (D02). */
const FINAL_PUNCTUATION = /\s*[.!?]+$/;

export const finalPunctuation = (sentence: string) =>
  /[.!?]+$/.exec(sentence.trim())?.[0] ?? "";

export const withoutFinalPunctuation = (text: string) => text.trim().replace(FINAL_PUNCTUATION, "");

/** "Split by words": one piece per word; contractions ("doesn't") stay one piece (D01). */
export const splitByWords = (sentence: string) =>
  withoutFinalPunctuation(sentence).split(/\s+/).filter(Boolean);

/** The item's pieces in the correct order: the manual split, or one per word. */
export function chunksOf(item: SentenceOrderItem): string[] {
  const manual = item.chunks?.map((chunk) => chunk.trim()).filter(Boolean);
  return manual && manual.length > 0 ? manual : splitByWords(item.sentence);
}

/**
 * Capitals, extra spaces, curly apostrophes, commas and the final punctuation don't count (RF03):
 * "she doesn't like coffee" matches "She doesn't like coffee."
 */
export const normalizeSentence = (text: string) =>
  normalizeAnswer(withoutFinalPunctuation(text).replace(/,/g, " "));

/** The words of a sentence, sorted: two orders of the same pieces have the same bag of words. */
export const wordBag = (text: string) => normalizeSentence(text).split(" ").sort().join(" ");

export const acceptedSentences = (item: SentenceOrderItem) => [
  item.sentence,
  ...(item.alternatives ?? []),
];

/** Whether the pieces, in this order, make the sentence or one of its alternatives (RF03). */
export function isCorrectOrder(given: readonly string[], item: SentenceOrderItem): boolean {
  const answer = normalizeSentence(given.join(" "));
  return (
    answer !== "" && acceptedSentences(item).some((s) => normalizeSentence(s) === answer)
  );
}

/** Which positions hold a piece that isn't the one of the main sentence there (to highlight). */
export function misplaced(given: readonly string[], item: SentenceOrderItem): boolean[] {
  const correct = chunksOf(item).map(normalizeAnswer);
  return given.map((piece, i) => normalizeAnswer(piece) !== correct[i]);
}

/**
 * A random order of the pieces (as indexes into `chunksOf(item)`) that never makes an accepted
 * sentence, so nobody starts with the answer (RF02). Only a sentence with no other order (all
 * pieces the same) comes back as it is.
 */
export function shuffleChunks(item: SentenceOrderItem, random: () => number = Math.random): number[] {
  const chunks = chunksOf(item);
  const indexes = chunks.map((_, i) => i);
  const solved = (order: number[]) => isCorrectOrder(order.map((i) => chunks[i]), item);
  for (let attempt = 0; attempt < 10; attempt++) {
    const order = shuffled(indexes, random);
    if (!solved(order)) return order;
  }
  // Unlucky (or tiny) sentence: rotating moves every piece.
  for (let k = 1; k < indexes.length; k++) {
    const rotated = [...indexes.slice(k), ...indexes.slice(0, k)];
    if (!solved(rotated)) return rotated;
  }
  return indexes;
}
