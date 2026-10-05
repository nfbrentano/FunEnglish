import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn();
const mockDoc = vi.fn((...args: any[]) => {
  const path = args.slice(1).join("/");
  return { path, id: args[args.length - 1] || "mock-doc-id" };
});
const mockCollection = vi.fn((...args: any[]) => ({ path: args.slice(1).join("/") }));
const mockQuery = vi.fn((...args: any[]) => args[0]);
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock("firebase/firestore", () => ({
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  limit: (...args: any[]) => mockLimit(...args),
}));

vi.mock("@/lib/firebase", () => ({
  getDb: vi.fn().mockReturnValue({}),
}));

import * as vocabMod from "@/lib/vocabulary/repository";
import {
  createSession,
  discardSession,
  endSession,
  getActiveSession,
  getPastSessions,
  updateSession,
} from "@/lib/session/repository";
import type { ClassroomSession, SessionEndReviewData } from "@/lib/session/types";

describe("Classroom Session Repository (SDD/2026-10-03_08-sessao-de-aula.md)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSession sets initial attendance to present for all class students (RF01, RF04, CA01)", async () => {
    mockDoc.mockReturnValueOnce({ id: "session-123", path: "users/teacher-1/sessions/session-123" });

    const session = await createSession("teacher-1", "class-1", "Teens B1", [
      "student-1",
      "student-2",
      "student-3",
    ]);

    expect(session.id).toBe("session-123");
    expect(session.className).toBe("Teens B1");
    expect(session.status).toBe("active");
    expect(session.attendance).toEqual({
      "student-1": true,
      "student-2": true,
      "student-3": true,
    });
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "active",
        classId: "class-1",
        className: "Teens B1",
        attendance: {
          "student-1": true,
          "student-2": true,
          "student-3": true,
        },
      }),
    );
  });

  it("endSession publishes summaries only for present students, with only their own notes (RF08, CA06, CA07, CA11)", async () => {
    const recordVocabSpy = vi
      .spyOn(vocabMod, "recordSessionVocabulary")
      .mockResolvedValue(undefined);

    const session: ClassroomSession = {
      id: "session-456",
      teacherUid: "teacher-1",
      classId: "c1",
      className: "Teens B1",
      startedAt: new Date("2026-10-04T14:00:00Z"),
      status: "active",
      attendance: { "ana-id": true, "bruno-id": false },
      activitiesPlayed: [{ id: "act-1", title: "Some or Any", timestamp: 1000 }],
      newWords: [{ term: "magnificent" }],
      notes: [],
    };

    const reviewData: SessionEndReviewData = {
      attendance: { "ana-id": true, "bruno-id": false }, // Ana present, Bruno absent (CA07)
      activities: [{ id: "act-1", title: "Some or Any", timestamp: 1000 }],
      words: [{ term: "magnificent" }],
      boardText: "Notes on whiteboard",
      classNotes: "Great job everyone!",
      durationMinutes: 45,
      notes: [
        // Ana has a shared note
        {
          id: "note-ana",
          studentId: "ana-id",
          category: "strength",
          text: "Excellent fluency today",
          visibility: "shared",
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Bruno has a shared note
        {
          id: "note-bruno",
          studentId: "bruno-id",
          category: "pronunciation",
          text: "Practice th sounds",
          visibility: "shared",
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    await endSession("teacher-1", session, reviewData);

    // 1. Session is marked ended
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "ended",
        durationMinutes: 45,
      }),
    );

    // 2. Ana is present -> received class doc in students/ana-id/classes/session-456
    // Bruno is absent -> does NOT receive class doc (CA07)
    const setDocCalls = mockSetDoc.mock.calls;
    const anaClassCall = setDocCalls.find(
      (c) => c[0].path === "students/ana-id/classes/session-456",
    );
    const brunoClassCall = setDocCalls.find(
      (c) => c[0].path === "students/bruno-id/classes/session-456",
    );

    expect(anaClassCall).toBeDefined();
    expect(brunoClassCall).toBeUndefined(); // Absent student receives nothing (CA07)

    // 3. CA11: Ana sees her own shared note, but NOT Bruno's note!
    const anaClassData = anaClassCall![1];
    expect(anaClassData.studentNotes).toHaveLength(1);
    expect(anaClassData.studentNotes[0].studentId).toBe("ana-id");
    expect(anaClassData.studentNotes[0].text).toBe("Excellent fluency today");

    // 4. Vocabulary is recorded ONLY for present students (Ana, not Bruno) (CA07)
    expect(recordVocabSpy).toHaveBeenCalledWith({
      studentIds: ["ana-id"],
      words: [{ term: "magnificent" }],
      sessionId: "session-456",
    });
  });

  it("discardSession marks session status as draft", async () => {
    await discardSession("teacher-1", "s1");

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "draft",
      }),
    );
  });
});
