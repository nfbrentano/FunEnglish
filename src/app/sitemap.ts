import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/activities/categories";
import { getBuildActivities } from "@/lib/catalog/build-data";
import { sitemapEntries } from "@/lib/seo";

// Static export: written to out/sitemap.xml at build time; new activities join on the next build
// (spec: SEO e metadados, RF03, RNF03).
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activities = (await getBuildActivities()).flatMap(({ slug, updatedAt, activity }) =>
    activity ? [{ slug, updatedAt, category: activity.category }] : [],
  );
  return sitemapEntries(
    activities,
    CATEGORIES.map(({ id }) => id),
  );
}
