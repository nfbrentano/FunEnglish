import { describe, expect, it } from "vitest";
import {
  addDaysToDateString,
  calculateNextReview,
  calculateStreak,
  getDueWords,
  getTodayDateString,
  getVocabularyReviewStats,
  isWordDue,
} from "@/lib/vocabulary/srs";
import type { StudentWord } from "@/lib/vocabulary/types";

describe("SRS module (src/lib/vocabulary/srs.ts)", () => {
  const sampleWord = (overrides: Partial<StudentWord> = {}): StudentWord => ({
    id: "w1",
    term: "boarding pass",
    meaning: "cartão de embarque",
    example: "Please show your boarding pass.",
    firstAddedAt: "2026-10-01T10:00:00.000Z",
    lastAddedAt: "2026-10-01T10:00:00.000Z",
    sessionIds: [],
    learned: false,
    ...overrides,
  });

  describe("addDaysToDateString and getTodayDateString", () => {
    it("adds days correctly across month boundaries", () => {
      expect(addDaysToDateString("2026-10-05", 3)).toBe("2026-10-08");
      expect(addDaysToDateString("2026-10-30", 3)).toBe("2026-11-02");
      expect(addDaysToDateString("2026-10-05", -1)).toBe("2026-10-04");
    });

    it("returns a valid YYYY-MM-DD format for today", () => {
      const today = getTodayDateString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("calculateNextReview (SM-2 simplified, CA03)", () => {
    const today = "2026-10-05";

    it("handles 'again': resets interval to 1, increments lapses, decreases ease (CA03)", () => {
      const word = sampleWord({
        intervalDays: 5,
        ease: 2.5,
        reps: 3,
        lapses: 0,
      });

      const next = calculateNextReview(word, "again", today);
      expect(next.intervalDays).toBe(1);
      expect(next.dueAt).toBe("2026-10-06");
      expect(next.lapses).toBe(1);
      expect(next.reps).toBe(0);
      expect(next.ease).toBe(2.3);
    });

    it("enforces minimum ease of 1.3 when 'again' is selected repeatedly", () => {
      const word = sampleWord({
        intervalDays: 1,
        ease: 1.4,
        reps: 0,
        lapses: 4,
      });

      const next = calculateNextReview(word, "again", today);
      expect(next.ease).toBe(1.3);
      expect(next.lapses).toBe(5);
    });

    it("handles 'hard': increases interval by factor of 1.2 and slightly reduces ease", () => {
      const word = sampleWord({
        intervalDays: 10,
        ease: 2.5,
        reps: 2,
        lapses: 0,
      });

      const next = calculateNextReview(word, "hard", today);
      expect(next.intervalDays).toBe(12); // round(10 * 1.2) = 12
      expect(next.dueAt).toBe("2026-10-17");
      expect(next.ease).toBe(2.35);
      expect(next.reps).toBe(3);
      expect(next.lapses).toBe(0);
    });

    it("handles 'good': intervalDays 3 and ease 2.5 becomes 8 days (CA03)", () => {
      const word = sampleWord({
        intervalDays: 3,
        ease: 2.5,
        reps: 2,
        lapses: 0,
      });

      const next = calculateNextReview(word, "good", today);
      // Math.round(3 * 2.5) = 8
      expect(next.intervalDays).toBe(8);
      expect(next.dueAt).toBe("2026-10-13"); // 2026-10-05 + 8 days
      expect(next.ease).toBe(2.5);
      expect(next.reps).toBe(3);
    });

    it("handles 'good' for initial reviews (interval 0 -> 1, interval 1 -> 3)", () => {
      const brandNew = sampleWord();
      const firstReview = calculateNextReview(brandNew, "good", today);
      expect(firstReview.intervalDays).toBe(1);
      expect(firstReview.dueAt).toBe("2026-10-06");

      const wordInterval1 = sampleWord({ intervalDays: 1, reps: 1 });
      const secondReview = calculateNextReview(wordInterval1, "good", today);
      expect(secondReview.intervalDays).toBe(3);
      expect(secondReview.dueAt).toBe("2026-10-08");
    });

    it("handles 'easy': increases ease and applies bonus factor", () => {
      const word = sampleWord({
        intervalDays: 3,
        ease: 2.5,
        reps: 2,
        lapses: 0,
      });

      const next = calculateNextReview(word, "easy", today);
      // Math.round(3 * 2.5 * 1.3) = round(9.75) = 10
      expect(next.intervalDays).toBe(10);
      expect(next.dueAt).toBe("2026-10-15");
      expect(next.ease).toBe(2.65);
      expect(next.reps).toBe(3);
    });
  });

  describe("isWordDue (RF01, RF08, CA01, CA08)", () => {
    const today = "2026-10-05";

    it("returns true if dueAt <= today (CA01)", () => {
      expect(isWordDue(sampleWord({ dueAt: "2026-10-05" }), today)).toBe(true);
      expect(isWordDue(sampleWord({ dueAt: "2026-10-04" }), today)).toBe(true);
    });

    it("returns true if dueAt is undefined (new unreviewed word)", () => {
      expect(isWordDue(sampleWord({ dueAt: undefined }), today)).toBe(true);
    });

    it("returns false if dueAt > today", () => {
      expect(isWordDue(sampleWord({ dueAt: "2026-10-06" }), today)).toBe(false);
    });

    it("returns false if word is marked as learned (suspended, RF08, CA08)", () => {
      expect(isWordDue(sampleWord({ learned: true, dueAt: "2026-10-04" }), today)).toBe(false);
      expect(isWordDue(sampleWord({ learned: true, dueAt: undefined }), today)).toBe(false);
    });
  });

  describe("getDueWords (CA01, CA04, CA08)", () => {
    const today = "2026-10-05";

    it("filters and sorts due words (CA01)", () => {
      const words: StudentWord[] = [
        sampleWord({ id: "w1", term: "future", dueAt: "2026-10-10" }),
        sampleWord({ id: "w2", term: "past", dueAt: "2026-10-01" }),
        sampleWord({ id: "w3", term: "today", dueAt: "2026-10-05" }),
        sampleWord({ id: "w4", term: "learned", learned: true, dueAt: "2026-10-01" }),
        sampleWord({ id: "w5", term: "unreviewed", dueAt: undefined }),
      ];

      const due = getDueWords(words, today);
      expect(due.map((w) => w.id)).toEqual(["w2", "w3", "w5"]);
    });

    it("caps results by daily limit (CA04)", () => {
      const words: StudentWord[] = Array.from({ length: 50 }, (_, i) =>
        sampleWord({
          id: `w${i}`,
          term: `word ${i}`,
          dueAt: "2026-10-01",
        }),
      );

      const due = getDueWords(words, today, 20);
      expect(due).toHaveLength(20);
    });
  });

  describe("calculateStreak (RF06, CA06)", () => {
    const today = "2026-10-05";

    it("returns 0 when no reviews exist", () => {
      expect(calculateStreak([], today)).toBe(0);
    });

    it("returns 1 if reviewed only today", () => {
      expect(calculateStreak(["2026-10-05"], today)).toBe(1);
    });

    it("returns 1 if reviewed only yesterday", () => {
      expect(calculateStreak(["2026-10-04"], today)).toBe(1);
    });

    it("returns 2 if reviewed yesterday and today (CA06)", () => {
      expect(calculateStreak(["2026-10-04", "2026-10-05"], today)).toBe(2);
    });

    it("returns correct streak for a sequence of 4 consecutive days", () => {
      expect(
        calculateStreak(
          ["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"],
          today,
        ),
      ).toBe(4);
    });

    it("resets streak to 0 if last review was 2 days ago", () => {
      expect(calculateStreak(["2026-10-03", "2026-10-02"], today)).toBe(0);
    });

    it("works when passed an array of StudentWord objects", () => {
      const words: StudentWord[] = [
        sampleWord({ id: "1", lastReviewedAt: "2026-10-04T12:00:00.000Z" }),
        sampleWord({ id: "2", lastReviewedAt: "2026-10-05T14:30:00.000Z" }),
      ];

      expect(calculateStreak(words, today)).toBe(2);
    });
  });

  describe("getVocabularyReviewStats (RF07, CA07)", () => {
    const today = "2026-10-05";

    it("calculates mastered, inReview, overdue, and lastReviewedAt correctly (CA07)", () => {
      const words: StudentWord[] = [
        // 4 mastered words (intervalDays >= 21)
        sampleWord({ id: "m1", intervalDays: 21, dueAt: "2026-10-26" }),
        sampleWord({ id: "m2", intervalDays: 30, dueAt: "2026-11-04" }),
        sampleWord({ id: "m3", intervalDays: 45, dueAt: "2026-11-19" }),
        sampleWord({ id: "m4", intervalDays: 60, dueAt: "2026-12-04" }),
        // 2 in review words (0 < intervalDays < 21)
        sampleWord({
          id: "r1",
          intervalDays: 8,
          dueAt: "2026-10-04", // overdue
          lastReviewedAt: "2026-09-26T15:00:00.000Z",
        }),
        sampleWord({
          id: "r2",
          intervalDays: 3,
          dueAt: "2026-10-08",
          lastReviewedAt: "2026-10-05T09:00:00.000Z", // latest
        }),
        // 1 learned (suspended) word
        sampleWord({ id: "l1", learned: true, intervalDays: 25 }),
      ];

      const stats = getVocabularyReviewStats(words, today);
      expect(stats.mastered).toBe(4);
      expect(stats.masteredCount).toBe(4);
      expect(stats.inReview).toBe(2);
      expect(stats.dueCount).toBe(1); // r1 is dueAt 2026-10-04 <= 2026-10-05
      expect(stats.suspendedCount).toBe(1);
      expect(stats.lastReviewedAt).toBe("2026-10-05T09:00:00.000Z");
    });
  });
});
