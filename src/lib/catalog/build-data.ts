// Build-time only (server components during `next build`): never import from client components.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fetchPublishedActivities, type PlayableActivity } from "../player/load-activity";
import { prepareSeed, type SeedFile } from "../activities/seed";
import { EMPTY_CATALOG, fetchCatalogIndex } from "./fetch";
import type { CatalogIndex, CatalogItem } from "./schema";

let buildCatalog: Promise<CatalogIndex> | undefined;

function getLocalSeedActivities() {
  const dir = join(process.cwd(), "content", "activities");
  if (!existsSync(dir)) return [];
  const files: SeedFile[] = readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      path: relative(dir, join(dir, file)),
      contents: readFileSync(join(dir, file), "utf8"),
    }));
  const { activities } = prepareSeed(files);
  return activities.map((a) => a.doc).filter((d) => d.status === "published");
}

/**
 * Catalog baked into the static HTML, read once per build process. A failure logs and falls back
 * to empty: the browser refreshes it from Firestore anyway.
 */
export async function getBuildCatalog(): Promise<CatalogIndex> {
  if (!buildCatalog) {
    buildCatalog = (async () => {
      const remote = await fetchCatalogIndex().catch((error: unknown) => {
        console.warn(`Could not read catalog/index at build time: ${(error as Error).message}`);
        return EMPTY_CATALOG;
      });

      // Merge any published local seed activities not yet in Firestore catalog/index
      const local = getLocalSeedActivities();
      const remoteSlugs = new Set(remote.items.map((i) => i.slug));
      const localItems: CatalogItem[] = local
        .filter((doc) => !remoteSlugs.has(doc.slug))
        .map((doc) => ({
          id: doc.slug,
          slug: doc.slug,
          title: doc.title,
          description: doc.description,
          category: doc.category,
          type: doc.type,
          levelMin: doc.levelMin,
          levelMax: doc.levelMax,
          tags: doc.tags ?? [],
          thumbnail: { src: doc.thumbnail.src, alt: doc.thumbnail.alt },
          featured: doc.featured ?? false,
          createdAt: new Date().toISOString(),
        }));

      return {
        ...remote,
        items: [...remote.items, ...localItems],
      };
    })();
  }
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
  buildActivities ??= (async () => {
    const remote = await fetchPublishedActivities().catch((error: unknown) => {
      console.warn(`Could not read activities at build time: ${(error as Error).message}`);
      return [];
    });

    const local = getLocalSeedActivities();
    const remoteSlugs = new Set(remote.map((r) => r.slug));
    const missingLocal = local
      .filter((doc) => !remoteSlugs.has(doc.slug))
      .map((doc) => {
        const playable: PlayableActivity = {
          id: doc.slug,
          ...doc,
        };
        return {
          id: doc.slug,
          slug: doc.slug,
          updatedAt: new Date().toISOString(),
          activity: playable,
        };
      });

    return [...remote, ...missingLocal];
  })();
  return buildActivities;
}
