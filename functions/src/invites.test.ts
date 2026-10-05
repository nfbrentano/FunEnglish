import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import {
  createStudentInvite,
  generateInviteCode,
  getStudentInvite,
  redeemInvite,
  removePortalAccess,
  revokeStudentInvite,
  validateInvite,
} from "./invites.js";
import * as adminHelper from "./helpers/firebase-admin.js";

function mockRequest<T>(data: T, authUid?: string): CallableRequest<T> {
  return {
    data,
    auth: authUid ? { uid: authUid, token: { email: `${authUid}@test.com` } } : undefined,
    rawRequest: { ip: "127.0.0.1" } as unknown as CallableRequest<T>["rawRequest"],
  } as unknown as CallableRequest<T>;
}

describe("student portal invites (spec 03: RF01, RF02, RF08, CA01, CA02, CA07, CA09, CA10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateInviteCode", () => {
    it("generates an 8-character string without ambiguous characters", () => {
      const code = generateInviteCode(8);
      expect(code).toHaveLength(8);
      // Shouldn't contain 0, O, 1, I, L
      expect(code).not.toMatch(/[0O1IL]/);
      expect(code).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
    });
  });

  describe("createStudentInvite", () => {
    it("rejects unauthenticated requests", async () => {
      await expect(
        createStudentInvite.run(mockRequest({ studentId: "s1" })),
      ).rejects.toThrow(/Authentication required/);
    });

    it("rejects if caller is not the owner teacher", async () => {
      const mockDb = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ teacherUid: "teacher-other" }),
          }),
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      await expect(
        createStudentInvite.run(mockRequest({ studentId: "s1" }, "teacher-1")),
      ).rejects.toThrow(/permission/i);
    });

    it("successfully creates invite valid for 14 days (CA01)", async () => {
      const setDocSpy = vi.fn().mockResolvedValue(undefined);
      const mockDb = {
        doc: vi.fn((path: string) => {
          if (path === "students/s1") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ teacherUid: "teacher-1", name: "Ana Silva" }),
              }),
            };
          }
          if (path === "users/teacher-1") {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ displayName: "Prof. John" }),
              }),
            };
          }
          return { set: setDocSpy };
        }),
        collection: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
          }),
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await createStudentInvite.run(mockRequest({ studentId: "s1" }, "teacher-1"));
      expect(res.code).toHaveLength(8);
      expect(res.expiresInDays).toBe(14);
      expect(setDocSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: "s1",
          studentName: "Ana Silva",
          teacherUid: "teacher-1",
        }),
      );
    });
  });

  describe("getStudentInvite", () => {
    it("returns active: false if no invite exists", async () => {
      const mockDb = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ teacherUid: "teacher-1" }),
          }),
        }),
        collection: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
            }),
          }),
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await getStudentInvite.run(mockRequest({ studentId: "s1" }, "teacher-1"));
      expect(res.active).toBe(false);
    });

    it("returns active code and expiresAt if valid invite exists", async () => {
      const expiresAtMs = Date.now() + 500000;
      const mockDb = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ teacherUid: "teacher-1" }),
          }),
        }),
        collection: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                empty: false,
                docs: [
                  {
                    data: () => ({
                      code: "CODE1234",
                      expiresAt: Timestamp.fromMillis(expiresAtMs),
                    }),
                  },
                ],
              }),
            }),
          }),
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await getStudentInvite.run(mockRequest({ studentId: "s1" }, "teacher-1"));
      expect(res.active).toBe(true);
      expect(res.code).toBe("CODE1234");
      expect(res.expiresAt).toBe(expiresAtMs);
    });
  });

  describe("validateInvite (CA10)", () => {
    it("returns invalid when code does not exist", async () => {
      const mockDb = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ exists: false }),
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await validateInvite.run(mockRequest({ code: "BADCODE1" }));
      expect(res.valid).toBe(false);
      expect(res.error).toBe(
        "This invite is invalid or has expired. Ask your teacher for a new one.",
      );
    });

    it("returns invalid when code is expired (CA10)", async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      const mockDb = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              expiresAt: Timestamp.fromMillis(Date.now() - 10000), // expired
              studentName: "Ana",
            }),
          }),
          delete: mockDelete,
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await validateInvite.run(mockRequest({ code: "EXPIRED1" }));
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/invalid or has expired/i);
    });

    it("returns valid info for active code", async () => {
      const mockDb = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              expiresAt: Timestamp.fromMillis(Date.now() + 100000),
              studentName: "Ana Silva",
              teacherName: "Prof. John",
            }),
          }),
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await validateInvite.run(mockRequest({ code: "VALID123" }));
      expect(res.valid).toBe(true);
      expect(res.studentName).toBe("Ana Silva");
      expect(res.teacherName).toBe("Prof. John");
    });
  });

  describe("redeemInvite (CA02, CA09)", () => {
    it("rejects unauthenticated redemption", async () => {
      await expect(redeemInvite.run(mockRequest({ code: "ABCDEF12" }))).rejects.toThrow(
        /Authentication required/,
      );
    });

    it("rejects when invite does not exist", async () => {
      const mockDb = {
        doc: vi.fn((path: string) => ({ path })),
        runTransaction: vi.fn(async (callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({ exists: false }),
          };
          return callback(transaction);
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      await expect(redeemInvite.run(mockRequest({ code: "UNKNOWN1" }, "student-uid"))).rejects.toThrow(
        /invalid or has expired/i,
      );
    });

    it("successfully redeems invite: creates user profile with role: 'student', links portalUid, deletes invite (CA02)", async () => {
      const transactionGets: Record<string, any> = {
        "invites/VALID123": {
          exists: true,
          data: () => ({
            studentId: "s1",
            studentName: "Ana Silva",
            expiresAt: Timestamp.fromMillis(Date.now() + 86400000),
          }),
        },
        "students/s1": {
          exists: true,
          data: () => ({
            name: "Ana Silva",
            teacherUid: "teacher-1",
          }),
        },
        "users/student-uid": {
          exists: false,
        },
      };

      const setSpy = vi.fn();
      const updateSpy = vi.fn();
      const deleteSpy = vi.fn();

      const mockDb = {
        doc: vi.fn((path: string) => ({ path })),
        runTransaction: vi.fn(async (callback) => {
          const transaction = {
            get: vi.fn(async (ref: { path: string }) => transactionGets[ref.path]),
            set: setSpy,
            update: updateSpy,
            delete: deleteSpy,
          };
          return callback(transaction);
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await redeemInvite.run(
        mockRequest({ code: "valid123" }, "student-uid"),
      );

      expect(res.success).toBe(true);
      expect(res.studentId).toBe("s1");
      // Created student user profile
      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({ path: "users/student-uid" }),
        expect.objectContaining({ role: "student" }),
      );
      // Updated student document with portalUid
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ path: "students/s1" }),
        { portalUid: "student-uid" },
      );
      // Deleted invite
      expect(deleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ path: "invites/VALID123" }),
      );
    });

    it("rejects if student already has a different portalUid (CA09)", async () => {
      const transactionGets: Record<string, any> = {
        "invites/VALID123": {
          exists: true,
          data: () => ({
            studentId: "s1",
            expiresAt: Timestamp.fromMillis(Date.now() + 86400000),
          }),
        },
        "students/s1": {
          exists: true,
          data: () => ({
            name: "Ana Silva",
            portalUid: "other-student-uid",
          }),
        },
      };

      const mockDb = {
        doc: vi.fn((path: string) => ({ path })),
        runTransaction: vi.fn(async (callback) => {
          const transaction = {
            get: vi.fn(async (ref: { path: string }) => transactionGets[ref.path]),
          };
          return callback(transaction);
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      await expect(
        redeemInvite.run(mockRequest({ code: "VALID123" }, "student-uid")),
      ).rejects.toThrow(/already has portal access/i);
    });

    it("rejects if caller is a teacher account (D03)", async () => {
      const transactionGets: Record<string, any> = {
        "invites/VALID123": {
          exists: true,
          data: () => ({
            studentId: "s1",
            expiresAt: Timestamp.fromMillis(Date.now() + 86400000),
          }),
        },
        "students/s1": {
          exists: true,
          data: () => ({
            name: "Ana Silva",
          }),
        },
        "users/teacher-uid": {
          exists: true,
          data: () => ({
            role: "teacher",
          }),
        },
      };

      const mockDb = {
        doc: vi.fn((path: string) => ({ path })),
        runTransaction: vi.fn(async (callback) => {
          const transaction = {
            get: vi.fn(async (ref: { path: string }) => transactionGets[ref.path]),
          };
          return callback(transaction);
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      await expect(
        redeemInvite.run(mockRequest({ code: "VALID123" }, "teacher-uid")),
      ).rejects.toThrow(/Teacher accounts cannot redeem/i);
    });
  });

  describe("removePortalAccess (RF08, CA07)", () => {
    it("teacher can remove portal access", async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined);
      const mockDb = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ teacherUid: "teacher-1", portalUid: "s-uid" }),
          }),
          update: updateSpy,
        }),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await removePortalAccess.run(mockRequest({ studentId: "s1" }, "teacher-1"));
      expect(res.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ portalUid: expect.anything() }),
      );
    });
  });

  describe("revokeStudentInvite", () => {
    it("deletes all existing invites for student", async () => {
      const deleteDocSpy = vi.fn();
      const mockBatch = {
        delete: deleteDocSpy,
        commit: vi.fn().mockResolvedValue(undefined),
      };
      const mockDb = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ teacherUid: "teacher-1" }),
          }),
        }),
        collection: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              empty: false,
              docs: [{ ref: { path: "invites/ABC" } }],
            }),
          }),
        }),
        batch: vi.fn().mockReturnValue(mockBatch),
      };
      vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

      const res = await revokeStudentInvite.run(mockRequest({ studentId: "s1" }, "teacher-1"));
      expect(res.success).toBe(true);
      expect(deleteDocSpy).toHaveBeenCalledTimes(1);
    });
  });
});
