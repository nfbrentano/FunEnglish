"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalogIndex, useClientNow } from "@/lib/catalog/use-catalog-index";
import { filterCatalog, hasActiveFilters, serializeFilters } from "@/lib/catalog/filter";
import type { CatalogIndex } from "@/lib/catalog/schema";
import { isNew, latest, sectionsByCategory } from "@/lib/catalog/sections";
import { useCatalogFilters } from "@/lib/catalog/use-catalog-filters";
import { strings } from "@/lib/strings";
import { ActivityCard } from "./activity-card";
import { Carousel } from "./carousel";
import { CatalogHero } from "./catalog-hero";
import { CatalogSection } from "./catalog-section";
import { FilterBar } from "./filter-bar";
import { ResultsGrid } from "./results-grid";
import { SearchField } from "./search-field";

type CatalogViewProps = {
  /** Catalog baked in at build time; refreshed from Firestore once the page loads. */
  initial: CatalogIndex;
  /** Images that exist in public/ (known at build time). */
  imagePaths: string[];
};

export function CatalogView({ initial, imagePaths }: CatalogViewProps) {
  const { index, waiting } = useCatalogIndex(initial);
  const now = useClientNow();
  const images = useMemo(() => new Set(imagePaths), [imagePaths]);

  const { filters, setFilters, clearFilters: clearUrlFilters } = useCatalogFilters();
  // Remounting the search field on Clear also cancels a search still waiting on its debounce.
  const [searchKey, setSearchKey] = useState(0);
  const clearFilters = () => {
    clearUrlFilters();
    setSearchKey((key) => key + 1);
  };
  const items = index.items;
  const filtering = hasActiveFilters(filters);
  const results = useMemo(() => filterCatalog(items, filters), [items, filters]);
  const isRecent = (createdAt: string) => now !== null && isNew(createdAt, now);

  return (
    <>
      <CatalogHero
        count={waiting ? null : items.length}
        search={
          <SearchField
            key={searchKey}
            value={filters.q}
            // Starting a search adds a history entry; refining it while typing doesn't.
            onSearch={(q) => setFilters({ q }, { replace: filters.q !== "" && q !== "" })}
          />
        }
      />
      <div className="mx-auto w-full max-w-[1200px] space-y-14 px-4 py-12">
        {!waiting && items.length > 0 && (
          <FilterBar
            filters={filters}
            count={filtering ? results.length : items.length}
            active={filtering}
            onChange={(next) => setFilters(next)}
            onClear={clearFilters}
          />
        )}
        {waiting && <CatalogSkeleton />}
        {!waiting && items.length === 0 && (
          <p className="py-16 text-center text-fg-secondary">{strings.catalog.empty}</p>
        )}
        {items.length > 0 && filtering && (
          <ResultsGrid
            key={serializeFilters(filters)}
            items={results}
            hasImage={(src) => images.has(src)}
            isNew={isRecent}
            onClear={clearFilters}
          />
        )}
        {items.length > 0 && !filtering && (
          <>
            <CatalogSection
              id="new"
              title={strings.catalog.whatsNew}
              subtitle={strings.catalog.whatsNewSubtitle}
              seeAllHref="/activities/new"
              icon={
                <span className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-accent">
                  <Sparkles aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
              }
            >
              <Carousel label={strings.catalog.whatsNew}>
                {latest(items).map((item, i) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    imageAvailable={images.has(item.thumbnail.src)}
                    isNew={isRecent(item.createdAt)}
                    priority={i < 4}
                  />
                ))}
              </Carousel>
            </CatalogSection>

            {sectionsByCategory(items).map(({ category, items: sectionItems }) => (
              <CatalogSection
                key={category.id}
                id={category.id}
                title={category.name}
                subtitle={category.subtitle}
                seeAllHref={`/activities/${category.id}`}
                icon={<CategoryIcon category={category} size="md" />}
              >
                <Carousel label={category.name}>
                  {sectionItems.map((item) => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      imageAvailable={images.has(item.thumbnail.src)}
                      isNew={isRecent(item.createdAt)}
                    />
                  ))}
                </Carousel>
              </CatalogSection>
            ))}
          </>
        )}
      </div>
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div role="status" aria-label={strings.catalog.loading} className="space-y-14">
      {[0, 1].map((section) => (
        <div key={section} className="space-y-5">
          <Skeleton className="h-9 w-56" />
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2, 3].map((card) => (
              <div key={card} className="w-64 shrink-0 space-y-3 md:w-72">
                <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
