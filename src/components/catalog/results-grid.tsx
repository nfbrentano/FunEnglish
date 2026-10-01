"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CatalogItem } from "@/lib/catalog/schema";
import { strings } from "@/lib/strings";
import { ActivityCard } from "./activity-card";

export const PAGE_SIZE = 24;

type ResultsGridProps = {
  items: CatalogItem[];
  hasImage: (src: string) => boolean;
  isNew: (createdAt: string) => boolean;
  onClear: () => void;
};

/** Grid of matches, 24 at a time. Remount it (key) when the filters change to start over. */
export function ResultsGrid({ items, hasImage, isNew, onClear }: ResultsGridProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <h2 className="font-display text-3xl">{strings.catalog.noResults}</h2>
        <p className="text-fg-secondary">{strings.catalog.noResultsHint}</p>
        <Button variant="secondary" onClick={onClear}>
          {strings.catalog.clearFilters}
        </Button>
      </div>
    );
  }

  return (
    <section aria-label={strings.catalog.results} className="space-y-8">
      <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {items.slice(0, visible).map((item) => (
          <li key={item.id}>
            <ActivityCard
              item={item}
              imageAvailable={hasImage(item.thumbnail.src)}
              isNew={isNew(item.createdAt)}
            />
          </li>
        ))}
      </ul>
      {visible < items.length && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
            {strings.catalog.loadMore}
          </Button>
        </div>
      )}
    </section>
  );
}
