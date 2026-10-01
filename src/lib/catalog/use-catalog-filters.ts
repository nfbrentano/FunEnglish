"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_FILTERS, parseFilters, serializeFilters, type CatalogFilters } from "./filter";

const URL_CHANGE_EVENT = "fun-english-url-change";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_CHANGE_EVENT, onChange);
  };
}

const getSearch = () => window.location.search;
// The static HTML is rendered without filters (carousels), then the browser applies the URL.
const getServerSearch = () => "";

/**
 * Filters live in the URL so results can be shared and Back undoes the last change.
 * Uses the native History API, which Next.js keeps in sync with its router.
 */
export function useCatalogFilters() {
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch);
  const filters = useMemo(() => parseFilters(search), [search]);

  const setFilters = useCallback(
    (next: Partial<CatalogFilters>, { replace = false }: { replace?: boolean } = {}) => {
      const merged = { ...parseFilters(window.location.search), ...next };
      const url = `${window.location.pathname}${serializeFilters(merged)}`;
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      window.dispatchEvent(new Event(URL_CHANGE_EVENT));
    },
    [],
  );

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters]);

  return { filters, setFilters, clearFilters };
}
