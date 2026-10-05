import { describe, expect, it } from "vitest";
import { calculateTrackProgress } from "@/lib/tracks/progress";

describe("calculateTrackProgress (CT04: CA04, CA07, CA08)", () => {
  it("calculates 0% complete when no steps are completed", () => {
    const activityIds = ["act-1", "act-2", "act-3", "act-4", "act-5"];
    const progress = calculateTrackProgress(activityIds, {});

    expect(progress.total).toBe(5);
    expect(progress.completedCount).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.steps[0]?.status).toBe("current");
    expect(progress.steps[1]?.status).toBe("pending");
    expect(progress.steps[4]?.status).toBe("pending");
  });

  it("calculates 40% complete when 2 of 5 steps are completed (CA04)", () => {
    const activityIds = ["act-1", "act-2", "act-3", "act-4", "act-5"];
    const completed = {
      "act-1": { at: "2026-10-03T10:00:00Z", source: "manual" as const },
      "act-2": { at: "2026-10-03T10:05:00Z", source: "manual" as const },
    };
    const progress = calculateTrackProgress(activityIds, completed);

    expect(progress.total).toBe(5);
    expect(progress.completedCount).toBe(2);
    expect(progress.percent).toBe(40);
    expect(progress.steps[0]?.status).toBe("completed");
    expect(progress.steps[1]?.status).toBe("completed");
    expect(progress.steps[2]?.status).toBe("current");
    expect(progress.steps[3]?.status).toBe("pending");
    expect(progress.steps[4]?.status).toBe("pending");
  });

  it("adjusts to 33% complete when a 6th step is added without losing existing completions (CA07)", () => {
    const activityIds = ["act-1", "act-2", "act-3", "act-4", "act-5", "act-6"];
    const completed = {
      "act-1": { at: "2026-10-03T10:00:00Z", source: "manual" as const },
      "act-2": { at: "2026-10-03T10:05:00Z", source: "manual" as const },
    };
    const progress = calculateTrackProgress(activityIds, completed);

    expect(progress.total).toBe(6);
    expect(progress.completedCount).toBe(2);
    // 2 / 6 = 33.333% -> 33%
    expect(progress.percent).toBe(33);
    expect(progress.steps[0]?.status).toBe("completed");
    expect(progress.steps[1]?.status).toBe("completed");
    expect(progress.steps[2]?.status).toBe("current");
    expect(progress.steps[5]?.status).toBe("pending");
  });

  it("disregards unpublished / unavailable activities from total and percentage (CA08)", () => {
    const activityIds = ["act-1", "act-2", "act-3", "act-4", "act-5"];
    // act-3 has been unpublished or deleted from catalog
    const availableSet = new Set(["act-1", "act-2", "act-4", "act-5"]);
    const completed = {
      "act-1": { at: "2026-10-03T10:00:00Z", source: "homework" as const },
      "act-2": { at: "2026-10-03T10:05:00Z", source: "class" as const },
    };

    const progress = calculateTrackProgress(activityIds, completed, availableSet);

    // Total available = 4 (act-3 excluded)
    expect(progress.total).toBe(4);
    // Completed count = 2
    expect(progress.completedCount).toBe(2);
    // 2 / 4 = 50%
    expect(progress.percent).toBe(50);

    expect(progress.steps[0]?.status).toBe("completed");
    expect(progress.steps[1]?.status).toBe("completed");
    expect(progress.steps[2]?.status).toBe("unavailable");
    expect(progress.steps[2]?.available).toBe(false);
    expect(progress.steps[3]?.status).toBe("current");
    expect(progress.steps[4]?.status).toBe("pending");
  });

  it("handles empty activityIds gracefully", () => {
    const progress = calculateTrackProgress([], {});
    expect(progress.total).toBe(0);
    expect(progress.completedCount).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.steps).toEqual([]);
  });

  it("handles 100% complete with all steps completed", () => {
    const activityIds = ["act-1", "act-2"];
    const completed = {
      "act-1": { at: "2026-10-03T10:00:00Z", source: "manual" as const },
      "act-2": { at: "2026-10-03T10:05:00Z", source: "manual" as const },
    };
    const progress = calculateTrackProgress(activityIds, completed);
    expect(progress.percent).toBe(100);
    expect(progress.steps.every((s) => s.status === "completed")).toBe(true);
  });
});
