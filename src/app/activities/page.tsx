import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getBuildCatalog, getPublicImagePaths } from "@/lib/catalog/build-data";

export const metadata: Metadata = {
  title: "Activities",
  description:
    "Interactive ESL games, quizzes and activities for every level, organized in 9 categories.",
};

export default async function ActivitiesPage() {
  const catalog = await getBuildCatalog();
  return <CatalogView initial={catalog} imagePaths={getPublicImagePaths()} />;
}
