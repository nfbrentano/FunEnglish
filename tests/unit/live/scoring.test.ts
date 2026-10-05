import { describe, expect, it } from "vitest";
import {
  BASE_CORRECT_POINTS,
  calculateAnswerPoints,
  computeLeaderboard,
  MAX_SPEED_BONUS,
} from "@/lib/live/scoring";
import type { LiveParticipant } from "@/lib/live/types";

describe("Live Room Scoring & Leaderboard (RF05, CA07)", () => {
  it("awards 0 points if answer is incorrect", () => {
    const points = calculateAnswerPoints(false, 15000, 10000, 30);
    expect(points).toBe(0);
  });

  it("awards base points if answer is correct without timing info", () => {
    const points = calculateAnswerPoints(true);
    expect(points).toBe(BASE_CORRECT_POINTS);
  });

  it("awards base points + speed bonus based on elapsed time", () => {
    const startTime = 10000;
    // Answered instantly (0s elapsed)
    const instantPoints = calculateAnswerPoints(true, 10000, startTime, 30);
    expect(instantPoints).toBe(BASE_CORRECT_POINTS + MAX_SPEED_BONUS);

    // Answered midway (15s elapsed out of 30s)
    const midPoints = calculateAnswerPoints(true, 25000, startTime, 30);
    expect(midPoints).toBe(BASE_CORRECT_POINTS + Math.round(MAX_SPEED_BONUS * 0.5));

    // Answered at last second (30s elapsed)
    const lastSecondPoints = calculateAnswerPoints(true, 40000, startTime, 30);
    expect(lastSecondPoints).toBe(BASE_CORRECT_POINTS);
  });

  it("computes top 5 leaderboard with descending score and individual user rank (RF05, CA07)", () => {
    const participants: Record<string, LiveParticipant> = {
      p1: { uid: "p1", name: "Ana", via: "pin", online: true, joinedAt: 1, score: 350 },
      p2: { uid: "p2", name: "Bruno", via: "pin", online: true, joinedAt: 2, score: 500 },
      p3: { uid: "p3", name: "Carlos", via: "pin", online: true, joinedAt: 3, score: 200 },
      p4: { uid: "p4", name: "Diana", via: "pin", online: true, joinedAt: 4, score: 450 },
      p5: { uid: "p5", name: "Eduardo", via: "pin", online: true, joinedAt: 5, score: 150 },
      p6: { uid: "p6", name: "Fernanda", via: "pin", online: true, joinedAt: 6, score: 100 },
      p7: { uid: "p7", name: "Gabriel", via: "pin", online: true, joinedAt: 7, score: 50 },
    };

    // Current user is Gabriel (rank 7)
    const { top, userRank } = computeLeaderboard(participants, "p7", 5);

    expect(top).toHaveLength(5);
    expect(top[0].name).toBe("Bruno");
    expect(top[0].score).toBe(500);
    expect(top[0].rank).toBe(1);

    expect(top[1].name).toBe("Diana");
    expect(top[1].score).toBe(450);
    expect(top[1].rank).toBe(2);

    expect(top[2].name).toBe("Ana");
    expect(top[2].score).toBe(350);
    expect(top[2].rank).toBe(3);

    expect(top[3].name).toBe("Carlos");
    expect(top[3].score).toBe(200);
    expect(top[3].rank).toBe(4);

    expect(top[4].name).toBe("Eduardo");
    expect(top[4].score).toBe(150);
    expect(top[4].rank).toBe(5);

    expect(userRank).toBeDefined();
    expect(userRank?.name).toBe("Gabriel");
    expect(userRank?.rank).toBe(7);
    expect(userRank?.score).toBe(50);
  });
});
