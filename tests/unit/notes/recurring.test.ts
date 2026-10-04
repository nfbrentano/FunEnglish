import { describe, expect, it } from "vitest";
import { findRecurringIssues, normalizeNoteKey } from "@/lib/notes/recurring";
import type { StudentNote } from "@/lib/notes/types";

describe("normalizeNoteKey", () => {
  it("normalizes unicode arrows and case", () => {
    expect(normalizeNoteKey("he go → he goes")).toBe("he go -> he goes");
    expect(normalizeNoteKey("he go => he goes")).toBe("he go -> he goes");
    expect(normalizeNoteKey("HE GO -> HE GOES")).toBe("he go -> he goes");
  });

  it("trims and collapses extra whitespace", () => {
    expect(normalizeNoteKey("  said   thought   with /f/   ")).toBe("said thought with /f/");
  });

  it("prioritizes correction when provided", () => {
    expect(normalizeNoteKey("Pronunciation mistake", "thought → /θɔːt/")).toBe("thought -> /θɔːt/");
  });

  it("removes trailing and leading punctuation", () => {
    expect(normalizeNoteKey("...said 'she don't'!")).toBe("said 'she don't'");
  });
});

describe("findRecurringIssues (CA05, CT05)", () => {
  const baseNote: Omit<StudentNote, "id" | "text" | "correction" | "sessionId" | "createdAt"> = {
    studentId: "s1",
    category: "grammar",
    visibility: "private",
    resolved: false,
    updatedAt: new Date(),
  };

  it("identifies error appearing in 2 different class sessions as recurring (CA05)", () => {
    const notes: StudentNote[] = [
      {
        ...baseNote,
        id: "n1",
        text: "he go → he goes",
        correction: "he go → he goes",
        sessionId: "sess-1",
        createdAt: new Date("2026-10-01T10:00:00Z"),
      },
      {
        ...baseNote,
        id: "n2",
        text: "He go -> he goes",
        correction: "he go -> he goes",
        sessionId: "sess-2",
        createdAt: new Date("2026-10-03T10:00:00Z"),
      },
    ];

    const recurring = findRecurringIssues(notes);
    expect(recurring).toHaveLength(1);
    expect(recurring[0].count).toBe(2);
    expect(recurring[0].key).toBe("he go -> he goes");
  });

  it("identifies error appearing on 2 different calendar dates without session IDs", () => {
    const notes: StudentNote[] = [
      {
        ...baseNote,
        id: "n1",
        text: "thought → /θɔːt/",
        createdAt: new Date("2026-10-01T14:00:00Z"),
      },
      {
        ...baseNote,
        id: "n2",
        text: "thought -> /θɔːt/",
        createdAt: new Date("2026-10-04T15:00:00Z"),
      },
    ];

    const recurring = findRecurringIssues(notes);
    expect(recurring).toHaveLength(1);
    expect(recurring[0].count).toBe(2);
  });

  it("does NOT mark as recurring if recorded twice within the same class/session", () => {
    const notes: StudentNote[] = [
      {
        ...baseNote,
        id: "n1",
        text: "said she don't",
        sessionId: "sess-1",
        createdAt: new Date("2026-10-01T10:00:00Z"),
      },
      {
        ...baseNote,
        id: "n2",
        text: "said she don't",
        sessionId: "sess-1",
        createdAt: new Date("2026-10-01T10:30:00Z"),
      },
    ];

    const recurring = findRecurringIssues(notes);
    expect(recurring).toHaveLength(0);
  });

  it("ignores strength notes without corrections", () => {
    const notes: StudentNote[] = [
      {
        ...baseNote,
        id: "n1",
        category: "strength",
        text: "Great leadership",
        sessionId: "sess-1",
        createdAt: new Date("2026-10-01T10:00:00Z"),
      },
      {
        ...baseNote,
        id: "n2",
        category: "strength",
        text: "Great leadership",
        sessionId: "sess-2",
        createdAt: new Date("2026-10-02T10:00:00Z"),
      },
    ];

    expect(findRecurringIssues(notes)).toHaveLength(0);
  });
});
