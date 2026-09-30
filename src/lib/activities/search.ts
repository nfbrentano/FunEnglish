/** Lowercases and strips accents: "Café" → "cafe". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Words of the title and tags, normalized and deduplicated, for the `searchTokens` field. */
export function buildSearchTokens(title: string, tags: readonly string[] = []): string[] {
  const words = [title, ...tags]
    .flatMap((text) => normalizeText(text).split(/[^a-z0-9]+/))
    .filter((word) => word.length >= 2);
  return [...new Set(words)];
}
