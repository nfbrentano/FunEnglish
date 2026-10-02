"use client";

import {
  BarChart3,
  Download,
  ExternalLink,
  ImageOff,
  Plus,
  Settings,
  Star,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES, getCategory, type CategoryId } from "@/lib/activities/categories";
import { levelLabel } from "@/lib/activities/levels";
import type { ActivityDoc } from "@/lib/activities/schema/activity";
import { ACTIVITY_TYPES } from "@/lib/activities/schema/activity";
import { validateActivity } from "@/lib/activities/validate";
import {
  bulkDelete,
  bulkUpdate,
  exportAllActivities,
  listActivities,
  MAX_CATALOG_BYTES,
  saveActivity,
  type AdminActivity,
} from "@/lib/admin/activities-admin";
import {
  ADMIN_SORTS,
  filterAdminActivities,
  NO_ADMIN_FILTERS,
  needsReview,
  parseAdminFilters,
  serializeAdminFilters,
  type AdminFilters,
} from "@/lib/admin/filter";
import { jsonBytes } from "@/lib/admin/revisions";
import { useAuth } from "@/lib/auth/use-auth";
import { buildCatalogIndex } from "@/lib/catalog/sections";
import { PLUGINS } from "@/lib/player/registry";
import { strings } from "@/lib/strings";

const REBUILD_URL = "https://github.com/nfbrentano/FunEnglish/actions/workflows/deploy.yml";
const field = "min-h-11 rounded-full border border-border-strong bg-elevated px-4 text-sm text-fg";
const PAGE_SIZE = 50;
const l = strings.admin.list;

export const editHref = (id: string, review = false) =>
  `/admin/edit?id=${encodeURIComponent(id)}${review ? "&review=1" : ""}`;

/** A /public image that isn't in the build (https:// URLs can't be checked here). */
export const isMissingImage = (src: string, images: ReadonlySet<string>) =>
  src.startsWith("/") && !images.has(src.split("?")[0]);

/** What publishing would store, for the bulk check (server fields stripped). */
function authored(a: AdminActivity) {
  const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = a;
  void [_i, _c, _u];
  return rest;
}

/** How full catalog/index would be with these published activities (RNF03). */
function catalogFill(items: readonly AdminActivity[]): number {
  const published = items
    .filter((a) => a.status === "published")
    .map((a) => ({
      id: a.id,
      data: {
        ...a,
        searchTokens: [],
        createdAt: a.createdAt ?? new Date(),
        updatedAt: a.updatedAt ?? new Date(),
      } as ActivityDoc<Date>,
    }));
  return jsonBytes(buildCatalogIndex(published)) / MAX_CATALOG_BYTES;
}

