"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { fetchCatalogIndexOnce } from "./fetch";
import type { CatalogIndex } from "./schema";

const FALLBACK_CATALOG: CatalogIndex = {
  schemaVersion: 1,
  updatedAt: new Date(0).toISOString(),
  items: [],
};

/** The catalog baked in at build time, refreshed once from Firestore after the page loads. */
export function useCatalogIndex(initial: CatalogIndex = FALLBACK_CATALOG) {
  const [index, setIndex] = useState(initial);
  const [loaded, setLoaded] = useState(false);

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

  return { index, loaded, waiting: index.items.length === 0 && !loaded };
}

let clientNow: Date | undefined;
const noSubscription = () => () => {};

/** "Now" only in the browser: the "New" badge must not depend on when the site was built. */
export function useClientNow(): Date | null {
  return useSyncExternalStore(
    noSubscription,
    () => (clientNow ??= new Date()),
    () => null,
  );
}
