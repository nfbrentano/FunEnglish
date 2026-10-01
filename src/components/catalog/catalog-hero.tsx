import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { strings } from "@/lib/strings";

/** Title, live activity count and the search field. */
export function CatalogHero({ count, search }: { count: number | null; search: ReactNode }) {
  return (
    <section className="border-b border-border-subtle">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center md:py-20">
        <h1 className="font-display text-5xl font-medium text-fg md:text-6xl">
          {strings.catalog.title}
        </h1>
        {count === null ? (
          <Skeleton className="h-6 w-80 max-w-full" />
        ) : (
          <p className="text-lg text-fg-secondary">{strings.catalog.count(count)}</p>
        )}
        {search}
      </div>
    </section>
  );
}
