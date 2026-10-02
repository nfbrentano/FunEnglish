import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView } from "@/components/catalog/category-view";
import { CATEGORIES, getCategory } from "@/lib/activities/categories";
import { getBuildCatalog, getPublicImagePaths } from "@/lib/catalog/build-data";
import { pageMetadata, socialImage } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map(({ id }) => ({ category: id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/activities/[category]">): Promise<Metadata> {
  const category = getCategory((await params).category);
  return category
    ? pageMetadata({
        title: `${category.name} ESL Activities`,
        description: `${category.name} ESL activities: ${category.subtitle.toLowerCase()} for every level.`,
        // Level and search filters live in the query string: one canonical (RF05).
        path: `/activities/${category.id}`,
        image: socialImage(undefined, category.id),
      })
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
