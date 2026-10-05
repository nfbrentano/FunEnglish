import { describe, expect, it } from "vitest";
import { consolidatePortalNotes } from "@/lib/portal/consolidate";
import type { StudentNote } from "@/lib/notes/types";

describe("consolidatePortalNotes (spec 03: RF04, RF06, CA03, CA05, CT03)", () => {
  it("filters out private notes and separates strengths from review issues (CA03)", () => {
    const notes: StudentNote[] = [
      {
        id: "n1",
        studentId: "s1",
        category: "strength",
        text: "Great pronunciation of th- sounds",
        visibility: "shared",
        resolved: false,
        createdAt: new Date("2026-10-01T10:00:00Z"),
        updatedAt: new Date("2026-10-01T10:00:00Z"),
      },
      {
        id: "n2",
        studentId: "s1",
        category: "strength",
        text: "Excellent vocabulary on travel topic",
        visibility: "shared",
        resolved: false,
        createdAt: new Date("2026-10-02T10:00:00Z"),
        updatedAt: new Date("2026-10-02T10:00:00Z"),
      },
      {
        id: "n3",
        studentId: "s1",
        category: "grammar",
        text: "in the Monday",
        correction: "in the Monday → on Monday",
        visibility: "shared",
        resolved: false,
        createdAt: new Date("2026-10-01T10:00:00Z"),
        updatedAt: new Date("2026-10-01T10:00:00Z"),
      },
      {
        id: "n4",
        studentId: "s1",
        category: "pronunciation",
        text: "island with silent s",
        visibility: "shared",
        resolved: false,
        createdAt: new Date("2026-10-02T10:00:00Z"),
        updatedAt: new Date("2026-10-02T10:00:00Z"),
      },
      {
        id: "n5",
        studentId: "s1",
        category: "vocabulary",
        text: "make homework",
        correction: "make homework → do homework",
        visibility: "shared",
        resolved: false,
        createdAt: new Date("2026-10-03T10:00:00Z"),
        updatedAt: new Date("2026-10-03T10:00:00Z"),
      },
      // Private note (must be completely excluded, CA03)
      {
        id: "n6",
        studentId: "s1",
        category: "general",
        text: "Student was sleepy and distracted today",
        visibility: "private",
        resolved: false,
        createdAt: new Date("2026-10-03T10:00:00Z"),
        updatedAt: new Date("2026-10-03T10:00:00Z"),
      },
    ];

    const result = consolidatePortalNotes(notes);

    // 2 strengths
    expect(result.strengths).toHaveLength(2);
    expect(result.strengths.map((s) => s.id)).toEqual(["n1", "n2"]);

    // 3 toReview, none private
    expect(result.toReview).toHaveLength(3);
    expect(result.toReview.some((i) => i.text.includes("sleepy"))).toBe(false);

    // Mastered is empty
    expect(result.mastered).toHaveLength(0);
  });

  it("consolidates recurring errors and moves them to Mastered only when ALL occurrences are resolved (CA05)", () => {
    // "he go → he goes" in 3 classes
    const notes: StudentNote[] = [
      {
        id: "n1",
        studentId: "s1",
        category: "grammar",
        text: "he go",
        correction: "he go → he goes",
        visibility: "shared",
        resolved: true, // 1 resolved
        sessionId: "sess-1",
        createdAt: new Date("2026-10-01T10:00:00Z"),
        updatedAt: new Date("2026-10-01T10:00:00Z"),
      },
      {
        id: "n2",
        studentId: "s1",
        category: "grammar",
        text: "he go",
        correction: "he go → he goes",
        visibility: "shared",
        resolved: false, // 2 unresolved
        sessionId: "sess-2",
        createdAt: new Date("2026-10-02T10:00:00Z"),
        updatedAt: new Date("2026-10-02T10:00:00Z"),
      },
      {
        id: "n3",
        studentId: "s1",
        category: "grammar",
        text: "he go",
        correction: "he go → he goes",
        visibility: "shared",
        resolved: false, // 3 unresolved
        sessionId: "sess-3",
        createdAt: new Date("2026-10-03T10:00:00Z"),
        updatedAt: new Date("2026-10-03T10:00:00Z"),
      },
    ];

    // Scenario 1: 1 resolved, 2 unresolved -> Still in "To review" with count = 3 (CA05)
    const result1 = consolidatePortalNotes(notes);
    expect(result1.toReview).toHaveLength(1);
    expect(result1.toReview[0]?.count).toBe(3);
    expect(result1.toReview[0]?.correction).toBe("he go → he goes");
    expect(result1.mastered).toHaveLength(0);

    // Scenario 2: Teacher marks all 3 resolved -> moves to "Mastered ✓" (CA05)
    const allResolvedNotes = notes.map((n) => ({ ...n, resolved: true }));
    const result2 = consolidatePortalNotes(allResolvedNotes);
    expect(result2.toReview).toHaveLength(0);
    expect(result2.mastered).toHaveLength(1);
    expect(result2.mastered[0]?.count).toBe(3);
    expect(result2.mastered[0]?.correction).toBe("he go → he goes");
  });
});
