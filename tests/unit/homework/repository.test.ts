import { describe, expect, it } from "vitest";
import {
  mapHomeworkDoc,
  mapSubmissionDoc,
  mapStudentRecordDoc,
} from "@/lib/homework/repository";

describe("homework repository mappers", () => {
  it("maps homework document correctly", () => {
    const raw = {
      teacherUid: "t-1",
      activityId: "act-1",
      activitySlug: "at-the-airport",
      activityTitle: "At the airport",
      activityType: "quiz",
      targetType: "class",
      className: "Teens B1",
      classRoster: [{ studentId: "s1", firstName: "Ana" }],
      dueDate: "2026-10-10",
      instruction: "Please complete by Friday",
      allowLate: true,
      open: true,
      createdAt: new Date("2026-10-03"),
    };

    const hw = mapHomeworkDoc("hw-1", raw);
    expect(hw.id).toBe("hw-1");
    expect(hw.teacherUid).toBe("t-1");
    expect(hw.activityTitle).toBe("At the airport");
    expect(hw.className).toBe("Teens B1");
    expect(hw.classRoster).toHaveLength(1);
    expect(hw.allowLate).toBe(true);
    expect(hw.open).toBe(true);
  });

  it("maps submission document correctly", () => {
    const raw = {
      homeworkId: "hw-1",
      studentId: "s-1",
      studentName: "Ana",
      via: "token",
      correct: 8,
      total: 10,
      seconds: 120,
      completedAt: new Date("2026-10-04"),
      late: false,
    };

    const sub = mapSubmissionDoc("sub-1", raw);
    expect(sub.id).toBe("sub-1");
    expect(sub.studentName).toBe("Ana");
    expect(sub.correct).toBe(8);
    expect(sub.total).toBe(10);
    expect(sub.via).toBe("token");
    expect(sub.late).toBe(false);
  });

  it("maps student homework record correctly", () => {
    const raw = {
      homeworkId: "hw-1",
      activityId: "act-1",
      activityTitle: "At the airport",
      activityType: "quiz",
      correct: 7,
      total: 10,
      seconds: 95,
      completedAt: new Date("2026-10-04"),
      late: true,
    };

    const record = mapStudentRecordDoc("rec-1", raw);
    expect(record.id).toBe("rec-1");
    expect(record.correct).toBe(7);
    expect(record.late).toBe(true);
  });
});
