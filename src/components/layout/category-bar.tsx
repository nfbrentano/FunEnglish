"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { CATEGORIES } from "@/lib/activities/categories";
import { strings } from "@/lib/strings";

/** Horizontal, scrollable list of the 9 categories. Arrows appear only when there is more to see. */
export function CategoryBar() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setEdges({
      start: list.scrollLeft <= 1,
      end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 1,
    });
  }, []);

  // Center the active category (on load and on client-side navigation between categories).
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !active) return;
    const left = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollTo({ left, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    list.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const scrollBy = (direction: 1 | -1) =>
    listRef.current?.scrollBy({
      left: direction * listRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });

  // The arrow sits on a fade of the page background so it never overlaps a chip.
  const arrowClasses =
    "absolute inset-y-0 z-10 flex w-14 items-center text-fg-secondary hover:text-fg [&>span]:flex [&>span]:size-8 [&>span]:items-center [&>span]:justify-center [&>span]:rounded-full [&>span]:border [&>span]:border-border-subtle [&>span]:bg-elevated";

  return (
    <nav aria-label={strings.nav.categories} className="border-b border-border-subtle">
      <div className="relative mx-auto max-w-300">
        {!edges.start && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={strings.nav.scrollCategoriesLeft}
            onClick={() => scrollBy(-1)}
            className={`${arrowClasses} left-0 justify-start bg-linear-to-r from-primary from-40% to-transparent pl-2`}
          >
            <span>
              <ChevronLeft aria-hidden="true" className="size-4" />
            </span>
          </button>
        )}
        <ul
          ref={listRef}
          className="relative flex gap-2 overflow-x-auto scroll-smooth px-4 py-3 [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORIES.map((category) => {
            const href = `/activities/${category.id}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={category.id} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2 rounded-full border py-1 pr-4 pl-1.5 text-sm transition-colors duration-200 ${
                    active
                      ? "border-accent bg-accent-muted text-fg"
                      : "border-transparent text-fg-secondary hover:border-border-strong hover:text-fg"
                  }`}
                >
                  <CategoryIcon category={category} />
                  {category.name}
                </Link>
              </li>
            );
          })}
        </ul>
        {!edges.end && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={strings.nav.scrollCategoriesRight}
            onClick={() => scrollBy(1)}
            className={`${arrowClasses} right-0 justify-end bg-linear-to-l from-primary from-40% to-transparent pr-2`}
          >
            <span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
