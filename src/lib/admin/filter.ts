import type { CategoryId } from "../activities/categories";
import type { ActivityType } from "../activities/schema/activity";
import { normalizeText } from "../activities/search";
import type { AdminActivity } from "./activities-admin";

export type AdminFilters = {
  q: string;
  category: CategoryId | "";
  status: "draft" | "published" | "";
  type: ActivityType | "";
  needsReview: boolean;
};

export const NO_ADMIN_FILTERS: AdminFilters = {
  q: "",
  category: "",
  status: "",
  type: "",
  needsReview: false,
};

export const needsReview = (a: Pick<AdminActivity, "origin" | "reviewStatus">) =>
  a.origin === "ai" && a.reviewStatus === "pending";

/** Filtered list, most recently updated first. */
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
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
}
