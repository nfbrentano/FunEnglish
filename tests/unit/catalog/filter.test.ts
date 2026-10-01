import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  filterCatalog,
  hasActiveFilters,
  matchesQuery,
  parseFilters,
  serializeFilters,
} from "@/lib/catalog/filter";
import { catalogItem } from "./factory";

const cafe = catalogItem({
  slug: "cafe",
  title: "Café Vocabulary",
  category: "vocabulary",
  levelMax: "beginner",
});
const verbs = catalogItem({
  slug: "verbs",
  title: "50 Common Irregular Verbs",
  description: "Practice the past simple.",
  tags: ["past tense"],
  levelMin: "beginner",
  levelMax: "intermediate",
  createdAt: "2026-09-10T00:00:00.000Z",
});
const idioms = catalogItem({
  slug: "idioms",
  title: "Idioms 2",
  category: "vocabulary",
  levelMin: "intermediate",
  createdAt: "2026-09-20T00:00:00.000Z",
});
const items = [cafe, verbs, idioms];

describe("matchesQuery", () => {
  it("ignores accents and case", () => {
    expect(matchesQuery(cafe, "CAFE")).toBe(true);
  });

  it("needs every word, matching word starts in title, description or tags", () => {
    expect(matchesQuery(verbs, "irregular verbs")).toBe(true);
    expect(matchesQuery(verbs, "irreg verb")).toBe(true);
    expect(matchesQuery(verbs, "past")).toBe(true);
    expect(matchesQuery(verbs, "irregular nouns")).toBe(false);
    expect(matchesQuery(verbs, "regular")).toBe(false);
  });
});

describe("filterCatalog", () => {
  it("filters by category", () => {
    const result = filterCatalog(items, { ...DEFAULT_FILTERS, category: "vocabulary" });
    expect(result.map((i) => i.slug)).toEqual(["idioms", "cafe"]);
  });

  it("keeps activities whose level range includes the chosen level", () => {
    expect(filterCatalog([verbs], { ...DEFAULT_FILTERS, level: "intermediate" })).toHaveLength(1);
    expect(filterCatalog([verbs], { ...DEFAULT_FILTERS, level: "advanced" })).toHaveLength(0);
  });

  it("sorts newest first, A-Z and Z-A (numbers in natural order)", () => {
    const titles = (sort: (typeof DEFAULT_FILTERS)["sort"]) =>
      filterCatalog(items, { ...DEFAULT_FILTERS, sort }).map((i) => i.title);

    expect(titles("newest")).toEqual(["Idioms 2", "50 Common Irregular Verbs", "Café Vocabulary"]);
    expect(titles("title-asc")).toEqual([
      "50 Common Irregular Verbs",
      "Café Vocabulary",
      "Idioms 2",
    ]);
    expect(titles("title-desc")).toEqual([
      "Idioms 2",
      "Café Vocabulary",
      "50 Common Irregular Verbs",
    ]);
  });

  it("combines search, category and level", () => {
    const result = filterCatalog(items, {
      q: "idioms",
      category: "vocabulary",
      level: "advanced",
      sort: "newest",
    });
    expect(result.map((i) => i.slug)).toEqual(["idioms"]);
  });
});

describe("URL state", () => {
  it("round-trips and omits defaults", () => {
    const filters = {
      q: "idioms",
      category: "vocabulary",
      level: "advanced",
      sort: "title-asc",
    } as const;
    expect(serializeFilters(filters)).toBe(
      "?q=idioms&category=vocabulary&level=advanced&sort=title-asc",
    );
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
    expect(serializeFilters(DEFAULT_FILTERS)).toBe("");
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it("ignores unknown values", () => {
    expect(parseFilters("?category=cooking&level=expert&sort=random&q=%20hi%20")).toEqual({
      ...DEFAULT_FILTERS,
      q: "hi",
    });
  });
});

describe("catalog index size", () => {
  it("stays under 300 KB gzipped with 2,000 activities", () => {
    const many = Array.from({ length: 2000 }, (_, i) =>
      catalogItem({
        slug: `activity-number-${i}`,
        title: `Present Perfect Practice Activity ${i}`,
        description:
          "Practice the present perfect with everyday situations, in a fun quiz for the whole class.",
        tags: ["present perfect", "grammar", "tenses", "quiz"],
        thumbnail: {
          src: `/images/activities/activity-number-${i}/thumb.webp`,
          alt: "Students talking in a classroom",
        },
      }),
    );
    const bytes = gzipSync(JSON.stringify({ schemaVersion: 1, updatedAt: "", items: many })).length;
    expect(bytes).toBeLessThan(300 * 1024);
  });
});
