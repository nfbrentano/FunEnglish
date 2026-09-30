import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/ui/category-icon";
import { CATEGORIES, getCategory } from "@/lib/activities/categories";
import { strings } from "@/lib/strings";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map(({ id }) => ({ category: id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/activities/[category]">): Promise<Metadata> {
  const category = getCategory((await params).category);
  return { title: category ? `${category.name} activities` : undefined };
}

// Header only; the activity grid comes with the category page spec (SDD/2026-09-30_pagina-de-categoria.md).
export default async function CategoryPage({ params }: PageProps<"/activities/[category]">) {
  const category = getCategory((await params).category);
  if (!category) notFound();

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-16">
      <div className="flex items-center gap-4">
        <CategoryIcon category={category} size="lg" />
        <div>
          <h1 className="font-display text-4xl font-medium">{category.name}</h1>
          <p className="text-fg-secondary">{category.subtitle}</p>
        </div>
      </div>
      <p className="mt-12 text-sm tracking-[0.3em] text-muted uppercase">
        — {strings.comingSoon} —
      </p>
    </section>
  );
}
