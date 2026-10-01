import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView } from "@/components/catalog/category-view";
import { CATEGORIES, getCategory } from "@/lib/activities/categories";
import { getBuildCatalog, getPublicImagePaths } from "@/lib/catalog/build-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map(({ id }) => ({ category: id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/activities/[category]">): Promise<Metadata> {
  const category = getCategory((await params).category);
  return category
    ? {
        title: `${category.name} activities`,
        description: `${category.name} ESL activities: ${category.subtitle.toLowerCase()} for every level.`,
      }
    : {};
}

export default async function CategoryPage({ params }: PageProps<"/activities/[category]">) {
  const category = getCategory((await params).category);
  if (!category) notFound();

  return (
    <CategoryView
      initial={await getBuildCatalog()}
      imagePaths={getPublicImagePaths()}
      category={category}
    />
  );
}
