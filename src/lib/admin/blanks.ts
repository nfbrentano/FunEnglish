// Fill-in-the-blanks text helpers for the structured editor (spec: gestão completa, RF02).
// A blank is written [[answer]] or [[answer|alternative|...]].

export type Segment = { kind: "text"; text: string } | { kind: "blank"; answers: string[] };

const BLANK = /\[\[([^\]]+)\]\]/g;

export function parseBlanks(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(BLANK)) {
    if (match.index > last) segments.push({ kind: "text", text: text.slice(last, match.index) });
    segments.push({ kind: "blank", answers: match[1].split("|").map((a) => a.trim()) });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

export function joinBlanks(segments: readonly Segment[]): string {
  return segments
    .map((s) => (s.kind === "text" ? s.text : `[[${s.answers.filter(Boolean).join("|")}]]`))
    .join("");
}

export const blankAnswers = (text: string) =>
  parseBlanks(text).flatMap((s) => (s.kind === "blank" ? [s.answers] : []));

/**
 * Turns the selected characters into a blank. Surrounding spaces stay outside the blank, and a
 * selection that touches an existing blank is ignored.
 */
export function makeBlank(text: string, start: number, end: number): string {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  const selected = text.slice(from, to);
  const word = selected.trim();
  if (!word || /\[\[|\]\]|[[\]|]/.test(word)) return text;
  const lead = selected.length - selected.trimStart().length;
  const trail = selected.length - selected.trimEnd().length;
  // Inside an existing blank?
  const before = text.slice(0, from);
  if (before.lastIndexOf("[[") > before.lastIndexOf("]]")) return text;
  return `${text.slice(0, from + lead)}[[${word}]]${text.slice(to - trail)}`;
}

/** Replaces the answers of the n-th blank. */
export function setBlankAnswers(text: string, index: number, answers: string[]): string {
  let n = -1;
  return joinBlanks(
    parseBlanks(text).map((s) =>
      s.kind === "blank" && ++n === index ? { kind: "blank", answers } : s,
    ),
  );
}

/** Puts the n-th blank's main answer back as plain text. */
export function removeBlank(text: string, index: number): string {
  let n = -1;
  return joinBlanks(
    parseBlanks(text).map((s) =>
      s.kind === "blank" && ++n === index ? { kind: "text", text: s.answers[0] ?? "" } : s,
    ),
  );
}
