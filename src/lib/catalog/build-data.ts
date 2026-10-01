// Build-time only (server components during `next build`): never import from client components.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fetchPublishedActivities } from "../player/load-activity";
import { EMPTY_CATALOG, fetchCatalogIndex } from "./fetch";
import type { CatalogIndex } from "./schema";

let buildCatalog: Promise<CatalogIndex> | undefined;

/**
 * Catalog baked into the static HTML, read once per build process. A failure logs and falls back
 * to empty: the browser refreshes it from Firestore anyway.
 */
export function getBuildCatalog(): Promise<CatalogIndex> {
  buildCatalog ??= fetchCatalogIndex().catch((error: unknown) => {
    console.warn(`Could not read catalog/index at build time: ${(error as Error).message}`);
    return EMPTY_CATALOG;
  });
  return buildCatalog;
}

/** Image paths that exist in public/images, so cards use a placeholder instead of a broken image. */
export function getPublicImagePaths(): string[] {
  const dir = join(process.cwd(), "public", "images");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.(webp|png|jpe?g|svg|avif)$/i.test(file))
    .map((file) => `/images/${file.split("\\").join("/")}`);
}

let buildActivities: ReturnType<typeof fetchPublishedActivities> | undefined;

/** Full published activities for the /play pages, read once per build process. */
export function getBuildActivities(): ReturnType<typeof fetchPublishedActivities> {
  buildActivities ??= fetchPublishedActivities().catch((error: unknown) => {
    console.warn(`Could not read activities at build time: ${(error as Error).message}`);
    return [];
  });
  return buildActivities;
}
