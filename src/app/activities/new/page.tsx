import type { Metadata } from "next";
import { CategoryView } from "@/components/catalog/category-view";
import { getBuildCatalog, getPublicImagePaths } from "@/lib/catalog/build-data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "New ESL Activities",
  description: "Every Fun English activity, newest first.",
  path: "/activities/new",
});

export default async function NewActivitiesPage() {
  return (
    <CategoryView
      initial={await getBuildCatalog()}
      imagePaths={getPublicImagePaths()}
      category={null}
    />
  );
}
