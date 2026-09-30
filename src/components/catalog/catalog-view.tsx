"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCatalogIndexOnce } from "@/lib/catalog/fetch";
import type { CatalogIndex } from "@/lib/catalog/schema";
import { isNew, latest, sectionsByCategory } from "@/lib/catalog/sections";
import { strings } from "@/lib/strings";
import { ActivityCard } from "./activity-card";
import { Carousel } from "./carousel";
import { CatalogHero } from "./catalog-hero";
import { CatalogSection } from "./catalog-section";

let clientNow: Date | undefined;
const noSubscription = () => () => {};

/** "Now" only in the browser: the "New" badge must not depend on when the site was built. */
function useClientNow(): Date | null {
  return useSyncExternalStore(
    noSubscription,
    () => (clientNow ??= new Date()),
    () => null,
  );
}

type CatalogViewProps = {
  /** Catalog baked in at build time; refreshed from Firestore once the page loads. */
  initial: CatalogIndex;
  /** Images that exist in public/ (known at build time). */
  imagePaths: string[];
};

export function CatalogView({ initial, imagePaths }: CatalogViewProps) {
  const [index, setIndex] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const now = useClientNow();
  const images = useMemo(() => new Set(imagePaths), [imagePaths]);

  useEffect(() => {
    let active = true;
    fetchCatalogIndexOnce()
      .then((fresh) => {
        if (active && fresh.updatedAt >= initial.updatedAt) setIndex(fresh);
      })
      .catch((error: unknown) => console.warn("Could not refresh the catalog", error))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [initial.updatedAt]);

  const items = index.items;
  const waiting = items.length === 0 && !loaded;

  return (
    <>
      <CatalogHero count={waiting ? null : items.length} />
      <div className="mx-auto w-full max-w-[1200px] space-y-14 px-4 py-12">
        {waiting && <CatalogSkeleton />}
        {!waiting && items.length === 0 && (
          <p className="py-16 text-center text-fg-secondary">{strings.catalog.empty}</p>
        )}
        {items.length > 0 && (
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
                    isNew={now !== null && isNew(item.createdAt, now)}
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
                      isNew={now !== null && isNew(item.createdAt, now)}
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
