"use client";

import { ChevronDown, X } from "lucide-react";
import { CATEGORIES } from "@/lib/activities/categories";
import { LEVELS } from "@/lib/activities/levels";
import { SORTS, type CatalogFilters } from "@/lib/catalog/filter";
import { strings } from "@/lib/strings";

type FilterBarProps = {
  filters: CatalogFilters;
  count: number;
  active: boolean;
  onChange: (next: Partial<CatalogFilters>) => void;
  onClear: () => void;
};

function Select({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full appearance-none rounded-full border border-border-strong bg-elevated py-2 pr-10 pl-4 text-sm text-fg hover:border-accent sm:w-auto"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export function FilterBar({ filters, count, active, onChange, onClear }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-secondary p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>*:last-child]:col-span-2">
        <Select
          id="filter-category"
          label={strings.catalog.categoryFilter}
          value={filters.category ?? ""}
          onChange={(value) =>
            onChange({ category: (value || null) as CatalogFilters["category"] })
          }
        >
          <option value="">{strings.catalog.allCategories}</option>
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          id="filter-level"
          label={strings.catalog.levelFilter}
          value={filters.level ?? ""}
          onChange={(value) => onChange({ level: (value || null) as CatalogFilters["level"] })}
        >
          <option value="">{strings.catalog.allLevels}</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {strings.catalog.levels[level]}
            </option>
          ))}
        </Select>
        <Select
          id="filter-sort"
          label={strings.catalog.sortLabel}
          value={filters.sort}
          onChange={(value) => onChange({ sort: value as CatalogFilters["sort"] })}
        >
          {SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {strings.catalog.sorts[sort]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center justify-between gap-3 sm:ml-auto">
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-fg-secondary hover:text-fg"
          >
            <X aria-hidden="true" className="size-4" />
            {strings.catalog.clearFilters}
          </button>
        )}
        <p aria-live="polite" className="text-sm text-fg-secondary sm:order-first">
          {strings.catalog.showing(count)}
        </p>
      </div>
    </div>
  );
}
