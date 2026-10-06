import type { StudentWord } from "./types";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface SrsResult {
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  dueAt: string;
}

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Returns today's date formatted as YYYY-MM-DD in the given timezone (RNF06).
 */
export function getTodayDateString(
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    // Fallback to UTC if timeZone is invalid
    return now.toISOString().slice(0, 10);
  }
}

/**
 * Safely adds N calendar days to a YYYY-MM-DD date string.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Calculates days difference between two YYYY-MM-DD date strings (b - a).
 */
export function diffDays(dateA: string, dateB: string): number {
  const [y1, m1, d1] = dateA.split("-").map(Number);
  const [y2, m2, d2] = dateB.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

/**
 * Pure SM-2 scheduling algorithm calculation (RF03, RNF04, CA03).
 */
export function calculateNextReview(
  word: {
    intervalDays?: number;
    ease?: number;
    reps?: number;
    lapses?: number;
  },
  rating: ReviewRating,
  todayStr: string = getTodayDateString(),
): SrsResult {
  const intervalDays = word.intervalDays ?? 0;
  const ease = word.ease ?? 2.5;
  const reps = word.reps ?? 0;
  const lapses = word.lapses ?? 0;

  let newInterval: number;
  let newEase: number;
  let newReps: number;
  let newLapses: number;

  switch (rating) {
    case "again":
      newReps = 0;
      newLapses = lapses + 1;
      newInterval = 1;
      newEase = Math.max(1.3, Number((ease - 0.2).toFixed(2)));
      break;

    case "hard":
      newReps = reps + 1;
      newLapses = lapses;
      newInterval = Math.max(1, Math.round((intervalDays || 1) * 1.2));
      newEase = Math.max(1.3, Number((ease - 0.15).toFixed(2)));
      break;

    case "good":
      newReps = reps + 1;
      newLapses = lapses;
      newEase = ease;
      if (intervalDays === 0) {
        newInterval = 1;
      } else if (intervalDays === 1) {
        newInterval = 3;
      } else {
        newInterval = Math.round(intervalDays * ease);
      }
      break;

    case "easy":
      newReps = reps + 1;
      newLapses = lapses;
      newEase = Number((ease + 0.15).toFixed(2));
      if (intervalDays === 0) {
        newInterval = 4;
      } else if (intervalDays === 1) {
        newInterval = 5;
      } else {
        newInterval = Math.round(intervalDays * ease * 1.3);
      }
      break;
  }

  const dueAt = addDaysToDateString(todayStr, newInterval);

  return {
    intervalDays: newInterval,
    ease: newEase,
    reps: newReps,
    lapses: newLapses,
    dueAt,
  };
}

/**
 * Checks if a word is due for review today (RF01, RF08, CA01, CA08).
 * Words marked as "learned" are suspended and not due.
 */
export function isWordDue(word: StudentWord, todayStr: string = getTodayDateString()): boolean {
  if (word.learned) return false;
  if (!word.dueAt) return true;
  return word.dueAt <= todayStr;
}

/**
 * Returns the list of words due for review today, sorted and capped by daily limit (RF01, RF04, CA01, CA04).
 */
export function getDueWords(
  words: StudentWord[],
  todayStr: string = getTodayDateString(),
  limit?: number,
): StudentWord[] {
  const due = words.filter((w) => isWordDue(w, todayStr));

  // Sort: words with older due dates first, then unreviewed words
  due.sort((a, b) => {
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;
    return a.term.localeCompare(b.term);
  });

  if (typeof limit === "number" && limit > 0) {
    return due.slice(0, limit);
  }

  return due;
}

/**
 * Calculates review streak based on unique review completion date strings or word list (RF06, CA06).
 */
export function calculateStreak(
  input: string[] | StudentWord[],
  todayStr: string = getTodayDateString(),
): number {
  if (!input || input.length === 0) return 0;

  let reviewDates: string[];
  if (typeof input[0] === "string") {
    reviewDates = input as string[];
  } else {
    reviewDates = (input as StudentWord[])
      .map((w) => (w.lastReviewedAt ? w.lastReviewedAt.split("T")[0] : null))
      .filter((d): d is string => Boolean(d));
  }

  if (reviewDates.length === 0) return 0;

  const uniqueDates = Array.from(new Set(reviewDates)).sort((a, b) => b.localeCompare(a));
  const hasToday = uniqueDates.includes(todayStr);
  const yesterdayStr = addDaysToDateString(todayStr, -1);
  const hasYesterday = uniqueDates.includes(yesterdayStr);

  if (!hasToday && !hasYesterday) {
    return 0;
  }

  let streak = 0;
  let checkDate = hasToday ? todayStr : yesterdayStr;

  while (uniqueDates.includes(checkDate)) {
    streak++;
    checkDate = addDaysToDateString(checkDate, -1);
  }

  return streak;
}

export interface VocabularyReviewStats {
  total: number;
  mastered: number;
  masteredCount: number; // alias
  inReview: number;
  inReviewCount: number; // alias
  dueCount: number;
  overdueCount: number; // alias
  suspendedCount: number; // learned === true
  lastReviewedAt?: string;
}

/**
 * Aggregates vocabulary review stats for teacher / overview display (RF07, CA07).
 */
export function getVocabularyReviewStats(
  words: StudentWord[],
  todayStr: string = getTodayDateString(),
): VocabularyReviewStats {
  let masteredCount = 0;
  let inReviewCount = 0;
  let overdueCount = 0;
  let suspendedCount = 0;
  let latestReviewTime = 0;
  let lastReviewedAt: string | undefined;

  for (const w of words) {
    if (w.learned) {
      suspendedCount++;
    } else {
      const interval = w.intervalDays ?? 0;
      if (interval >= 21) {
        masteredCount++;
      } else if (interval > 0) {
        inReviewCount++;
      }

      if (isWordDue(w, todayStr)) {
        overdueCount++;
      }
    }

    if (w.lastReviewedAt) {
      const t = new Date(w.lastReviewedAt).getTime();
      if (!isNaN(t) && t > latestReviewTime) {
        latestReviewTime = t;
        lastReviewedAt = w.lastReviewedAt;
      }
    }
  }

  return {
    total: words.length,
    mastered: masteredCount,
    masteredCount,
    inReview: inReviewCount,
    inReviewCount,
    dueCount: overdueCount,
    overdueCount,
    suspendedCount,
    lastReviewedAt,
  };
}
