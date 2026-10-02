import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getBuildCatalog, getPublicImagePaths } from "@/lib/catalog/build-data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "ESL Activities",
  description:
    "Interactive ESL games, quizzes and activities for every level, organized in 9 categories.",
  // ?q= and ?level= filter this same page: the canonical drops them (RF05, CA05).
  path: "/activities",
});

export default async function ActivitiesPage() {
  const catalog = await getBuildCatalog();
  return <CatalogView initial={catalog} imagePaths={getPublicImagePaths()} />;
}
