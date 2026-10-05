import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn();
const mockRef = vi.fn((...args: any[]) => ({ path: args[1] }));
const mockOnValue = vi.fn();
const mockOnDisconnect = vi.fn().mockReturnValue({
  update: vi.fn().mockResolvedValue(undefined),
});

vi.mock("firebase/database", () => ({
  ref: (...args: any[]) => mockRef(...args),
  set: (...args: any[]) => mockSet(...args),
  get: (...args: any[]) => mockGet(...args),
  update: (...args: any[]) => mockUpdate(...args),
  onValue: (...args: any[]) => mockOnValue(...args),
  onDisconnect: (...args: any[]) => mockOnDisconnect(...args),
}));

vi.mock("@/lib/firebase", () => ({
  getDatabaseInstance: vi.fn().mockReturnValue({}),
}));

const mockSignInAnonymously = vi.fn().mockResolvedValue({ user: { uid: "anon-student-1" } });
vi.mock("@/lib/auth/firebase-auth", () => ({
  loadAuth: vi.fn().mockResolvedValue({
    auth: { currentUser: null },
    sdk: {
      signInAnonymously: (...args: any[]) => mockSignInAnonymously(...args),
    },
  }),
}));

vi.mock("@/lib/classes/pin", () => ({
  hashHomeworkPin: vi.fn().mockImplementation((pin: string) => Promise.resolve(`hash-${pin}`)),
}));

import {
  createLiveRoom,
  endLiveRoom,
  joinLiveRoom,
  kickParticipant,
  revealCurrentQuestion,
  setAllowGuests,
  setHideLeaderboard,
  setRoomLocked,
  submitLiveAnswer,
  updateLiveRoomState,
} from "@/lib/live/repository";

describe("Live Room Repository (SDD/2026-10-03_09-sala-ao-vivo.md)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createLiveRoom initializes liveRooms/{code} and liveRoomPins/{code} (RF01, RNF01)", async () => {
    const room = await createLiveRoom({
      code: "ABCDEF",
      teacherUid: "teacher-1",
      sessionId: "session-1",
      className: "Teens B1",
      roster: [
        { studentId: "s1", firstName: "Ana", fullName: "Ana Silva" },
        { studentId: "s2", firstName: "Bruno", fullName: "Bruno Santos" },
      ],
      studentPins: {
        s1: "hash-1234",
        s2: "hash-5678",
      },
    });

    expect(room.code).toBe("ABCDEF");
    expect(room.className).toBe("Teens B1");
    expect(room.state.mode).toBe("lobby");
    expect(room.roster["s1"].firstName).toBe("Ana");

    // Two set calls: room and pins
    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: "liveRooms/ABCDEF" }),
      expect.objectContaining({ code: "ABCDEF", teacherUid: "teacher-1" }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: "liveRoomPins/ABCDEF" }),
      { s1: "hash-1234", s2: "hash-5678" },
    );
  });

  it("joinLiveRoom succeeds with valid studentId and PIN (CA02)", async () => {
    // Mock room data
    mockGet.mockImplementation((targetRef: { path: string }) => {
      if (targetRef.path === "liveRooms/ABCDEF") {
        return Promise.resolve({
          exists: () => true,
          val: () => ({
            code: "ABCDEF",
            locked: false,
            roster: {
              s1: { studentId: "s1", firstName: "Ana", fullName: "Ana Silva" },
            },
            participants: {},
          }),
        });
      }
      if (targetRef.path === "liveRoomPins/ABCDEF/s1") {
        return Promise.resolve({
          exists: () => true,
          val: () => "hash-1234",
        });
      }
      return Promise.resolve({ exists: () => false });
    });

    const result = await joinLiveRoom({
      code: "ABCDEF",
      name: "Ana Silva",
      studentId: "s1",
      pin: "1234",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.participant.studentId).toBe("s1");
      expect(result.participant.via).toBe("pin");
      expect(result.participant.online).toBe(true);
    }

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: "liveRooms/ABCDEF/participants/anon-student-1" }),
      expect.objectContaining({ name: "Ana Silva", studentId: "s1" }),
    );
  });

  it("joinLiveRoom fails when PIN is incorrect (CA03)", async () => {
    mockGet.mockImplementation((targetRef: { path: string }) => {
      if (targetRef.path === "liveRooms/ABCDEF") {
        return Promise.resolve({
          exists: () => true,
          val: () => ({
            code: "ABCDEF",
            locked: false,
            roster: {
              s1: { studentId: "s1", firstName: "Ana", fullName: "Ana Silva" },
            },
            participants: {},
          }),
        });
      }
      if (targetRef.path === "liveRoomPins/ABCDEF/s1") {
        return Promise.resolve({
          exists: () => true,
          val: () => "hash-1234",
        });
      }
      return Promise.resolve({ exists: () => false });
    });

    const result = await joinLiveRoom({
      code: "ABCDEF",
      name: "Ana Silva",
      studentId: "s1",
      pin: "9999", // Wrong PIN!
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("WRONG_PIN");
    }
  });

  it("joinLiveRoom fails when room is locked (CA04)", async () => {
    mockGet.mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        code: "ABCDEF",
        locked: true,
        roster: {},
        participants: {},
      }),
    });

    const result = await joinLiveRoom({
      code: "ABCDEF",
      name: "Guest",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("LOCKED");
    }
  });

  it("kickParticipant marks participant kicked and offline (CA04)", async () => {
    await kickParticipant("ABCDEF", "p-bruno");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "liveRooms/ABCDEF/participants/p-bruno" }),
      { online: false, kicked: true },
    );
  });

  it("setRoomLocked updates locked state", async () => {
    await setRoomLocked("ABCDEF", true);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "liveRooms/ABCDEF" }),
      { locked: true },
    );
  });

  it("revealCurrentQuestion calculates correctness and updates scores (CA06)", async () => {
    mockGet.mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        code: "ABCDEF",
        participants: {
          u1: { uid: "u1", name: "Ana", score: 0 },
          u2: { uid: "u2", name: "Bruno", score: 100 },
        },
        answers: {
          "0": {
            u1: { value: "Option A", at: 1000 },
            u2: { value: "Option B", at: 1000 },
          },
        },
      }),
    });

    const result = await revealCurrentQuestion({
      code: "ABCDEF",
      itemIndex: 0,
      activityType: "quiz",
      correctAnswers: ["Option A"],
    });

    expect(result.totalAnswered).toBe(2);
    expect(result.correctCount).toBe(1);
    expect(result.distribution["Option A"]).toBe(1);
    expect(result.distribution["Option B"]).toBe(1);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "liveRooms/ABCDEF/state/revealed": true,
        "liveRooms/ABCDEF/answers/0/u1/correct": true,
        "liveRooms/ABCDEF/answers/0/u2/correct": false,
      }),
    );
  });

  it("endLiveRoom sets mode to ended (RF12, CA11)", async () => {
    mockGet.mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        code: "ABCDEF",
        state: { mode: "ended" },
      }),
    });

    const ended = await endLiveRoom("ABCDEF");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "liveRooms/ABCDEF/state" }),
      { mode: "ended" },
    );
    expect(ended.state.mode).toBe("ended");
  });
});
