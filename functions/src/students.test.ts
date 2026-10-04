import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/v2/https";
import { deleteStudent, type DeleteStudentInput } from "./students.js";
import * as adminHelper from "./helpers/firebase-admin.js";

function mockRequest(
  data: DeleteStudentInput,
  authUid?: string,
): CallableRequest<DeleteStudentInput> {
  return {
    data,
    auth: authUid ? { uid: authUid, token: {} } : undefined,
    rawRequest: { ip: "127.0.0.1" } as unknown as CallableRequest<DeleteStudentInput>["rawRequest"],
  } as unknown as CallableRequest<DeleteStudentInput>;
}

describe("deleteStudent callable function (spec 01, RF07, CA06)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated request", async () => {
    await expect(deleteStudent.run(mockRequest({ studentId: "s1" }))).rejects.toThrow(
      /Authentication required/,
    );
  });

  it("rejects invalid input schema (empty studentId)", async () => {
    await expect(
      deleteStudent.run(mockRequest({ studentId: "" }, "teacher-1")),
    ).rejects.toThrow(/Invalid input/);
  });

  it("throws not-found when student does not exist", async () => {
    const mockDb = {
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
      }),
    };
    vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

    await expect(
      deleteStudent.run(mockRequest({ studentId: "s1" }, "teacher-1")),
    ).rejects.toThrow(/Student not found/);
  });

  it("throws permission-denied when caller is not the owner teacher (CA07)", async () => {
    const mockDb = {
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ teacherUid: "different-teacher", classIds: [] }),
        }),
      }),
    };
    vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

    await expect(
      deleteStudent.run(mockRequest({ studentId: "s1" }, "teacher-1")),
    ).rejects.toThrow(/permission/i);
  });

  it("successfully cleans up classes and recursively deletes student (CA06)", async () => {
    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    const mockStudentRef = { id: "s1" };
    const mockDb = {
      doc: vi.fn((path: string) => {
        if (path === "students/s1") {
          return {
            ...mockStudentRef,
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ teacherUid: "teacher-1", classIds: ["c1", "c2"] }),
            }),
          };
        }
        return { path };
      }),
      batch: vi.fn().mockReturnValue(mockBatch),
      recursiveDelete: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(adminHelper, "getAdminFirestore").mockReturnValue(mockDb as unknown as any);

    const result = await deleteStudent.run(mockRequest({ studentId: "s1" }, "teacher-1"));

    expect(result.success).toBe(true);
    expect(result.deletedStudentId).toBe("s1");
    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mockDb.recursiveDelete).toHaveBeenCalled();
  });
});
