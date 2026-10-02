import { CATEGORIES, type Category } from "../activities/categories";
import type { ActivityDoc } from "../activities/schema/activity";
import type { CatalogIndex, CatalogItem } from "./schema";

export const SECTION_SIZE = 20;
export const NEW_BADGE_DAYS = 14;

/** Builds the aggregated index from published activities, newest first. */
export function buildCatalogIndex(
  activities: readonly { id: string; data: ActivityDoc<Date> }[],
  now = new Date(),
): CatalogIndex {
  const items = activities
    .filter(({ data }) => data.status === "published")
    .map(({ id, data }): CatalogItem => ({
      id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      category: data.category,
      type: data.type,
      levelMin: data.levelMin,
      levelMax: data.levelMax,
      tags: data.tags ?? [],
      thumbnail: { src: data.thumbnail.src, alt: data.thumbnail.alt },
      // Documents written outside the schema (by hand, old seeds) may lack these.
      featured: data.featured ?? false,
      createdAt: data.createdAt.toISOString(),
    }));

  return { schemaVersion: 1, updatedAt: now.toISOString(), items: sortNewestFirst(items) };
}

export function sortNewestFirst(items: readonly CatalogItem[]): CatalogItem[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function latest(items: readonly CatalogItem[], size = SECTION_SIZE): CatalogItem[] {
  return sortNewestFirst(items).slice(0, size);
}

/** One section per category in catalog order; categories without activities are left out. */
export function sectionsByCategory(
  items: readonly CatalogItem[],
  size = SECTION_SIZE,
): { category: Category; items: CatalogItem[] }[] {
  const sorted = sortNewestFirst(items);
  return CATEGORIES.map((category) => ({
    category,
    items: sorted.filter((item) => item.category === category.id).slice(0, size),
  })).filter((section) => section.items.length > 0);
}

export function isNew(createdAt: string, now: Date, days = NEW_BADGE_DAYS): boolean {
  const age = now.getTime() - new Date(createdAt).getTime();
  return age >= 0 && age <= days * 24 * 60 * 60 * 1000;
}

/** Home highlights: featured activities first (newest first), then the newest others. */
export function homeHighlights(items: readonly CatalogItem[], size = 6): CatalogItem[] {
  const newest = sortNewestFirst(items);
  return [...newest.filter((i) => i.featured), ...newest.filter((i) => !i.featured)].slice(0, size);
}
