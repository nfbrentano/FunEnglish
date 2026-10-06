import { describe, expect, it } from "vitest";
import {
  calculateDurationDifference,
  newPlanDefaults,
  sumMinutes,
  type PlanItem,
} from "@/lib/plans/types";
import { mapPlanDoc } from "@/lib/plans/repository";

describe("Lesson Plans Unit Tests (Spec 12)", () => {
  describe("sumMinutes (RF03, CA01)", () => {
    it("sums minutes across activities and custom blocks", () => {
      const items: PlanItem[] = [
        { kind: "block", title: "Warm-up", minutes: 5 },
        { kind: "activity", activityId: "act-1", title: "Activity 1", minutes: 15 },
        { kind: "activity", activityId: "act-2", title: "Activity 2", minutes: 20 },
        { kind: "activity", activityId: "act-3", title: "Activity 3", minutes: 10 },
      ];
      expect(sumMinutes(items)).toBe(50);
    });

    it("returns 0 for empty list", () => {
      expect(sumMinutes([])).toBe(0);
    });
  });

  describe("calculateDurationDifference (RF03, CA02)", () => {
    it("warns when plan exceeds lesson duration", () => {
      const diff = calculateDurationDifference(60, 50);
      expect(diff.exceeds).toBe(true);
      expect(diff.diffMinutes).toBe(10);
      expect(diff.warning).toBe("Plan is 10 min longer than the lesson");
    });

    it("returns no warning when plan is equal or shorter than lesson duration", () => {
      const diffEqual = calculateDurationDifference(50, 50);
      expect(diffEqual.exceeds).toBe(false);
      expect(diffEqual.warning).toBeUndefined();

      const diffShorter = calculateDurationDifference(40, 50);
      expect(diffShorter.exceeds).toBe(false);
      expect(diffShorter.warning).toBeUndefined();
    });

    it("handles undefined lesson duration gracefully", () => {
      const diff = calculateDurationDifference(60, undefined);
      expect(diff.exceeds).toBe(false);
      expect(diff.diffMinutes).toBe(0);
      expect(diff.warning).toBeUndefined();
    });
  });

  describe("newPlanDefaults (RF09, CA10)", () => {
    it("pre-fills goal with last session's nextFocus and suggests unlearned words", () => {
      const lastSession = { nextFocus: "past simple questions" };
      const unlearnedWords = ["bought", "caught", "thought"];
      const defaults = newPlanDefaults(lastSession, unlearnedWords);

      expect(defaults.goal).toBe("past simple questions");
      expect(defaults.words).toEqual(["bought", "caught", "thought"]);
    });

    it("handles missing last session and empty vocabulary", () => {
      const defaults = newPlanDefaults(null, []);
      expect(defaults.goal).toBe("");
      expect(defaults.words).toEqual([]);
    });
  });

  describe("mapPlanDoc & Backward Compatibility (RNF06, CA08)", () => {
    it("maps legacy plan document with only classId to targetType 'class'", () => {
      const legacyData = {
        classId: "class-123",
        title: "Old Class Plan",
        items: [{ kind: "activity", activityId: "act-1", title: "Act 1", minutes: 10 }],
        words: ["apple"],
        status: "draft",
        updatedAt: new Date("2026-09-01"),
      };

      const plan = mapPlanDoc("plan-legacy-1", legacyData);
      expect(plan.id).toBe("plan-legacy-1");
      expect(plan.targetType).toBe("class");
      expect(plan.classId).toBe("class-123");
      expect(plan.studentId).toBeUndefined();
      expect(plan.items).toHaveLength(1);
    });

    it("maps student plan correctly", () => {
      const studentData = {
        targetType: "student",
        studentId: "student-ana",
        title: "Ana 1:1 Plan",
        goal: "Improve fluency",
        items: [
          { kind: "block", title: "Warm-up conversation", minutes: 10 },
          { kind: "activity", activityId: "act-travel", title: "Travel Dialogue", minutes: 20 },
        ],
        words: ["boarding pass", "luggage"],
        status: "draft",
        updatedAt: new Date("2026-10-06"),
      };

      const plan = mapPlanDoc("plan-ana-1", studentData);
      expect(plan.targetType).toBe("student");
      expect(plan.studentId).toBe("student-ana");
      expect(plan.classId).toBeUndefined();
      expect(plan.words).toHaveLength(2);
      expect(plan.items).toHaveLength(2);
    });
  });
});
