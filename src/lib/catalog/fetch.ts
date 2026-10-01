import { doc, getDoc } from "firebase/firestore/lite";
import { getLiteDb } from "../firebase";
import {
  CATALOG_COLLECTION,
  CATALOG_INDEX_DOC,
  catalogIndexSchema,
  type CatalogIndex,
} from "./schema";

export const EMPTY_CATALOG: CatalogIndex = {
  schemaVersion: 1,
  updatedAt: new Date(0).toISOString(),
  items: [],
};

/** Reads `catalog/index` (one Firestore read, over REST). Invalid or missing data yields an empty catalog. */
export async function fetchCatalogIndex(): Promise<CatalogIndex> {
  const snapshot = await getDoc(doc(getLiteDb(), CATALOG_COLLECTION, CATALOG_INDEX_DOC));
  if (!snapshot.exists()) return EMPTY_CATALOG;

  const parsed = catalogIndexSchema.safeParse(snapshot.data());
  if (!parsed.success) {
    console.error("catalog/index is invalid", parsed.error.issues);
    return EMPTY_CATALOG;
  }
  return parsed.data;
}

let clientRequest: Promise<CatalogIndex> | undefined;

/** Browser: one read per page session, shared by every page that shows the catalog. */
export function fetchCatalogIndexOnce(): Promise<CatalogIndex> {
  clientRequest ??= fetchCatalogIndex().catch((error: unknown) => {
    clientRequest = undefined;
    throw error;
  });
  return clientRequest;
}
