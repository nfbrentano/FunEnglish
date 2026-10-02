import { beforeEach, describe, expect, it, vi } from "vitest";
import { validQuiz } from "../activities/fixtures";

const firestore = vi.hoisted(() => ({
  docs: [] as { id: string; data: () => Record<string, unknown> }[],
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: firestore.docs })),
}));
vi.mock("firebase/firestore/lite", () => firestore);
vi.mock("@/lib/firebase", () => ({ getLiteDb: () => ({}) }));

const { fetchPublishedActivity } = await import("@/lib/player/load-activity");

beforeEach(() => {
  firestore.docs = [];
});

describe("fetchPublishedActivity", () => {
  it("plays activities saved in the admin panel (editedInPanelAt is a Timestamp)", async () => {
    firestore.docs = [
      {
        id: "a1",
        data: () => ({
          ...validQuiz(),
          status: "published",
          editedInPanelAt: { toDate: () => new Date(), seconds: 1, nanoseconds: 0 },
          searchTokens: ["quiz"],
        }),
      },
    ];
    const activity = await fetchPublishedActivity(String(validQuiz().slug));
    expect(activity).toMatchObject({ id: "a1", slug: validQuiz().slug, type: "quiz" });
    expect(activity).not.toHaveProperty("editedInPanelAt");
  });

  it("returns undefined when the slug isn't published", async () => {
    expect(await fetchPublishedActivity("nope")).toBeUndefined();
  });
});
