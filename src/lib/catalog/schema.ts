import { z } from "zod";
import { ACTIVITY_TYPES } from "../activities/schema/activity";
import { CATEGORY_IDS } from "../activities/categories";
import { LEVELS } from "../activities/levels";

export const CATALOG_COLLECTION = "catalog";
export const CATALOG_INDEX_DOC = "index";

/** Light data of one published activity: what cards, carousels and search need. */
export const catalogItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(CATEGORY_IDS),
  type: z.enum(ACTIVITY_TYPES),
  levelMin: z.enum(LEVELS),
  levelMax: z.enum(LEVELS),
  tags: z.array(z.string()),
  thumbnail: z.object({ src: z.string(), alt: z.string() }),
  featured: z.boolean(),
  /** ISO date, so the index is plain JSON from the build to the browser. */
  createdAt: z.iso.datetime(),
});

/** Single aggregated document (`catalog/index`): the catalog costs one Firestore read per visit. */
export const catalogIndexSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: z.iso.datetime(),
  items: z.array(catalogItemSchema),
});

export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type CatalogIndex = z.infer<typeof catalogIndexSchema>;
