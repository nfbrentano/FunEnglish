export type BlankSegment =
  { kind: "text"; text: string } | { kind: "blank"; index: number; answers: string[] };

const BLANK = /\[\[([^\]]+)\]\]/g;

/** "She [[has|'s]] lived here." → text, blank(has, 's), text. */
export function parseBlanks(text: string): BlankSegment[] {
  const segments: BlankSegment[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(BLANK)) {
    if (match.index > last) segments.push({ kind: "text", text: text.slice(last, match.index) });
    segments.push({
      kind: "blank",
      index: index++,
      answers: match[1]
        .split("|")
        .map((answer) => answer.trim())
        .filter(Boolean),
    });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

/** Case, extra spaces and curly apostrophes don't matter; spelling does. */
export function normalizeAnswer(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function isBlankCorrect(value: string, answers: readonly string[]): boolean {
  const normalized = normalizeAnswer(value);
  return normalized !== "" && answers.some((answer) => normalizeAnswer(answer) === normalized);
}

/** The sentence with every blank shown as "___", for the review list. */
export function withGaps(text: string): string {
  return text.replace(BLANK, "___");
}
