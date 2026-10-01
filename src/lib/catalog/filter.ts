import { CATEGORY_IDS, type CategoryId } from "../activities/categories";
import { LEVELS, levelInRange, type Level } from "../activities/levels";
import { normalizeText } from "../activities/search";
import type { CatalogItem } from "./schema";

export const SORTS = ["newest", "title-asc", "title-desc"] as const;
export type Sort = (typeof SORTS)[number];

export type CatalogFilters = {
  q: string;
  category: CategoryId | null;
  level: Level | null;
  sort: Sort;
};

export const DEFAULT_FILTERS: CatalogFilters = {
  q: "",
  category: null,
  level: null,
  sort: "newest",
};

/** Reads `?q=&category=&level=&sort=`, ignoring unknown values. */
export function parseFilters(search: string | URLSearchParams): CatalogFilters {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const pick = <T extends string>(value: string | null, allowed: readonly T[]) =>
    allowed.includes(value as T) ? (value as T) : null;

  return {
    q: (params.get("q") ?? "").trim(),
    category: pick(params.get("category"), CATEGORY_IDS),
    level: pick(params.get("level"), LEVELS),
    sort: pick(params.get("sort"), SORTS) ?? "newest",
  };
}

/** Query string for the filters, without defaults ("" when nothing is set). */
export function serializeFilters(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.level) params.set("level", filters.level);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return serializeFilters(filters) !== "";
}

function words(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Every query word must start some word of the title, description or tags ("verb" finds "verbs"). */
export function matchesQuery(item: CatalogItem, query: string): boolean {
  const queryWords = words(query);
  if (queryWords.length === 0) return true;
  const itemWords = words([item.title, item.description, ...item.tags].join(" "));
  return queryWords.every((q) => itemWords.some((word) => word.startsWith(q)));
}

const byTitle = (a: CatalogItem, b: CatalogItem) =>
  a.title.localeCompare(b.title, "en", { sensitivity: "base", numeric: true });

export function filterCatalog(
  items: readonly CatalogItem[],
  filters: CatalogFilters,
): CatalogItem[] {
  const result = items.filter(
    (item) =>
      (!filters.category || item.category === filters.category) &&
      (!filters.level || levelInRange(filters.level, item.levelMin, item.levelMax)) &&
      matchesQuery(item, filters.q),
  );

  if (filters.sort === "title-asc") return result.sort(byTitle);
  if (filters.sort === "title-desc") return result.sort((a, b) => byTitle(b, a));
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
