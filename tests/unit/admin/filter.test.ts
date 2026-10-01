import { describe, expect, it } from "vitest";
import type { AdminActivity } from "@/lib/admin/activities-admin";
import { filterAdminActivities, needsReview, NO_ADMIN_FILTERS } from "@/lib/admin/filter";

const make = (over: Partial<AdminActivity>): AdminActivity =>
  ({
    id: over.slug,
    title: "Activity",
    category: "grammar",
    status: "published",
    type: "quiz",
    origin: "human",
    reviewStatus: "reviewed",
    updatedAt: new Date("2026-09-01"),
    ...over,
  }) as AdminActivity;

const items = [
  make({
    slug: "a",
    title: "Café Vocabulary",
    category: "vocabulary",
    updatedAt: new Date("2026-09-02"),
  }),
  make({ slug: "b", title: "Past Tense", origin: "ai", reviewStatus: "pending", status: "draft" }),
  make({
    slug: "c",
    title: "Quiz Board",
    type: "quiz-board",
    origin: "ai",
    updatedAt: new Date("2026-09-03"),
  }),
];
const slugs = (list: AdminActivity[]) => list.map((a) => a.slug);

describe("filterAdminActivities", () => {
  it("returns everything, most recently updated first", () => {
    expect(slugs(filterAdminActivities(items, NO_ADMIN_FILTERS))).toEqual(["c", "a", "b"]);
  });

  it("filters by text ignoring accents and case", () => {
    expect(slugs(filterAdminActivities(items, { ...NO_ADMIN_FILTERS, q: "cafe" }))).toEqual(["a"]);
  });

  it("combines category, status and type", () => {
    expect(slugs(filterAdminActivities(items, { ...NO_ADMIN_FILTERS, status: "draft" }))).toEqual([
      "b",
    ]);
    expect(
      slugs(filterAdminActivities(items, { ...NO_ADMIN_FILTERS, type: "quiz-board" })),
    ).toEqual(["c"]);
    expect(
      slugs(
        filterAdminActivities(items, {
          ...NO_ADMIN_FILTERS,
          category: "vocabulary",
          status: "draft",
        }),
      ),
    ).toEqual([]);
  });

  it("needs review = AI-generated and still pending", () => {
    expect(slugs(filterAdminActivities(items, { ...NO_ADMIN_FILTERS, needsReview: true }))).toEqual(
      ["b"],
    );
    expect(needsReview({ origin: "human", reviewStatus: "pending" })).toBe(false);
  });
});
