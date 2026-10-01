import type { CatalogItem } from "@/lib/catalog/schema";

export function catalogItem(
  overrides: Partial<CatalogItem> & Pick<CatalogItem, "slug">,
): CatalogItem {
  return {
    id: overrides.slug,
    title: overrides.slug,
    description: "",
    category: "grammar",
    type: "quiz",
    levelMin: "beginner",
    levelMax: "advanced",
    tags: [],
    thumbnail: { src: `/images/${overrides.slug}.webp`, alt: overrides.slug },
    featured: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}
