import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/v2/https";
import {
  createHomework,
  getHomeworkForStudent,
  regenerateStudentHomeworkToken,
  submitHomework,
  verifyStudentPin,
} from "./homework.js";
import * as adminHelper from "./helpers/firebase-admin.js";

function mockRequest<T>(data: T, authUid?: string): CallableRequest<T> {
  return {
    data,
    auth: authUid ? { uid: authUid, token: {} } : undefined,
    rawRequest: { ip: "127.0.0.1" } as unknown as CallableRequest<T>["rawRequest"],
  } as unknown as CallableRequest<T>;
}

describe("homework Cloud Functions (spec 10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createHomework (CA01)", () => {
    it("requires authentication", async () => {
      await expect(
        createHomework.run(
          mockRequest({
            activityId: "act-1",
            targetType: "anyone",
            allowLate: false,
          }),
        ),
      ).rejects.toThrow(/Authentication required/);
    });

    it("creates a homework document and returns individual tokens for students (RF02, RNF07)", async () => {
      const store: Record<string, any> = {
        "activities/act-1": {
          title: "At the airport",
          slug: "at-the-airport",
          type: "quiz",
        },
        "users/teacher-1/classes/class-1": {
          name: "Teens B1",
          studentIds: ["s-ana", "s-bruno"],
        },
        "students/s-ana": {
          name: "Ana Silva",
          teacherUid: "teacher-1",
        },
        "students/s-bruno": {
          name: "Bruno Souza",
          teacherUid: "teacher-1",
        },
      };

      const setDocs: Record<string, any> = {};
      const mockBatch = {
        set: vi.fn((ref, val) => {
          setDocs[ref.path] = val;
        }),
        commit: vi.fn().mockResolvedValue(undefined),
      };

      const mockDb = {
        doc: vi.fn((path: string) => ({
          path,
          id: path.split("/").pop()!,
          get: vi.fn().mockImplementation(async () => ({
            id: path.split("/").pop()!,
            exists: path in store,
            data: () => store[path],
          })),
          set: vi.fn((data) => {
            setDocs[path] = data;
          }),
        })),
        batch: vi.fn().mockReturnValue(mockBatch),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const result = await createHomework.run(
        mockRequest(
          {
            activityId: "act-1",
            targetType: "class",
            classId: "class-1",
            dueDate: "2026-10-10T23:59:59.000Z",
            instruction: "Complete chapter 4 vocabulary",
            allowLate: true,
          },
          "teacher-1",
        ),
      );

      expect(result.homeworkId).toBeDefined();
      expect(result.homeworkId.length).toBe(20);
      expect(result.individualLinks).toHaveLength(2);
      expect(result.individualLinks?.[0].studentName).toBe("Ana Silva");
      expect(result.individualLinks?.[0].token).toHaveLength(32);

      const hwDoc = setDocs[`homework/${result.homeworkId}`];
      expect(hwDoc).toBeDefined();
      expect(hwDoc.teacherUid).toBe("teacher-1");
      expect(hwDoc.activityTitle).toBe("At the airport");
      expect(hwDoc.className).toBe("Teens B1");
      // RNF02: classRoster only contains firstName and studentId
      expect(hwDoc.classRoster).toEqual([
        { studentId: "s-ana", firstName: "Ana" },
        { studentId: "s-bruno", firstName: "Bruno" },
      ]);
      expect(hwDoc.classRoster[0].email).toBeUndefined();
    });
  });

  describe("getHomeworkForStudent (CA02, CA06, CA10)", () => {
    it("returns invalid for nonexistent homework (CA10)", async () => {
      const mockDb = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ exists: false }),
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const result = await getHomeworkForStudent.run(
        mockRequest({ homeworkId: "nonexistent" }),
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("not-found");
    });

    it("returns invalid when studentToken does not exist (CA10)", async () => {
      const mockDb = {
        doc: vi.fn((path: string) => ({
          get: vi.fn().mockImplementation(async () => {
            if (path === "homework/hw-1") return { exists: true, data: () => ({ open: true }) };
            return { exists: false };
          }),
        })),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const result = await getHomeworkForStudent.run(
        mockRequest({ homeworkId: "hw-1", studentToken: "invalid-token" }),
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("invalid-token");
    });

    it("identifies student when individual token is provided without login (CA02)", async () => {
      const mockDb = {
        doc: vi.fn((path: string) => ({
          id: path.split("/").pop()!,
          get: vi.fn().mockImplementation(async () => {
            if (path === "homework/hw-1") {
              return {
                exists: true,
                data: () => ({
                  activityId: "act-1",
                  activityTitle: "Animals",
                  activityType: "quiz",
                  open: true,
                  targetType: "class",
                }),
              };
            }
            if (path === "homework/hw-1/assignees/token-ana") {
              return {
                exists: true,
                data: () => ({ studentId: "s-ana", firstName: "Ana" }),
              };
            }
            if (path === "activities/act-1") {
              return { exists: true, data: () => ({ content: { questions: [] } }) };
            }
            return { exists: false };
          }),
        })),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const result = await getHomeworkForStudent.run(
        mockRequest({ homeworkId: "hw-1", studentToken: "token-ana" }),
      );

      expect(result.valid).toBe(true);
      expect(result.student).toEqual({ studentId: "s-ana", firstName: "Ana" });
      expect(result.isClosed).toBe(false);
    });

    it("indicates closed when past due date and allowLate is false (CA06)", async () => {
      const mockDb = {
        doc: vi.fn((path: string) => ({
          id: path.split("/").pop()!,
          get: vi.fn().mockImplementation(async () => {
            if (path === "homework/hw-closed") {
              return {
                exists: true,
                data: () => ({
                  activityId: "act-1",
                  open: true,
                  dueDate: "2020-01-01T00:00:00.000Z",
                  allowLate: false,
                }),
              };
            }
            return { exists: true, data: () => ({}) };
          }),
        })),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const result = await getHomeworkForStudent.run(
        mockRequest({ homeworkId: "hw-closed" }),
      );
      expect(result.valid).toBe(true);
      expect(result.isClosed).toBe(true);
    });
  });

  describe("verifyStudentPin (CA11, CA13)", () => {
    it("verifies PIN correctly and resets attempts", async () => {
      const rawPin = "1234";
      const hashedPin = crypto.createHash("sha256").update(rawPin).digest("hex");
      const attemptDelete = vi.fn().mockResolvedValue(undefined);

      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "pinAttempts/s-ana") {
            return {
              get: vi.fn().mockResolvedValue({ exists: false }),
              delete: attemptDelete,
            };
          }
          if (path === "students/s-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ name: "Ana", homeworkPin: hashedPin, teacherUid: "t1" }),
              }),
            };
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) };
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await verifyStudentPin.run(
        mockRequest({ studentId: "s-ana", pin: "1234" }),
      );
      expect(res.success).toBe(true);
      expect(attemptDelete).toHaveBeenCalled();
    });

    it("rejects wrong PIN with Wrong PIN message (CA11)", async () => {
      const rawPin = "1234";
      const hashedPin = crypto.createHash("sha256").update(rawPin).digest("hex");
      const attemptSet = vi.fn().mockResolvedValue(undefined);

      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "pinAttempts/s-ana") {
            return {
              get: vi.fn().mockResolvedValue({ exists: false }),
              set: attemptSet,
            };
          }
          if (path === "students/s-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ name: "Ana", homeworkPin: hashedPin, teacherUid: "t1" }),
              }),
            };
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) };
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      await expect(
        verifyStudentPin.run(mockRequest({ studentId: "s-ana", pin: "9999" })),
      ).rejects.toThrow(/Wrong PIN/);
      expect(attemptSet).toHaveBeenCalledWith(
        expect.objectContaining({ failedCount: 1 }),
      );
    });

    it("locks student out after 5 failed attempts in 15 min (CA13)", async () => {
      const rawPin = "1234";
      const hashedPin = crypto.createHash("sha256").update(rawPin).digest("hex");
      const attemptSet = vi.fn().mockResolvedValue(undefined);

      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "pinAttempts/s-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  failedCount: 4,
                  lastAttemptAt: Date.now(),
                }),
              }),
              set: attemptSet,
            };
          }
          if (path === "students/s-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ name: "Ana", homeworkPin: hashedPin, teacherUid: "t1" }),
              }),
            };
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) };
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      // 5th wrong attempt triggers lockout
      await expect(
        verifyStudentPin.run(mockRequest({ studentId: "s-ana", pin: "0000" })),
      ).rejects.toThrow(/Too many attempts — ask your teacher/);

      // Now 6th attempt even with correct PIN is locked out
      const lockedDb = {
        doc: vi.fn((path: string) => {
          if (path === "pinAttempts/s-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  failedCount: 5,
                  lockedUntil: Date.now() + 600000,
                  lastAttemptAt: Date.now(),
                }),
              }),
            };
          }
          if (path === "students/s-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ name: "Ana", homeworkPin: hashedPin, teacherUid: "t1" }),
              }),
            };
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) };
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(lockedDb as unknown as any);

      await expect(
        verifyStudentPin.run(mockRequest({ studentId: "s-ana", pin: "1234" })),
      ).rejects.toThrow(/Too many attempts — ask your teacher/);
    });
  });

  describe("regenerateStudentHomeworkToken (RF12, CA12)", () => {
    it("deletes old token and creates new one", async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };

      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "homework/hw-1") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ teacherUid: "t1" }),
              }),
            };
          }
          return { path };
        }),
        collection: vi.fn(() => ({
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [{ ref: { id: "old-token" }, data: () => ({ firstName: "Ana" }) }],
          }),
        })),
        batch: vi.fn().mockReturnValue(mockBatch),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const result = await regenerateStudentHomeworkToken.run(
        mockRequest({ homeworkId: "hw-1", studentId: "s-ana" }, "t1"),
      );

      expect(result.token).toBeDefined();
      expect(result.token).toHaveLength(32);
      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: `homework/hw-1/assignees/${result.token}` }),
        expect.objectContaining({ studentId: "s-ana", firstName: "Ana" }),
      );
    });
  });

  describe("submitHomework (CA04, CA07, CA08, CA09, CA11, CA12)", () => {
    it("recalculates score on server and ignores client numbers (RNF04, CA09)", async () => {
      const activityData = {
        type: "quiz",
        content: {
          questions: [
            { prompt: "Q1", options: [{ text: "Yes", correct: true }, { text: "No", correct: false }] },
            { prompt: "Q2", options: [{ text: "A", correct: false }, { text: "B", correct: true }] },
          ],
        },
      };

      const setSubmission = vi.fn().mockResolvedValue(undefined);
      const setStudentSub = vi.fn().mockResolvedValue(undefined);

      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "homework/hw-1") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  activityId: "act-1",
                  activityTitle: "Sample Quiz",
                  activityType: "quiz",
                  open: true,
                  targetType: "class",
                }),
              }),
            };
          }
          if (path === "homework/hw-1/assignees/token-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ studentId: "s-ana", firstName: "Ana" }),
              }),
            };
          }
          if (path === "activities/act-1") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => activityData,
              }),
            };
          }
          if (path.startsWith("students/s-ana/homeworkSubmissions/")) {
            return { set: setStudentSub };
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) };
        }),
        collection: vi.fn((col: string) => {
          if (col === "homework/hw-1/submissions") {
            return {
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ size: 0, docs: [] }),
              }),
              count: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
              }),
              doc: vi.fn().mockReturnValue({
                id: "sub-123",
                set: setSubmission,
              }),
            };
          }
          return {} as any;
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      // Student submitted Q1 correct [0] and Q2 wrong [0]
      const res = await submitHomework.run(
        mockRequest({
          homeworkId: "hw-1",
          via: "token",
          studentToken: "token-ana",
          seconds: 45,
          answers: [[0], [0]],
        }),
      );

      expect(res.success).toBe(true);
      expect(res.correct).toBe(1);
      expect(res.total).toBe(2);
      expect(setSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: "s-ana",
          studentName: "Ana",
          via: "token",
          correct: 1,
          total: 2,
        }),
      );
      expect(setStudentSub).toHaveBeenCalledWith(
        expect.objectContaining({
          homeworkId: "hw-1",
          correct: 1,
          total: 2,
        }),
      );
    });

    it("rejects token mismatch (CA12)", async () => {
      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "homework/hw-1") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ open: true }),
              }),
            };
          }
          if (path === "homework/hw-1/assignees/token-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ studentId: "s-ana", firstName: "Ana" }),
              }),
            };
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) };
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      // Submitting Ana's token with Bruno's studentId
      await expect(
        submitHomework.run(
          mockRequest({
            homeworkId: "hw-1",
            via: "token",
            studentToken: "token-ana",
            studentId: "s-bruno",
            seconds: 10,
            answers: [],
          }),
        ),
      ).rejects.toThrow(/Student token mismatch/);
    });

    it("enforces max 3 attempts per student (CA07)", async () => {
      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "homework/hw-1") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ open: true }),
              }),
            };
          }
          if (path === "homework/hw-1/assignees/token-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ studentId: "s-ana", firstName: "Ana" }),
              }),
            };
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) };
        }),
        collection: vi.fn((col: string) => {
          if (col === "homework/hw-1/submissions") {
            return {
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ size: 3, docs: [{}, {}, {}] }),
              }),
            };
          }
          return {} as any;
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      await expect(
        submitHomework.run(
          mockRequest({
            homeworkId: "hw-1",
            via: "token",
            studentToken: "token-ana",
            seconds: 20,
            answers: [],
          }),
        ),
      ).rejects.toThrow(/You've used all 3 attempts/);
    });

    it("records 0/0 for flashcards without score (CA08)", async () => {
      const setSubmission = vi.fn().mockResolvedValue(undefined);

      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "homework/hw-flash") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  activityId: "act-flash",
                  activityTitle: "Animals Flashcards",
                  activityType: "flashcards",
                  open: true,
                  targetType: "anyone",
                }),
              }),
            };
          }
          if (path === "activities/act-flash") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  type: "flashcards",
                  content: { cards: [{ front: { text: "Cat" }, back: { text: "Gato" } }] },
                }),
              }),
            };
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) };
        }),
        collection: vi.fn(() => ({
          count: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
          }),
          doc: vi.fn().mockReturnValue({
            id: "sub-flash-1",
            set: setSubmission,
          }),
        })),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await submitHomework.run(
        mockRequest({
          homeworkId: "hw-flash",
          via: "anonymous",
          studentName: "Carlos",
          seconds: 30,
          answers: [1, 2, 3],
        }),
      );

      expect(res.success).toBe(true);
      expect(res.correct).toBe(0);
      expect(res.total).toBe(0);
      expect(setSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          correct: 0,
          total: 0,
        }),
      );
    });

    it("auto-completes learning track step with source 'homework' when student submits (spec 11: CT05, CA05)", async () => {
      const updateTrackMock = vi.fn().mockResolvedValue(undefined);
      const mockBatch = {
        update: updateTrackMock,
        commit: vi.fn().mockResolvedValue(undefined),
      };

      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "homework/hw-track") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  activityId: "act-step-3",
                  activityTitle: "Animals Quiz",
                  activityType: "quiz",
                  open: true,
                  targetType: "students",
                }),
              }),
            };
          }
          if (path === "homework/hw-track/assignees/tok-ana") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ studentId: "s-ana", firstName: "Ana" }),
              }),
            };
          }
          if (path === "activities/act-step-3") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  type: "quiz",
                  content: { questions: [{ prompt: "Q1", options: [{ text: "A", correct: true }] }] },
                }),
              }),
            };
          }
          if (path.startsWith("students/s-ana/homeworkSubmissions/")) {
            return { set: vi.fn().mockResolvedValue(undefined) };
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) };
        }),
        collection: vi.fn((col: string) => {
          if (col === "homework/hw-track/submissions") {
            return {
              where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ size: 0, docs: [] }) }),
              count: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) }),
              doc: vi.fn().mockReturnValue({ id: "sub-1", set: vi.fn().mockResolvedValue(undefined) }),
            };
          }
          if (col === "students/s-ana/tracks") {
            return {
              get: vi.fn().mockResolvedValue({
                empty: false,
                docs: [
                  {
                    ref: { id: "track-1" },
                    data: () => ({
                      trackId: "track-1",
                      trackName: "Travel module",
                      activityIds: ["act-step-1", "act-step-2", "act-step-3", "act-step-4", "act-step-5"],
                      completed: {
                        "act-step-1": { at: "2026-10-01T00:00:00Z", source: "manual" },
                        "act-step-2": { at: "2026-10-02T00:00:00Z", source: "manual" },
                      },
                    }),
                  },
                ],
              }),
            };
          }
          return { get: vi.fn().mockResolvedValue({ empty: true, docs: [] }) };
        }),
        batch: vi.fn().mockReturnValue(mockBatch),
      };

      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await submitHomework.run(
        mockRequest({
          homeworkId: "hw-track",
          via: "token",
          studentToken: "tok-ana",
          seconds: 60,
          answers: [[0]],
        }),
      );

      expect(res.success).toBe(true);
      expect(updateTrackMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "track-1" }),
        expect.objectContaining({
          "completed.act-step-3": expect.objectContaining({
            source: "homework",
          }),
        }),
      );
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
