import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockBatchSet = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchDelete = vi.fn();

const mockBatch = {
  set: mockBatchSet,
  update: mockBatchUpdate,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
};

const mockDoc = vi.fn((...args: unknown[]) => {
  const path = args.slice(1).join("/");
  return { path, id: (args[args.length - 1] as string) || "mock-doc-id" };
});
const mockCollection = vi.fn((...args: unknown[]) => ({ path: args.slice(1).join("/") }));
const mockDeleteField = vi.fn().mockReturnValue("__DELETE_FIELD__");

vi.mock("firebase/firestore", () => ({
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  writeBatch: () => mockBatch,
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  deleteField: () => mockDeleteField(),
}));

vi.mock("@/lib/firebase", () => ({
  getDb: vi.fn().mockReturnValue({}),
}));

import {
  assignTrackToStudents,
  createTrack,
  createTrackFromList,
  deleteTrack,
  getTrackClassMatrix,
  mapStudentTrackProgressDoc,
  mapTrackDoc,
  setStepCompletion,
  updateTrack,
} from "@/lib/tracks/repository";

describe("Learning Tracks Repository (spec 11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mapTrackDoc and mapStudentTrackProgressDoc map correctly", () => {
    const rawTrack = {
      name: "Travel module",
      description: "Learn travel vocabulary and conversations",
      level: "intermediate",
      activityIds: ["act-1", "act-2"],
      countClassActivities: true,
      assignedStudentIds: ["s-1", "s-2"],
      assignedClassIds: ["c-1"],
      createdAt: new Date("2026-10-01"),
      updatedAt: new Date("2026-10-02"),
    };

    const track = mapTrackDoc("tr-1", rawTrack);
    expect(track.id).toBe("tr-1");
    expect(track.name).toBe("Travel module");
    expect(track.level).toBe("intermediate");
    expect(track.countClassActivities).toBe(true);
    expect(track.activityIds).toEqual(["act-1", "act-2"]);

    const rawProg = {
      trackName: "Travel module",
      activityIds: ["act-1", "act-2"],
      countClassActivities: true,
      completed: {
        "act-1": { at: "2026-10-03T10:00:00Z", source: "homework" },
      },
      assignedAt: new Date("2026-10-01"),
    };

    const prog = mapStudentTrackProgressDoc("tr-1", rawProg);
    expect(prog.trackId).toBe("tr-1");
    expect(prog.completed["act-1"]?.source).toBe("homework");
  });

  it("createTrack creates track with provided parameters (RF01)", async () => {
    mockDoc.mockReturnValueOnce({ id: "tr-new", path: "users/teacher-1/tracks/tr-new" });

    const track = await createTrack("teacher-1", {
      name: "Grammar Basics",
      description: "Learn grammar",
      level: "beginner",
      activityIds: ["act-1", "act-2"],
      countClassActivities: true,
    });

    expect(track.name).toBe("Grammar Basics");
    expect(track.countClassActivities).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Grammar Basics",
        countClassActivities: true,
      }),
    );
  });

  it("createTrackFromList creates track with same name and activities in same order (CA01)", async () => {
    mockDoc.mockReturnValueOnce({ id: "tr-travel", path: "users/teacher-1/tracks/tr-travel" });

    const list = { id: "list-1", name: "Travel" };
    const activityIds = ["act-1", "act-2", "act-3", "act-4", "act-5"];

    const track = await createTrackFromList("teacher-1", list, activityIds);

    expect(track.name).toBe("Travel");
    expect(track.activityIds).toEqual(activityIds);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Travel",
        activityIds,
      }),
    );
  });

  it("updateTrack updates order and syncs to assigned students (CA02, CA07, RNF02)", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        name: "Travel module",
        assignedStudentIds: ["s-ana", "s-bruno"],
      }),
    });

    const newOrder = ["act-5", "act-1", "act-2", "act-3", "act-4"];
    await updateTrack("teacher-1", "tr-1", {
      activityIds: newOrder,
    });

    // Track document updated
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/teacher-1/tracks/tr-1" }),
      expect.objectContaining({
        activityIds: newOrder,
      }),
    );

    // Sync to assigned students
    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it("assignTrackToStudents assigns track to class roster with 0% complete (CA03)", async () => {
    const track = {
      id: "tr-1",
      name: "Travel",
      activityIds: ["act-1", "act-2", "act-3", "act-4", "act-5"],
      countClassActivities: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const studentIds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];

    await assignTrackToStudents("teacher-1", track, studentIds, ["class-teens-b1"]);

    expect(mockBatch.set).toHaveBeenCalledTimes(8);
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: "students/s1/tracks/tr-1" }),
      expect.objectContaining({
        trackId: "tr-1",
        trackName: "Travel",
        activityIds: track.activityIds,
        completed: {},
      }),
      { merge: true },
    );
    expect(mockBatch.commit).toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/teacher-1/tracks/tr-1" }),
      expect.objectContaining({
        assignedStudentIds: expect.arrayContaining(studentIds),
        assignedClassIds: ["class-teens-b1"],
      }),
    );
  });

  it("setStepCompletion toggles manual completion for a student (RF05, CA04)", async () => {
    // Mark as completed
    await setStepCompletion("s-ana", "tr-1", "act-1", true, "manual");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "students/s-ana/tracks/tr-1" }),
      expect.objectContaining({
        "completed.act-1": expect.objectContaining({
          source: "manual",
        }),
      }),
    );

    // Unmark as completed
    await setStepCompletion("s-ana", "tr-1", "act-1", false);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "students/s-ana/tracks/tr-1" }),
      expect.objectContaining({
        "completed.act-1": "__DELETE_FIELD__",
      }),
    );
  });

  it("getTrackClassMatrix returns matrix rows for all students in class (RF07, CA06)", async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        id: "tr-1",
        data: () => ({
          trackName: "Travel",
          activityIds: ["act-1", "act-2"],
          completed: { "act-1": { at: "2026-10-01", source: "manual" } },
        }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        id: "tr-1",
        data: () => ({
          trackName: "Travel",
          activityIds: ["act-1", "act-2"],
          completed: {},
        }),
      });

    const matrix = await getTrackClassMatrix("tr-1", ["s-ana", "s-bruno"]);

    expect(matrix).toHaveLength(2);
    expect(matrix[0]?.studentId).toBe("s-ana");
    expect(matrix[0]?.progress?.completed["act-1"]).toBeDefined();
    expect(matrix[1]?.studentId).toBe("s-bruno");
    expect(matrix[1]?.progress?.completed).toEqual({});
  });

  it("deleteTrack removes track and deletes from assigned students", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        assignedStudentIds: ["s-ana"],
      }),
    });

    await deleteTrack("teacher-1", "tr-1");

    expect(mockBatch.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "students/s-ana/tracks/tr-1" }),
    );
    expect(mockBatch.commit).toHaveBeenCalled();
    expect(mockDeleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/teacher-1/tracks/tr-1" }),
    );
  });
});
