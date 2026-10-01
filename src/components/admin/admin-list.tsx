"use client";

import { ExternalLink, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES, getCategory } from "@/lib/activities/categories";
import { ACTIVITY_TYPES } from "@/lib/activities/schema/activity";
import { validateActivity } from "@/lib/activities/validate";
import { listActivities, saveActivity, type AdminActivity } from "@/lib/admin/activities-admin";
import {
  filterAdminActivities,
  NO_ADMIN_FILTERS,
  needsReview,
  type AdminFilters,
} from "@/lib/admin/filter";
import { PLUGINS } from "@/lib/player/registry";
import { strings } from "@/lib/strings";

const REBUILD_URL = "https://github.com/nfbrentano/FunEnglish/actions/workflows/deploy.yml";
const field = "min-h-11 rounded-full border border-border-strong bg-elevated px-4 text-sm text-fg";

export const editHref = (id: string, review = false) =>
  `/admin/edit?id=${encodeURIComponent(id)}${review ? "&review=1" : ""}`;

export function AdminList() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<AdminActivity[] | null>(null);
  const [filters, setFilters] = useState<AdminFilters>(NO_ADMIN_FILTERS);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listActivities()
      .then(setItems)
      .catch((error: unknown) => {
        console.warn("Could not list activities", error);
        setItems([]);
      });
  }, []);

  const shown = useMemo(
    () => (items ? filterAdminActivities(items, filters) : []),
    [items, filters],
  );
  const pending = items?.filter(needsReview).length ?? 0;
  const set = (patch: Partial<AdminFilters>) => setFilters((f) => ({ ...f, ...patch }));

  async function importFile(file: File) {
    try {
      const raw = JSON.parse(await file.text()) as Record<string, unknown>;
      // Server-managed fields are recreated on save.
      const rest = Object.fromEntries(
        Object.entries(raw).filter(
          ([key]) => !["id", "createdAt", "updatedAt", "searchTokens"].includes(key),
        ),
      );
      const result = validateActivity({ ...rest, status: "draft" });
      if (!result.ok) throw new Error(result.errors.join("\n"));
      const id = await saveActivity(null, {
        ...result.activity,
        origin: (rest.origin as AdminActivity["origin"]) ?? "human",
        reviewStatus: (rest.reviewStatus as AdminActivity["reviewStatus"]) ?? "pending",
      });
      router.push(editHref(id));
    } catch (error) {
      console.warn("Import failed", error);
      toast(strings.admin.importError);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-medium">{strings.admin.title}</h1>
          <p className="text-fg-secondary">{strings.admin.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/edit" className={buttonClasses("primary")}>
            <Plus aria-hidden="true" className="size-4" />
            {strings.admin.newActivity}
          </Link>
          <button
            type="button"
            className={buttonClasses("secondary")}
            onClick={() => fileRef.current?.click()}
          >
            <Upload aria-hidden="true" className="size-4" />
            {strings.admin.import}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label={strings.admin.import}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
              event.target.value = "";
            }}
          />
          <a
            href={REBUILD_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={strings.admin.rebuildHint}
            className={buttonClasses("ghost")}
          >
            {strings.admin.rebuild}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-subtle bg-secondary p-3">
        <label className="sr-only" htmlFor="admin-search">
          {strings.admin.search}
        </label>
        <input
          id="admin-search"
          type="search"
          placeholder={strings.admin.search}
          value={filters.q}
          onChange={(event) => set({ q: event.target.value })}
          className={`${field} min-w-56 flex-1`}
        />
        <select
          aria-label={strings.catalog.categoryFilter}
          value={filters.category}
          onChange={(e) => set({ category: e.target.value as AdminFilters["category"] })}
          className={field}
        >
          <option value="">{strings.catalog.allCategories}</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label={strings.admin.columns.status}
          value={filters.status}
          onChange={(e) => set({ status: e.target.value as AdminFilters["status"] })}
          className={field}
        >
          <option value="">{strings.admin.allStatuses}</option>
          <option value="draft">{strings.admin.statuses.draft}</option>
          <option value="published">{strings.admin.statuses.published}</option>
        </select>
        <select
          aria-label={strings.admin.columns.type}
          value={filters.type}
          onChange={(e) => set({ type: e.target.value as AdminFilters["type"] })}
          className={field}
        >
          <option value="">{strings.admin.allTypes}</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {PLUGINS[t].label}
            </option>
          ))}
        </select>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-sm">
          <input
            type="checkbox"
            checked={filters.needsReview}
            onChange={(e) => set({ needsReview: e.target.checked })}
            className="size-4 accent-(--accent)"
          />
          {strings.admin.needsReview}
          <span aria-live="polite" className="rounded-full bg-accent-muted px-2 text-accent">
            {strings.admin.needsReviewCount(pending)}
          </span>
        </label>
      </div>

      {items === null ? (
        <div role="status" aria-label={strings.admin.loading} className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-fg-secondary">{strings.admin.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-secondary text-xs tracking-wider text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  {strings.admin.columns.title}
                </th>
                <th scope="col" className="px-4 py-3">
                  {strings.admin.columns.category}
                </th>
                <th scope="col" className="px-4 py-3">
                  {strings.admin.columns.type}
                </th>
                <th scope="col" className="px-4 py-3">
                  {strings.admin.columns.status}
                </th>
                <th scope="col" className="px-4 py-3">
                  {strings.admin.columns.updated}
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id} className="border-t border-border-subtle hover:bg-secondary">
                  <td className="px-4 py-3">
                    <Link
                      href={editHref(a.id, filters.needsReview)}
                      className="font-medium text-fg hover:text-accent"
                    >
                      {a.title}
                    </Link>
                    {needsReview(a) && (
                      <span className="ml-2 align-middle">
                        <Badge>{strings.admin.aiBadge}</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg-secondary">{getCategory(a.category)?.name}</td>
                  <td className="px-4 py-3 text-fg-secondary">{PLUGINS[a.type].label}</td>
                  <td className="px-4 py-3">{strings.admin.statuses[a.status]}</td>
                  <td className="px-4 py-3 text-fg-secondary tabular-nums">
                    {a.updatedAt?.toLocaleDateString("en-US") ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
