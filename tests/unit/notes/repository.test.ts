import { describe, expect, it } from "vitest";
import {
  groupNotesByClassDate,
  resolveDefaultVisibility,
  validateCategory,
  validateCorrection,
  validateNoteText,
} from "@/lib/notes/repository";
import type { StudentNote } from "@/lib/notes/types";

describe("Notes validation (CA09, CT09)", () => {
  it("accepts valid note text and trims whitespace", () => {
    expect(validateNoteText("  Valid note text  ")).toBe("Valid note text");
  });

  it("rejects empty or whitespace-only text (CA09)", () => {
    expect(() => validateNoteText("")).toThrow("Note text cannot be empty");
    expect(() => validateNoteText("   \n\t  ")).toThrow("Note text cannot be empty");
  });

  it("rejects text longer than 500 characters (CA09)", () => {
    const longText = "a".repeat(501);
    expect(() => validateNoteText(longText)).toThrow("cannot exceed 500 characters");
  });

  it("validates optional correction length", () => {
    expect(validateCorrection("said X -> should be Y")).toBe("said X -> should be Y");
    expect(validateCorrection("")).toBeUndefined();
    expect(validateCorrection(undefined)).toBeUndefined();
    expect(() => validateCorrection("b".repeat(501))).toThrow("cannot exceed 500 characters");
  });

  it("validates category is one of allowed enum", () => {
    expect(validateCategory("pronunciation")).toBe("pronunciation");
    expect(validateCategory("grammar")).toBe("grammar");
    expect(validateCategory("strength")).toBe("strength");
    expect(() => validateCategory("invalid-category")).toThrow("Invalid note category");
  });
});

describe("resolveDefaultVisibility (RF08, CA01, CA02)", () => {
  it("defaults strength to shared (CA02)", () => {
    expect(resolveDefaultVisibility("strength")).toBe("shared");
  });

  it("defaults pronunciation and errors to private (CA01)", () => {
    expect(resolveDefaultVisibility("pronunciation")).toBe("private");
    expect(resolveDefaultVisibility("grammar")).toBe("private");
    expect(resolveDefaultVisibility("vocabulary")).toBe("private");
    expect(resolveDefaultVisibility("fluency")).toBe("private");
    expect(resolveDefaultVisibility("general")).toBe("private");
  });

  it("respects explicit visibility when provided", () => {
    expect(resolveDefaultVisibility("strength", "private")).toBe("private");
    expect(resolveDefaultVisibility("grammar", "shared")).toBe("shared");
  });
});

describe("groupNotesByClassDate (RF04, CA03, CT03)", () => {
  it("groups notes by date and sorts descending from newest to oldest", () => {
    const notes: StudentNote[] = [
      {
        id: "n1",
        studentId: "s1",
        category: "grammar",
        text: "Oldest note",
        visibility: "private",
        resolved: false,
        createdAt: new Date("2026-09-20T10:00:00Z"),
        updatedAt: new Date("2026-09-20T10:00:00Z"),
      },
      {
        id: "n2",
        studentId: "s1",
        category: "grammar",
        text: "Middle note",
        visibility: "private",
        resolved: false,
        createdAt: new Date("2026-09-25T14:00:00Z"),
        updatedAt: new Date("2026-09-25T14:00:00Z"),
      },
      {
        id: "n3",
        studentId: "s1",
        category: "grammar",
        text: "Newest note A",
        visibility: "private",
        resolved: false,
        createdAt: new Date("2026-10-02T09:00:00Z"),
        updatedAt: new Date("2026-10-02T09:00:00Z"),
      },
      {
        id: "n4",
        studentId: "s1",
        category: "grammar",
        text: "Newest note B",
        visibility: "private",
        resolved: false,
        createdAt: new Date("2026-10-02T11:00:00Z"),
        updatedAt: new Date("2026-10-02T11:00:00Z"),
      },
    ];

    const grouped = groupNotesByClassDate(notes);
    expect(grouped).toHaveLength(3);

    // Group 0 should be Oct 2
    expect(grouped[0].notes).toHaveLength(2);
    expect(grouped[0].notes[0].id).toBe("n4"); // sorted newest inside group
    expect(grouped[0].notes[1].id).toBe("n3");

    // Group 1 should be Sep 25
    expect(grouped[1].notes[0].id).toBe("n2");

    // Group 2 should be Sep 20
    expect(grouped[2].notes[0].id).toBe("n1");
  });
});
