"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@/lib/activities/categories";
import { filterCatalog, hasActiveFilters, serializeFilters } from "@/lib/catalog/filter";
import type { CatalogIndex } from "@/lib/catalog/schema";
import { isNew } from "@/lib/catalog/sections";
import { useCatalogFilters } from "@/lib/catalog/use-catalog-filters";
import { useCatalogIndex, useClientNow } from "@/lib/catalog/use-catalog-index";
import { strings } from "@/lib/strings";
import { FilterBar } from "./filter-bar";
import { ResultsGrid } from "./results-grid";
import { SearchField } from "./search-field";

type CategoryViewProps = {
  initial: CatalogIndex;
  imagePaths: string[];
  /** null = every category, newest first ("What's New › See All"). */
  category: Category | null;
};

/** Every published activity of one category (or all of them), with search, level and sort. */
export function CategoryView({ initial, imagePaths, category }: CategoryViewProps) {
  const { index, waiting } = useCatalogIndex(initial);
  const now = useClientNow();
  const images = useMemo(() => new Set(imagePaths), [imagePaths]);
  const { filters: urlFilters, setFilters, clearFilters: clearUrlFilters } = useCatalogFilters();
  const [searchKey, setSearchKey] = useState(0);

  // The category comes from the page, never from the URL.
  const filters = useMemo(() => ({ ...urlFilters, category: null }), [urlFilters]);
  const items = useMemo(
    () => (category ? index.items.filter((item) => item.category === category.id) : index.items),
    [index.items, category],
  );
  const results = useMemo(() => filterCatalog(items, filters), [items, filters]);
  const filtering = hasActiveFilters(filters);

  const clearFilters = () => {
    clearUrlFilters();
    setSearchKey((key) => key + 1);
  };

  const title = category?.name ?? strings.catalog.whatsNew;
  const subtitle = category?.subtitle ?? strings.catalog.allNew;

  return (
    <>
      <section className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            {category ? (
              <CategoryIcon category={category} size="lg" />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-full bg-accent-muted text-accent">
                <Sparkles aria-hidden="true" className="size-6" strokeWidth={1.75} />
              </span>
            )}
            <div>
              <h1 className="font-display text-5xl font-medium">{title}</h1>
              <p className="text-fg-secondary">
                {subtitle}
                {" · "}
                {waiting ? (
                  <span
                    aria-hidden="true"
                    className="inline-block h-4 w-20 animate-pulse rounded bg-border-subtle align-middle motion-reduce:animate-none"
                  />
                ) : (
                  strings.catalog.activityCount(items.length)
                )}
              </p>
            </div>
          </div>
          <div className="w-full md:max-w-md">
            <SearchField
              key={searchKey}
              value={filters.q}
              onSearch={(q) => setFilters({ q }, { replace: filters.q !== "" && q !== "" })}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-10">
        {!waiting && items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="font-display text-3xl">{strings.catalog.emptyCategory}</p>
            <ButtonLink href="/activities" variant="secondary">
              {strings.catalog.browseAll}
            </ButtonLink>
          </div>
        ) : (
          <>
            {!waiting && (
              <FilterBar
                filters={filters}
                count={results.length}
                active={filtering}
                showCategory={false}
                onChange={(next) => setFilters(next)}
                onClear={clearFilters}
              />
            )}
            {waiting ? (
              <div
                role="status"
                aria-label={strings.catalog.loading}
                className="grid gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />
                ))}
              </div>
            ) : (
              <ResultsGrid
                key={serializeFilters(filters)}
                items={results}
                hasImage={(src) => images.has(src)}
                isNew={(createdAt) => now !== null && isNew(createdAt, now)}
                onClear={clearFilters}
                restorePosition
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
