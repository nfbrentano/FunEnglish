import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { strings } from "@/lib/strings";

/** Title, live activity count and the search field (search itself comes with the search spec). */
export function CatalogHero({ count }: { count: number | null }) {
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
        <form id="search" role="search" action="/activities" className="relative w-full max-w-xl">
          <label htmlFor="catalog-search" className="sr-only">
            {strings.catalog.searchLabel}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted"
          />
          <input
            id="catalog-search"
            name="q"
            type="search"
            placeholder={strings.catalog.searchPlaceholder}
            className="min-h-13 w-full rounded-full border border-border-strong bg-elevated py-3 pr-5 pl-13 text-fg placeholder:text-muted focus:border-accent"
          />
        </form>
      </div>
    </section>
  );
}
