import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeInactiveSessionsTask } from "./sessions.js";

describe("closeInactiveSessionsTask (RF11)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("closes sessions where lastActivityAt is older than 6 hours", async () => {
    const now = new Date("2026-10-04T18:00:00Z");
    const sevenHoursAgo = new Date("2026-10-04T11:00:00Z");
    const twoHoursAgo = new Date("2026-10-04T16:00:00Z");

    const mockOldDocRef = { id: "s-old", path: "users/u1/sessions/s-old" };
    const mockRecentDocRef = { id: "s-recent", path: "users/u1/sessions/s-recent" };

    const mockDocs = [
      {
        ref: mockOldDocRef,
        data: () => ({
          status: "active",
          startedAt: sevenHoursAgo,
          lastActivityAt: sevenHoursAgo,
        }),
      },
      {
        ref: mockRecentDocRef,
        data: () => ({
          status: "active",
          startedAt: twoHoursAgo,
          lastActivityAt: twoHoursAgo,
        }),
      },
    ];

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };

    const mockDb = {
      collectionGroup: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ docs: mockDocs }),
        }),
      }),
      batch: vi.fn().mockReturnValue(mockBatch),
    };

    const closed = await closeInactiveSessionsTask(mockDb as unknown as any, now);

    expect(closed).toBe(1);
    expect(mockBatch.update).toHaveBeenCalledTimes(1);
    expect(mockBatch.update).toHaveBeenCalledWith(
      mockOldDocRef,
      expect.objectContaining({
        status: "draft",
        autoClosedReason: "inactivity_timeout_6h",
      }),
    );
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it("does nothing when all active sessions are recent", async () => {
    const now = new Date("2026-10-04T18:00:00Z");
    const oneHourAgo = new Date("2026-10-04T17:00:00Z");

    const mockDocs = [
      {
        ref: { id: "s-1" },
        data: () => ({
          status: "active",
          startedAt: oneHourAgo,
          lastActivityAt: oneHourAgo,
        }),
      },
    ];

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };

    const mockDb = {
      collectionGroup: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ docs: mockDocs }),
        }),
      }),
      batch: vi.fn().mockReturnValue(mockBatch),
    };

    const closed = await closeInactiveSessionsTask(mockDb as unknown as any, now);

    expect(closed).toBe(0);
    expect(mockBatch.update).not.toHaveBeenCalled();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});

describe("cleanupExpiredLiveRoomsTask (RNF08)", () => {
  it("cleans up live rooms older than 24 hours", async () => {
    const now = new Date("2026-10-05T12:00:00Z");
    const twentyFiveHoursAgo = now.getTime() - 25 * 60 * 60 * 1000;
    const twoHoursAgo = now.getTime() - 2 * 60 * 60 * 1000;

    const mockRooms = {
      OLD123: {
        createdAt: twentyFiveHoursAgo,
        state: { mode: "ended" },
      },
      RECENT: {
        createdAt: twoHoursAgo,
        state: { mode: "activity" },
      },
    };

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRtdb = {
      ref: vi.fn((path?: string) => {
        if (!path || path === "") {
          return { update: mockUpdate };
        }
        return {
          once: vi.fn().mockResolvedValue({
            exists: () => true,
            val: () => mockRooms,
          }),
        };
      }),
    };

    const { cleanupExpiredLiveRoomsTask } = await import("./sessions.js");
    const count = await cleanupExpiredLiveRoomsTask(mockRtdb as unknown as any, now);

    expect(count).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      "liveRooms/OLD123": null,
      "liveRoomPins/OLD123": null,
    });
  });
});
