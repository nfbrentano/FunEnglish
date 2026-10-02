import { CATEGORY_IDS, type CategoryId } from "../activities/categories";
import { ACTIVITY_TYPES, type ActivityType } from "../activities/schema/activity";
import { normalizeText } from "../activities/search";
import type { AdminActivity } from "./activities-admin";

export type AdminFilters = {
  q: string;
  category: CategoryId | "";
  status: "draft" | "published" | "";
  type: ActivityType | "";
  needsReview: boolean;
  sort: AdminSort;
};

export const ADMIN_SORTS = ["updated", "title", "category", "status"] as const;
export type AdminSort = (typeof ADMIN_SORTS)[number];

export const NO_ADMIN_FILTERS: AdminFilters = {
  q: "",
  category: "",
  status: "",
  type: "",
  needsReview: false,
  sort: "updated",
};

export const needsReview = (a: Pick<AdminActivity, "origin" | "reviewStatus">) =>
  a.origin === "ai" && a.reviewStatus === "pending";

const BY: Record<AdminSort, (a: AdminActivity, b: AdminActivity) => number> = {
  updated: (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
  title: (a, b) => a.title.localeCompare(b.title, "en"),
  category: (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title, "en"),
  // Drafts first: they're the work in progress.
  status: (a, b) => a.status.localeCompare(b.status) || a.title.localeCompare(b.title, "en"),
};

/** Filters → query string, so a filtered list can be bookmarked or shared (RF14). */
export function serializeAdminFilters(filters: AdminFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.needsReview) params.set("review", "1");
  if (filters.sort !== "updated") params.set("sort", filters.sort);
  return params.toString();
}

export function parseAdminFilters(search: string): AdminFilters {
  const params = new URLSearchParams(search);
  const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T) =>
    value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  return {
    q: params.get("q") ?? "",
    category: pick(params.get("category"), CATEGORY_IDS, ""),
    status: pick(params.get("status"), ["draft", "published"] as const, ""),
    type: pick(params.get("type"), ACTIVITY_TYPES, ""),
    needsReview: params.get("review") === "1",
    sort: pick(params.get("sort"), ADMIN_SORTS, "updated"),
  };
}

/** Filtered and sorted list (most recently updated first by default). */
export function filterAdminActivities(
  items: readonly AdminActivity[],
  filters: AdminFilters,
): AdminActivity[] {
  const q = normalizeText(filters.q.trim());
  return items
    .filter(
      (a) =>
        (!q || normalizeText(a.title).includes(q)) &&
        (!filters.category || a.category === filters.category) &&
        (!filters.status || a.status === filters.status) &&
        (!filters.type || a.type === filters.type) &&
        (!filters.needsReview || needsReview(a)),
    )
    .sort(BY[filters.sort]);
}
