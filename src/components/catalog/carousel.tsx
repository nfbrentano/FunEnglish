"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { strings } from "@/lib/strings";

/** Horizontal, snap-scrolling row. Swipe and Tab work natively; arrows show only when there's more. */
export function Carousel({ label, children }: { label: string; children: ReactNode }) {
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

  const scroll = (direction: 1 | -1) =>
    listRef.current?.scrollBy({
      left: direction * listRef.current.clientWidth * 0.9,
      behavior: "smooth",
    });

  const arrowClasses =
    "absolute top-[calc(50%-1.5rem)] z-20 hidden size-10 items-center justify-center rounded-full border border-border-subtle bg-elevated text-fg-secondary shadow-lg transition-colors hover:text-fg md:flex";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={strings.catalog.carouselLabel(label)}
      className="relative"
    >
      {!edges.start && (
        <button
          type="button"
          aria-label={strings.catalog.previous(label)}
          onClick={() => scroll(-1)}
          className={`${arrowClasses} -left-4`}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
      )}
      <ul
        ref={listRef}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <li className="w-64 shrink-0 snap-start md:w-72">{child}</li>
        ))}
      </ul>
      {!edges.end && (
        <button
          type="button"
          aria-label={strings.catalog.next(label)}
          onClick={() => scroll(1)}
          className={`${arrowClasses} -right-4`}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      )}
    </div>
  );
}
