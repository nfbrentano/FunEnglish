import { describe, expect, it } from "vitest";
import {
  buildProgressReport,
  calculatePeriodRange,
  extractFirstName,
} from "@/lib/reports/build-report";
import type { StudentNote } from "@/lib/notes/types";
import type { Lesson } from "@/lib/schedule/types";
import type { StudentHomeworkRecord } from "@/lib/homework/types";
import type { StudentWord } from "@/lib/vocabulary/types";
import type { ClassroomSession } from "@/lib/session/types";
import type { BillingPlan } from "@/lib/billing/types";

describe("Progress Report Builder (src/lib/reports/build-report.ts)", () => {
  const refDateOct = new Date(2026, 9, 15); // Oct 15, 2026 (Month index 9)

  describe("calculatePeriodRange & extractFirstName", () => {
    it("extracts only first name safely", () => {
      expect(extractFirstName("Ana Carolina")).toBe("Ana");
      expect(extractFirstName("John Doe Smith")).toBe("John");
      expect(extractFirstName("")).toBe("Student");
    });

    it("calculates last month as full previous calendar month (CA01)", () => {
      const range = calculatePeriodRange("last-month", undefined, refDateOct);
      // Previous month is September 2026
      expect(range.from.getFullYear()).toBe(2026);
      expect(range.from.getMonth()).toBe(8); // September
      expect(range.from.getDate()).toBe(1);
      expect(range.to.getFullYear()).toBe(2026);
      expect(range.to.getMonth()).toBe(8);
      expect(range.to.getDate()).toBe(30);
    });
  });

  describe("buildProgressReport (CA01, CA02, CA03, CA04, CA09, CA10, CA11)", () => {
    it("filters data by selected period (CA01)", () => {
      const lessons: Lesson[] = [
        {
          id: "l1",
          studentId: "ana",
          studentName: "Ana",
          start: new Date(2026, 8, 10), // Sep 10 (Last month)
          durationMin: 60,
          mode: "online",
          status: "done",
          extra: false,
        },
        {
          id: "l2",
          studentId: "ana",
          studentName: "Ana",
          start: new Date(2026, 9, 5), // Oct 5 (Current month - should be excluded)
          durationMin: 60,
          mode: "online",
          status: "done",
          extra: false,
        },
      ];

      const report = buildProgressReport({
        student: { id: "ana", name: "Ana Silva" },
        teacherName: "Teacher Alex",
        periodType: "last-month",
        referenceDate: refDateOct,
        lessons,
      });

      expect(report.metrics.lessons?.done).toBe(1);
      expect(report.metrics.lessons?.totalScheduled).toBe(1);
      expect(report.metrics.lessons?.displayString).toBe("1/1 lessons");
    });

    it("calculates accurate metrics for 1:1 lessons, homework, and vocabulary (CA02)", () => {
      // 8 lessons: 7 done, 1 no-show
      const lessons: Lesson[] = [
        ...Array.from({ length: 7 }, (_, i) => ({
          id: `l-done-${i}`,
          studentId: "ana",
          studentName: "Ana",
          start: new Date(2026, 8, i + 1),
          durationMin: 60,
          mode: "online" as const,
          status: "done" as const,
          extra: false,
        })),
        {
          id: "l-noshow",
          studentId: "ana",
          studentName: "Ana",
          start: new Date(2026, 8, 15),
          durationMin: 60,
          mode: "online",
          status: "no-show",
          extra: false,
        },
      ];

      // 4 submissions out of 5 assigned, average 82%
      // 4 submissions: scores 80, 80, 84, 84 -> average (80+80+84+84)/4 = 82%
      const homeworkSubmissions: StudentHomeworkRecord[] = [
        { id: "h1", homeworkId: "hw1", activityId: "a1", activityTitle: "Grammar Quiz", correct: 8, total: 10, seconds: 60, completedAt: new Date(2026, 8, 5), late: false },
        { id: "h2", homeworkId: "hw2", activityId: "a2", activityTitle: "Vocabulary Quiz", correct: 8, total: 10, seconds: 60, completedAt: new Date(2026, 8, 12), late: false },
        { id: "h3", homeworkId: "hw3", activityId: "a3", activityTitle: "Prepositions", correct: 84, total: 100, seconds: 60, completedAt: new Date(2026, 8, 19), late: false },
        { id: "h4", homeworkId: "hw4", activityId: "a4", activityTitle: "Reading Check", correct: 84, total: 100, seconds: 60, completedAt: new Date(2026, 8, 26), late: true },
      ];

      const assignedHomeworks = [
        { id: "hw1", createdAt: new Date(2026, 8, 3) } as any,
        { id: "hw2", createdAt: new Date(2026, 8, 10) } as any,
        { id: "hw3", createdAt: new Date(2026, 8, 17) } as any,
        { id: "hw4", createdAt: new Date(2026, 8, 24) } as any,
        { id: "hw5", createdAt: new Date(2026, 8, 28) } as any, // 5th assigned, uncompleted
      ];

      // 25 vocabulary words in September
      const vocabulary: StudentWord[] = Array.from({ length: 25 }, (_, i) => ({
        id: `word-${i}`,
        term: `word${i}`,
        firstAddedAt: new Date(2026, 8, i + 1).toISOString(),
        lastAddedAt: new Date(2026, 8, i + 1).toISOString(),
        sessionIds: [],
        learned: i < 10, // 10 mastered
      }));

      const report = buildProgressReport({
        student: { id: "ana", name: "Ana Silva" },
        teacherName: "Teacher Alex",
        periodType: "last-month",
        referenceDate: refDateOct,
        lessons,
        homeworkSubmissions,
        assignedHomeworks,
        vocabulary,
      });

      expect(report.metrics.lessons?.displayString).toBe("7/8 lessons");
      expect(report.metrics.homework?.displayString).toBe("4/5 homework · 82% average");
      expect(report.metrics.vocabulary?.displayString).toBe("25 new words");
    });

    it("includes teacher comment and next goals (CA03)", () => {
      const report = buildProgressReport({
        student: { id: "ana", name: "Ana" },
        teacherName: "Teacher Alex",
        periodType: "last-month",
        referenceDate: refDateOct,
        teacherComment: "Great progress this month! Ana showed excellent fluency.",
        nextGoals: ["Master Past Continuous", "Read 1 short story"],
      });

      expect(report.teacherComment).toBe("Great progress this month! Ana showed excellent fluency.");
      expect(report.nextGoals).toEqual(["Master Past Continuous", "Read 1 short story"]);
    });

    it("NEVER includes private notes in any section (CA04)", () => {
      const notes: StudentNote[] = [
        {
          id: "n-private",
          studentId: "ana",
          category: "pronunciation",
          text: "Struggles with /th/ sound in think",
          visibility: "private",
          resolved: false,
          createdAt: new Date(2026, 8, 10),
          updatedAt: new Date(2026, 8, 10),
        },
        {
          id: "n-strength",
          studentId: "ana",
          category: "strength",
          text: "Excellent listening comprehension",
          visibility: "shared",
          resolved: true,
          createdAt: new Date(2026, 8, 10),
          updatedAt: new Date(2026, 8, 10),
        },
        {
          id: "n-error",
          studentId: "ana",
          category: "grammar",
          text: "goed",
          correction: "went",
          visibility: "shared",
          resolved: false,
          createdAt: new Date(2026, 8, 10),
          updatedAt: new Date(2026, 8, 10),
        },
      ];

      const report = buildProgressReport({
        student: { id: "ana", name: "Ana" },
        teacherName: "Teacher Alex",
        periodType: "last-month",
        referenceDate: refDateOct,
        notes,
      });

      // Private pronunciation note must not be anywhere
      const allReportJson = JSON.stringify(report);
      expect(allReportJson).not.toContain("Struggles with /th/ sound");

      // Shared notes are present
      expect(report.metrics.notes?.sharedStrengths).toHaveLength(1);
      expect(report.metrics.notes?.sharedStrengths[0].text).toBe("Excellent listening comprehension");
      expect(report.metrics.notes?.recurringErrorsOpen).toHaveLength(1);
    });

    it("supports Portuguese language mode with localized strings (CA09)", () => {
      const lessons: Lesson[] = [
        {
          id: "l1",
          studentId: "ana",
          studentName: "Ana",
          start: new Date(2026, 8, 10),
          durationMin: 60,
          mode: "online",
          status: "done",
          extra: false,
        },
      ];

      const report = buildProgressReport({
        student: { id: "ana", name: "Ana" },
        teacherName: "Prof. Alex",
        language: "pt",
        periodType: "last-month",
        referenceDate: refDateOct,
        lessons,
      });

      expect(report.language).toBe("pt");
      expect(report.metrics.lessons?.displayString).toBe("1/1 aulas");
    });

    it("displays CEFR level, goal and only shared summaries (CA10)", () => {
      const sessions: ClassroomSession[] = [
        {
          id: "s1",
          teacherUid: "t1",
          kind: "one-to-one",
          studentId: "ana",
          studentName: "Ana",
          startedAt: new Date(2026, 8, 5),
          status: "ended",
          attendance: { ana: true },
          activitiesPlayed: [],
          newWords: [],
          notes: [],
          summary: "Practiced introductions and work vocabulary.",
          summaryShared: true, // SHARED
        },
        {
          id: "s2",
          teacherUid: "t1",
          kind: "one-to-one",
          studentId: "ana",
          studentName: "Ana",
          startedAt: new Date(2026, 8, 12),
          status: "ended",
          attendance: { ana: true },
          activitiesPlayed: [],
          newWords: [],
          notes: [],
          summary: "Teacher's private lesson reflections.",
          summaryShared: false, // PRIVATE / NOT SHARED
        },
        {
          id: "s3",
          teacherUid: "t1",
          kind: "one-to-one",
          studentId: "ana",
          studentName: "Ana",
          startedAt: new Date(2026, 8, 19),
          status: "ended",
          attendance: { ana: true },
          activitiesPlayed: [],
          newWords: [],
          notes: [],
          summary: "Reviewed email writing for business.",
          summaryShared: true, // SHARED
        },
      ];

      const report = buildProgressReport({
        student: { id: "ana", name: "Ana", level: "B1", goal: "Work" },
        teacherName: "Teacher Alex",
        periodType: "last-month",
        referenceDate: refDateOct,
        sessions,
      });

      expect(report.studentLevel).toBe("B1");
      expect(report.studentGoal).toBe("Work");
      expect(report.metrics.summaries).toHaveLength(2);
      expect(report.metrics.summaries?.map((s) => s.summary)).toEqual([
        "Practiced introductions and work vocabulary.",
        "Reviewed email writing for business.",
      ]);
    });

    it("excludes package section by default, includes only when enabled (CA11)", () => {
      const billingPlan: BillingPlan = {
        type: "package",
        priceCents: 10000,
        creditsBalance: 5,
        updatedAt: new Date(),
      };

      // Default (package off)
      const reportWithoutPackage = buildProgressReport({
        student: { id: "ana", name: "Ana" },
        teacherName: "Teacher Alex",
        periodType: "last-month",
        referenceDate: refDateOct,
        billingPlan,
      });

      expect(reportWithoutPackage.enabledSections.package).toBe(false);
      expect(reportWithoutPackage.metrics.package).toBeUndefined();

      // Explicitly enabled
      const reportWithPackage = buildProgressReport({
        student: { id: "ana", name: "Ana" },
        teacherName: "Teacher Alex",
        periodType: "last-month",
        referenceDate: refDateOct,
        enabledSections: { package: true },
        billingPlan,
      });

      expect(reportWithPackage.enabledSections.package).toBe(true);
      expect(reportWithPackage.metrics.package?.remainingCredits).toBe(5);
    });
  });
});
