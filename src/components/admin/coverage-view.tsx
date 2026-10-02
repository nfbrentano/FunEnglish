"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/lib/activities/categories";
import { LEVELS } from "@/lib/activities/levels";
import { ACTIVITY_TYPES } from "@/lib/activities/schema/activity";
import { listActivities, type AdminActivity } from "@/lib/admin/activities-admin";
import { computeCoverage, isLow, type Cell } from "@/lib/admin/coverage";
import { imageCoverage } from "@/lib/admin/plan-images";
import { levelLabel } from "@/lib/activities/levels";
import { editHref } from "./admin-list";
import { serializeAdminFilters, NO_ADMIN_FILTERS } from "@/lib/admin/filter";
import { PLUGINS } from "@/lib/player/registry";
import { strings } from "@/lib/strings";

const t = strings.admin.coverage;

/** Category × level and category × type counts, gaps highlighted (spec: gestão completa, RF15). */
export function CoverageView({ imagePaths = [] }: { imagePaths?: string[] }) {
  const [items, setItems] = useState<AdminActivity[] | null>(null);
  useEffect(() => {
    listActivities()
      .then(setItems)
      .catch((error: unknown) => {
        console.warn("Could not list activities", error);
        setItems([]);
      });
  }, []);

  if (!items) {
    return (
      <div
        role="status"
        aria-label={strings.admin.loading}
        className="mx-auto w-full max-w-[1200px] px-4 py-12"
      >
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  const { byLevel, byType } = computeCoverage(items);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {strings.admin.back}
      </Link>
      <header className="space-y-2">
        <h1 className="font-display text-5xl font-medium">{t.title}</h1>
        <p className="text-fg-secondary">{t.subtitle}</p>
      </header>
      <Matrix
        title={t.byLevel}
        columns={LEVELS.map((level) => ({ id: level, label: strings.catalog.levels[level] }))}
        cell={(category, level) => byLevel[category][level as (typeof LEVELS)[number]]}
        createHref={(category, level) =>
          `/admin/new?${new URLSearchParams({ category, level, mode: "ai" })}`
        }
        listHref={(category) =>
          `/admin?${serializeAdminFilters({ ...NO_ADMIN_FILTERS, category })}`
        }
      />
      <Matrix
        title={t.byType}
        columns={ACTIVITY_TYPES.map((type) => ({ id: type, label: PLUGINS[type].label }))}
        cell={(category, type) => byType[category][type as (typeof ACTIVITY_TYPES)[number]]}
        createHref={(category, type) =>
          `/admin/new?${new URLSearchParams({ category, type, mode: "ai" })}`
        }
        listHref={(category, type) =>
          `/admin?${serializeAdminFilters({ ...NO_ADMIN_FILTERS, category, type: type as (typeof ACTIVITY_TYPES)[number] })}`
        }
      />
      <PicturesTable items={items} existing={new Set(imagePaths)} />
    </div>
  );
}

function Matrix({
  title,
  columns,
  cell,
  createHref,
  listHref,
}: {
  title: string;
  columns: { id: string; label: string }[];
  cell: (category: (typeof CATEGORIES)[number]["id"], column: string) => Cell;
  createHref: (category: string, column: string) => string;
  listHref: (category: (typeof CATEGORIES)[number]["id"], column: string) => string;
}) {
  return (
    <section
      aria-labelledby={`coverage-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className="space-y-3"
    >
      <h2
        id={`coverage-${title.toLowerCase().replace(/\s+/g, "-")}`}
        className="font-display text-3xl"
      >
        {title}
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary text-xs tracking-wider text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                {t.category}
              </th>
              {columns.map((c) => (
                <th key={c.id} scope="col" className="px-4 py-3 text-center">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((category) => (
              <tr key={category.id} className="border-t border-border-subtle">
                <th scope="row" className="px-4 py-2 text-left font-medium">
                  {category.name}
                </th>
                {columns.map((column) => {
                  const value = cell(category.id, column.id);
                  const low = isLow(value);
                  return (
                    <td key={column.id} className="p-1 text-center">
                      <Link
                        href={
                          low
                            ? createHref(category.id, column.id)
                            : listHref(category.id, column.id)
                        }
                        aria-label={`${low ? t.create(category.name, column.label) : t.open(category.name, column.label)}: ${t.cell(value.published, value.drafts)}`}
                        className={`flex min-h-11 flex-col items-center justify-center rounded-xl px-2 tabular-nums hover:outline hover:outline-accent ${
                          low ? "bg-accent-muted text-accent" : "text-fg"
                        }`}
                      >
                        <span className="text-lg font-medium">{value.published}</span>
                        {value.drafts > 0 && (
                          <span className="text-xs text-fg-secondary">+{value.drafts}</span>
                        )}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Pictures per activity, lowest first (spec: mais imagens nas atividades, RF08, CA08). */
function PicturesTable({
  items,
  existing,
}: {
  items: AdminActivity[];
  existing: ReadonlySet<string>;
}) {
  const rows = items
    .map((a) => ({ a, c: imageCoverage(a, existing) }))
    .filter(({ c }) => c.items > 0)
    .sort((x, y) => x.c.uploaded / x.c.items - y.c.uploaded / y.c.items);
  return (
    <section aria-labelledby="coverage-pictures" className="space-y-3">
      <h2 id="coverage-pictures" className="font-display text-3xl">
        {t.pictures}
      </h2>
      <p className="text-sm text-fg-secondary">{t.picturesText}</p>
      <div className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary text-xs tracking-wider text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                {t.activity}
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                {t.level}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t.itemsCol}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t.plannedCol}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t.uploadedCol}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, c }) => {
              const percent = Math.round((c.uploaded / c.items) * 100);
              const low = c.uploaded / c.items < c.target;
              return (
                <tr key={a.id} className="border-t border-border-subtle">
                  <th scope="row" className="px-4 py-2 text-left font-medium">
                    <Link href={editHref(a.id)} className="hover:text-accent">
                      {a.title}
                    </Link>
                  </th>
                  <td className="px-4 py-2 text-fg-secondary">
                    {levelLabel(a.levelMin, a.levelMax)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.items}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.planned}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <span
                      className={low ? "rounded-lg bg-accent-muted px-2 py-0.5 text-accent" : ""}
                    >
                      {percent}%
                    </span>
                    {low && <span className="sr-only"> ({t.belowTarget(c.target * 100)})</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
