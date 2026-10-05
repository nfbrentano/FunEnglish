import type { LiveParticipant } from "./types";

export const BASE_CORRECT_POINTS = 100;
export const MAX_SPEED_BONUS = 50;

/**
 * Calculates points awarded for an answer.
 * @param isCorrect Whether the answer is correct
 * @param answeredAt Timestamp when answer was submitted
 * @param questionStartedAt Timestamp when question opened
 * @param questionDurationSec Total duration in seconds (if timed, default 30s)
 */
export function calculateAnswerPoints(
  isCorrect: boolean,
  answeredAt?: number,
  questionStartedAt?: number,
  questionDurationSec = 30,
): number {
  if (!isCorrect) return 0;

  if (answeredAt && questionStartedAt && questionDurationSec > 0) {
    const elapsedSec = Math.max(0, (answeredAt - questionStartedAt) / 1000);
    const fractionRemaining = Math.max(0, 1 - elapsedSec / questionDurationSec);
    const speedBonus = Math.round(fractionRemaining * MAX_SPEED_BONUS);
    return BASE_CORRECT_POINTS + speedBonus;
  }

  return BASE_CORRECT_POINTS;
}

export interface RankedParticipant {
  uid: string;
  name: string;
  score: number;
  rank: number;
  isCurrentUser?: boolean;
}

/**
 * Computes sorted leaderboard of participants, returning top N (default 5 for RF05/CA07).
 */
export function computeLeaderboard(
  participants: Record<string, LiveParticipant>,
  currentUserId?: string,
  limit = 5,
): {
  top: RankedParticipant[];
  userRank?: RankedParticipant;
} {
  const list = Object.values(participants).filter((p) => p.online !== false || p.score > 0);

  // Sort descending by score, then ascending by name
  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  const ranked: RankedParticipant[] = list.map((p, idx) => ({
    uid: p.uid,
    name: p.name,
    score: p.score || 0,
    rank: idx + 1,
    isCurrentUser: p.uid === currentUserId,
  }));

  const top = ranked.slice(0, limit);
  const userRank = currentUserId ? ranked.find((r) => r.uid === currentUserId) : undefined;

  return { top, userRank };
}
