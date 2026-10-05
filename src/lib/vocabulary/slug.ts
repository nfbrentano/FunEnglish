import type { CreateWordInput } from "./types";

/**
 * Normalizes a vocabulary term into a stable document ID (slug).
 * Ignores leading/trailing whitespace, case, accents/diacritics, and normalizes
 * non-alphanumeric separators into hyphens (RNF01, RF04, CA04).
 *
 * Examples:
 *   "Luggage" -> "luggage"
 *   " luggage " -> "luggage"
 *   "Boarding Pass" -> "boarding-pass"
 *   "maçã" -> "maca"
 */
export function normalizeWordId(term: string): string {
  const cleaned = term
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric to '-'
    .replace(/^-+|-+$/g, ""); // strip leading/trailing hyphens

  return cleaned || "word";
}

export interface WordValidationResult {
  valid: boolean;
  error?: string;
}

export function validateWordInput(input: CreateWordInput): WordValidationResult {
  const term = input.term?.trim();
  if (!term || term.length === 0) {
    return { valid: false, error: "Term is required (1-80 characters)." };
  }
  if (term.length > 80) {
    return { valid: false, error: "Term must be 80 characters or fewer." };
  }

  if (input.meaning && input.meaning.trim().length > 200) {
    return { valid: false, error: "Meaning must be 200 characters or fewer." };
  }

  if (input.example && input.example.trim().length > 200) {
    return { valid: false, error: "Example sentence must be 200 characters or fewer." };
  }

  return { valid: true };
}
