import type { Metadata } from "next";
import { CategoryView } from "@/components/catalog/category-view";
import { getBuildCatalog, getPublicImagePaths } from "@/lib/catalog/build-data";

export const metadata: Metadata = {
  title: "New activities",
  description: "Every Fun English activity, newest first.",
};

export default async function NewActivitiesPage() {
  return (
    <CategoryView
      initial={await getBuildCatalog()}
      imagePaths={getPublicImagePaths()}
      category={null}
    />
  );
}
