import type { NoteCategory, RecurringIssue, StudentNote } from "./types";

/**
 * Normalizes text for comparison:
 * - Lowercase
 * - Normalize unicode arrows (→, ➔, =>) to "->"
 * - Trim and collapse multiple spaces
 * - Strip exterior punctuation (. , ; !)
 */
export function normalizeNoteKey(text: string, correction?: string): string {
  const raw = correction && correction.trim().length > 0 ? correction : text;
  return raw
    .toLowerCase()
    .replace(/[→➔➜]/g, "->")
    .replace(/=>/g, "->")
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:!?]+|[\s.,;:!?]+$/g, "")
    .trim();
}

/**
 * Derives a class/session bucket identifier for a note.
 * If note has a sessionId, uses that; otherwise uses YYYY-MM-DD of createdAt.
 */
export function getNoteClassIdentifier(note: StudentNote): string {
  if (note.sessionId && note.sessionId.trim().length > 0) {
    return `session:${note.sessionId.trim()}`;
  }
  const date = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `date:${yyyy}-${mm}-${dd}`;
}

export function formatClassDateLabel(note: StudentNote): string {
  const date = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Computes recurring issues (RF06, CA05, CT05).
 * Groups notes by normalized issue/correction and checks if they appeared
 * in 2 or more distinct classes/dates.
 */
export function findRecurringIssues(notes: StudentNote[]): RecurringIssue[] {
  // We exclude "strength" category from error recurrences unless it has a correction
  const issueNotes = notes.filter(
    (n) => n.category !== "strength" || (n.correction && n.correction.trim().length > 0),
  );

  const groups = new Map<
    string,
    {
      key: string;
      sampleText: string;
      sampleCorrection?: string;
      category: NoteCategory;
      classBuckets: Set<string>;
      dates: Set<string>;
      noteIds: string[];
    }
  >();

  for (const note of issueNotes) {
    const key = normalizeNoteKey(note.text, note.correction);
    if (!key) continue;

    const classId = getNoteClassIdentifier(note);
    const dateLabel = formatClassDateLabel(note);

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        sampleText: note.text,
        sampleCorrection: note.correction,
        category: note.category,
        classBuckets: new Set([classId]),
        dates: new Set([dateLabel]),
        noteIds: [note.id],
      });
    } else {
      existing.classBuckets.add(classId);
      existing.dates.add(dateLabel);
      existing.noteIds.push(note.id);
      if (!existing.sampleCorrection && note.correction) {
        existing.sampleCorrection = note.correction;
      }
    }
  }

  const results: RecurringIssue[] = [];
  for (const group of groups.values()) {
    // Only issues appearing in 2 or more different classes/dates
    if (group.classBuckets.size >= 2) {
      results.push({
        key: group.key,
        normalizedText: group.key,
        sampleText: group.sampleText,
        sampleCorrection: group.sampleCorrection,
        category: group.category,
        count: group.classBuckets.size,
        classDates: Array.from(group.dates),
        noteIds: group.noteIds,
      });
    }
  }

  // Sort by count descending, then key alphabetically
  return results.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
