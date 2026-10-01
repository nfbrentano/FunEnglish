"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { strings } from "@/lib/strings";

export const SEARCH_DEBOUNCE_MS = 250;

type SearchFieldProps = {
  /** Query currently in the URL. */
  value: string;
  onSearch: (query: string) => void;
};

/** Debounced search box; follows the URL when it changes elsewhere (Back, Clear filters). */
export function SearchField({ value, onSearch }: SearchFieldProps) {
  const [text, setText] = useState(value);
  const [urlValue, setUrlValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // React's "adjust state when a prop changes" pattern: adopt queries that didn't come from typing.
  if (value !== urlValue) {
    setUrlValue(value);
    if (value !== text.trim()) setText(value);
  }

  useEffect(() => {
    // The mobile bottom bar links to /activities#search.
    if (window.location.hash === "#search") inputRef.current?.focus();
    return () => clearTimeout(timer.current);
  }, []);

  function commit(query: string) {
    clearTimeout(timer.current);
    // Skip a stale timer: the field changed since (e.g. Back restored another query).
    if (inputRef.current && inputRef.current.value !== query) return;
    if (query.trim() !== value) onSearch(query.trim());
  }

  return (
    <form
      id="search"
      role="search"
      className="relative w-full max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        commit(text);
      }}
    >
      <label htmlFor="catalog-search" className="sr-only">
        {strings.catalog.searchLabel}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted"
      />
      <input
        ref={inputRef}
        id="catalog-search"
        name="q"
        type="search"
        autoComplete="off"
        value={text}
        placeholder={strings.catalog.searchPlaceholder}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(next), SEARCH_DEBOUNCE_MS);
        }}
        className="min-h-13 w-full rounded-full border border-border-strong bg-elevated py-3 pr-5 pl-13 text-fg placeholder:text-muted focus:border-accent"
      />
    </form>
  );
}
