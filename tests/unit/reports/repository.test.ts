import { describe, expect, it } from "vitest";
import {
  generateShareToken,
  hashShareToken,
} from "@/lib/reports/repository";
import { buildProgressReport } from "@/lib/reports/build-report";
import type { StudentHomeworkRecord } from "@/lib/homework/types";

describe("Reports Repository & Security Helpers (src/lib/reports/repository.ts)", () => {
  it("generateShareToken generates 32 hex characters with >= 128-bit entropy (RNF03)", () => {
    const token = generateShareToken();
    expect(token).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(token)).toBe(true);

    const token2 = generateShareToken();
    expect(token).not.toBe(token2);
  });

  it("hashShareToken computes deterministic SHA-256 hash (RNF02, RNF03)", async () => {
    const token = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    const hash1 = await hashShareToken(token);
    const hash2 = await hashShareToken(token);

    expect(hash1).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
    expect(hash1).toBe(hash2);

    const differentHash = await hashShareToken("different-token");
    expect(differentHash).not.toBe(hash1);
  });

  it("snapshot is immutable and does not change when raw data adds new entries afterwards (CA06)", () => {
    const homeworks: StudentHomeworkRecord[] = [
      { id: "h1", homeworkId: "hw1", activityId: "a1", activityTitle: "Quiz 1", correct: 10, total: 10, seconds: 50, completedAt: new Date(2026, 8, 10), late: false },
    ];

    const snapshot = buildProgressReport({
      student: { id: "ana", name: "Ana" },
      teacherName: "Teacher Alex",
      periodType: "last-month",
      referenceDate: new Date(2026, 9, 15),
      homeworkSubmissions: homeworks,
    });

    expect(snapshot.metrics.homework?.completedCount).toBe(1);

    // Later: teacher adds new homework submission for Ana
    homeworks.push({
      id: "h2",
      homeworkId: "hw2",
      activityId: "a2",
      activityTitle: "Quiz 2",
      correct: 5,
      total: 10,
      seconds: 40,
      completedAt: new Date(2026, 8, 20),
      late: false,
    });

    // The generated snapshot MUST remain strictly unchanged (CA06)
    expect(snapshot.metrics.homework?.completedCount).toBe(1);
    expect(snapshot.metrics.homework?.items).toHaveLength(1);
  });
});
