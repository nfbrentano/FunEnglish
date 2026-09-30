import { describe, expect, it } from "vitest";
import type { ActivityDoc } from "@/lib/activities/schema/activity";
import type { CatalogItem } from "@/lib/catalog/schema";
import { catalogIndexSchema } from "@/lib/catalog/schema";
import { buildCatalogIndex, isNew, latest, sectionsByCategory } from "@/lib/catalog/sections";

function item(slug: string, category: CatalogItem["category"], createdAt: string): CatalogItem {
  return {
    id: slug,
    slug,
    title: slug,
    description: "",
    category,
    type: "quiz",
    levelMin: "beginner",
    levelMax: "advanced",
    tags: [],
    thumbnail: { src: `/images/${slug}.webp`, alt: slug },
    featured: false,
    createdAt,
  };
}

describe("buildCatalogIndex", () => {
  const doc = (slug: string, status: "draft" | "published", day: number) => ({
    id: slug,
    data: {
      slug,
      title: slug,
      description: "d",
      category: "grammar",
      type: "quiz",
      levelMin: "beginner",
      levelMax: "intermediate",
      tags: ["t"],
      status,
      featured: false,
      thumbnail: { src: "/x.webp", alt: "x", source: "ai" },
      createdAt: new Date(Date.UTC(2026, 8, day)),
      updatedAt: new Date(),
    } as unknown as ActivityDoc<Date>,
  });

  it("keeps only published activities, newest first, in a valid index", () => {
    const index = buildCatalogIndex([
      doc("old", "published", 1),
      doc("draft", "draft", 5),
      doc("new", "published", 3),
    ]);

    expect(index.items.map((i) => i.slug)).toEqual(["new", "old"]);
    expect(catalogIndexSchema.safeParse(index).success).toBe(true);
  });
});

describe("latest", () => {
  it("returns up to N items, newest first", () => {
    const items = Array.from({ length: 25 }, (_, i) =>
      item(`a${i}`, "fun", new Date(Date.UTC(2026, 0, i + 1)).toISOString()),
    );
    const result = latest(items);

    expect(result).toHaveLength(20);
    expect(result[0].slug).toBe("a24");
  });
});

describe("sectionsByCategory", () => {
  it("follows the category order and skips empty categories", () => {
    const sections = sectionsByCategory([
      item("w", "writing", "2026-09-01T00:00:00.000Z"),
      item("f", "fun", "2026-09-02T00:00:00.000Z"),
      item("g", "grammar", "2026-09-03T00:00:00.000Z"),
    ]);

    expect(sections.map((s) => s.category.id)).toEqual(["fun", "grammar", "writing"]);
  });
});

describe("isNew", () => {
  const now = new Date("2026-09-30T12:00:00Z");

  it("is true up to 14 days old", () => {
    expect(isNew("2026-09-17T12:00:00Z", now)).toBe(true);
    expect(isNew("2026-09-15T11:00:00Z", now)).toBe(false);
  });
});
