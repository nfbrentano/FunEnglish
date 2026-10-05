import {
  formatClassDateLabel,
  getNoteClassIdentifier,
  normalizeNoteKey,
} from "@/lib/notes/recurring";
import type { StudentNote } from "@/lib/notes/types";
import type { ConsolidatedError, ConsolidatedPortalFeedback } from "./types";

/**
 * Consolidates student notes for the Student Portal (RF04, RF06, CA03, CA05).
 * - "Strengths": shared notes with category "strength"
 * - "To review": non-strength shared errors where at least one occurrence is unresolved.
 *   Consolidated so identical errors appear once with count of distinct classes ("seen in X classes").
 * - "Mastered ✓": errors where ALL occurrences have been marked resolved.
 */
export function consolidatePortalNotes(notes: StudentNote[]): ConsolidatedPortalFeedback {
  // Portal only considers shared notes
  const sharedNotes = notes.filter((n) => n.visibility === "shared");

  // 1. Strengths
  const strengths = sharedNotes.filter((n) => n.category === "strength");

  // 2. Issues / Errors
  const issueNotes = sharedNotes.filter((n) => n.category !== "strength");

  const groups = new Map<
    string,
    {
      key: string;
      sampleText: string;
      sampleCorrection?: string;
      category: StudentNote["category"];
      classBuckets: Set<string>;
      dates: Set<string>;
      notes: StudentNote[];
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
        notes: [note],
      });
    } else {
      existing.classBuckets.add(classId);
      existing.dates.add(dateLabel);
      existing.notes.push(note);
      if (!existing.sampleCorrection && note.correction) {
        existing.sampleCorrection = note.correction;
      }
    }
  }

  const toReview: ConsolidatedError[] = [];
  const mastered: ConsolidatedError[] = [];

  for (const group of groups.values()) {
    const allResolved = group.notes.every((n) => n.resolved);
    const item: ConsolidatedError = {
      key: group.key,
      text: group.sampleText,
      correction: group.sampleCorrection,
      category: group.category,
      count: group.classBuckets.size,
      classDates: Array.from(group.dates),
      resolved: allResolved,
      notes: group.notes,
    };

    if (allResolved) {
      mastered.push(item);
    } else {
      toReview.push(item);
    }
  }

  // Sort toReview by count descending, then key
  toReview.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  mastered.sort((a, b) => a.key.localeCompare(b.key));

  return {
    strengths,
    toReview,
    mastered,
  };
}