export function AdminList({ imagePaths = [] }: { imagePaths?: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<AdminActivity[] | null>(null);
  const [filters, setFilters] = useState<AdminFilters>(NO_ADMIN_FILTERS);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const images = useMemo(() => new Set(imagePaths), [imagePaths]);
  const author = user
    ? { uid: user.uid, name: user.displayName ?? user.email ?? user.uid }
    : undefined;

  const reload = () =>
    listActivities()
      .then(setItems)
      .catch((error: unknown) => {
        console.warn("Could not list activities", error);
        setItems([]);
      });

  useEffect(() => {
    void reload();
    // Filters live in the URL (RF14): read them once, on load.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the URL once
    setFilters(parseAdminFilters(window.location.search));
  }, []);

  const shown = useMemo(
    () => (items ? filterAdminActivities(items, filters) : []),
    [items, filters],
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const pending = items?.filter(needsReview).length ?? 0;
  const fill = useMemo(() => (items ? catalogFill(items) : 0), [items]);
  const chosen = (items ?? []).filter((a) => selected.has(a.id));

  const set = (patch: Partial<AdminFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    setPage(0);
    const query = serializeAdminFilters(next);
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  async function runBulk(action: () => Promise<void>, message: string) {
    setBusy(true);
    try {
      await action();
      toast(message);
      setSelected(new Set());
      await reload();
    } catch (error) {
      console.warn("Bulk action failed", error);
      toast(strings.admin.saveError);
    } finally {
      setBusy(false);
    }
  }

  function bulkPublish() {
    const ok = chosen.filter((a) => validateActivity({ ...authored(a), status: "published" }).ok);
    const invalid = chosen.filter((a) => !ok.includes(a)).map((a) => a.title);
    void runBulk(
      () => bulkUpdate(ok, { status: "published" }, { author, summary: "Bulk: published" }),
      [l.done(ok.length), invalid.length ? l.skipped(invalid) : ""].filter(Boolean).join(". "),
    );
  }

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
      const { id } = await saveActivity(null, {
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

  async function exportAll() {
    try {
      const all = await exportAllActivities();
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      Object.assign(document.createElement("a"), {
        href: url,
        download: `fun-english-activities-${date}.json`,
      }).click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn("Export failed", error);
      toast(strings.admin.saveError);
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
          <Link href="/admin/new" className={buttonClasses("primary")}>
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
          <button type="button" className={buttonClasses("secondary")} onClick={exportAll}>
            <Download aria-hidden="true" className="size-4" />
            {strings.admin.exportAll}
          </button>
          <Link href="/admin/coverage" className={buttonClasses("ghost")}>
            <BarChart3 aria-hidden="true" className="size-4" />
            {l.coverage}
          </Link>
          <Link href="/admin/settings" className={buttonClasses("ghost")}>
            <Settings aria-hidden="true" className="size-4" />
            {strings.admin.settings.title}
          </Link>
          <Link href="/admin/images" className={buttonClasses("ghost")}>
            <ImageOff aria-hidden="true" className="size-4" />
            {l.missingImages}
          </Link>
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
        <select
          aria-label={l.sortBy}
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as AdminFilters["sort"] })}
          className={field}
        >
          {ADMIN_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {l.sorts[sort]}
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

      {fill > 0.8 && (
        <p
          role="status"
          className="rounded-2xl border border-accent/40 bg-accent-muted px-4 py-3 text-sm"
        >
          {l.catalogSize(Math.round(fill * 100))}
        </p>
      )}

      {items === null ? (
        <div role="status" aria-label={strings.admin.loading} className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-fg-secondary">{strings.admin.empty}</p>
      ) : (
        <>
          {selected.size > 0 && (
            <div
              role="toolbar"
              aria-label={l.bulkActions}
              className="sticky top-20 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-accent/40 bg-elevated p-3 shadow-lg"
            >
              <span className="px-2 text-sm font-medium">{l.selected(selected.size)}</span>
              <Button disabled={busy} onClick={bulkPublish}>
                {l.publish}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void runBulk(
                    () =>
                      bulkUpdate(
                        chosen,
                        { status: "draft" },
                        { author, summary: "Bulk: unpublished" },
                      ),
                    l.done(chosen.length),
                  )
                }
              >
                {l.unpublish}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void runBulk(
                    () =>
                      bulkUpdate(
                        chosen,
                        {
                          reviewStatus: "reviewed",
                          reviewedAt: new Date().toISOString(),
                          reviewedBy: user?.uid,
                        },
                        { author, summary: "Bulk: marked as reviewed" },
                      ),
                    l.done(chosen.length),
                  )
                }
              >
                {l.markReviewed}
              </Button>
              <select
                aria-label={l.moveTo}
                value=""
                disabled={busy}
                onChange={(e) => {
                  const category = e.target.value as CategoryId;
                  if (!category) return;
                  void runBulk(
                    () =>
                      bulkUpdate(
                        chosen,
                        { category },
                        { author, summary: `Bulk: moved to ${category}` },
                      ),
                    l.done(chosen.length),
                  );
                }}
                className={field}
              >
                <option value="">{l.moveTo}…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void runBulk(
                    () =>
                      bulkUpdate(chosen, { featured: true }, { author, summary: "Bulk: featured" }),
                    l.done(chosen.length),
                  )
                }
              >
                {l.feature}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void runBulk(
                    () =>
                      bulkUpdate(
                        chosen,
                        { featured: false },
                        { author, summary: "Bulk: unfeatured" },
                      ),
                    l.done(chosen.length),
                  )
                }
              >
                {l.unfeature}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                className="text-error"
                onClick={() => {
                  setDeleteText("");
                  deleteRef.current?.showModal();
                }}
              >
                {l.delete}
              </Button>
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                {l.clear}
              </Button>
            </div>
          )}
          <div className="overflow-x-auto rounded-2xl border border-border-subtle">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-secondary text-xs tracking-wider text-muted uppercase">
                <tr>
                  <th scope="col" className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={l.selectAll(shown.length)}
                      checked={shown.length > 0 && shown.every((a) => selected.has(a.id))}
                      onChange={(e) =>
                        setSelected(e.target.checked ? new Set(shown.map((a) => a.id)) : new Set())
                      }
                      className="size-4 accent-(--accent)"
                    />
                  </th>
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
                    {l.level}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {strings.admin.columns.status}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">{l.featured}</span>
                    <Star aria-hidden="true" className="size-4" />
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {strings.admin.columns.updated}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className="border-t border-border-subtle hover:bg-secondary">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={l.selectOne(a.title)}
                        checked={selected.has(a.id)}
                        onChange={() => toggle(a.id)}
                        className="size-4 accent-(--accent)"
                      />
                    </td>
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
                      {isMissingImage(a.thumbnail.src, images) && (
                        <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs text-fg-secondary">
                          <ImageOff aria-hidden="true" className="size-3.5" />
                          {l.missingImage}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">{getCategory(a.category)?.name}</td>
                    <td className="px-4 py-3 text-fg-secondary">{PLUGINS[a.type].label}</td>
                    <td className="px-4 py-3 text-fg-secondary">
                      {levelLabel(a.levelMin, a.levelMax)}
                    </td>
                    <td className="px-4 py-3">{strings.admin.statuses[a.status]}</td>
                    <td className="px-4 py-3">
                      {a.featured ? (
                        <Star aria-label={l.featured} className="size-4 fill-current text-accent" />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-secondary tabular-nums">
                      {a.updatedAt?.toLocaleDateString("en-US") ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-end gap-3 text-sm">
              <span className="text-fg-secondary">
                {l.page(
                  current * PAGE_SIZE + 1,
                  Math.min((current + 1) * PAGE_SIZE, shown.length),
                  shown.length,
                )}
              </span>
              <Button
                variant="secondary"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                {l.previous}
              </Button>
              <Button
                variant="secondary"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
              >
                {l.next}
              </Button>
            </nav>
          )}
        </>
      )}

      <dialog
        ref={deleteRef}
        aria-labelledby="bulk-delete-title"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border-subtle bg-elevated p-6 text-fg backdrop:bg-black/50"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (deleteText.trim() !== String(chosen.length)) return;
            deleteRef.current?.close();
            const ids = chosen.map((a) => a.id);
            void runBulk(() => bulkDelete(ids), l.deleted(ids.length));
          }}
        >
          <h2 id="bulk-delete-title" className="font-display text-2xl">
            {l.deleteTitle(chosen.length)}
          </h2>
          <label htmlFor="bulk-delete-confirm" className="block text-sm text-fg-secondary">
            {l.deleteHint(chosen.length)}
          </label>
          <input
            id="bulk-delete-confirm"
            inputMode="numeric"
            autoComplete="off"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            className={`${field} w-full`}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => deleteRef.current?.close()}>
              {strings.dashboard.cancel}
            </Button>
            <Button
              type="submit"
              disabled={deleteText.trim() !== String(chosen.length)}
              className="bg-error text-primary"
            >
              {l.deleteConfirm}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
