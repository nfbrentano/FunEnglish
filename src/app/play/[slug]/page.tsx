import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { LevelPill } from "@/components/ui/level-pill";
import { getCategory } from "@/lib/activities/categories";
import { getBuildCatalog } from "@/lib/catalog/build-data";
import { strings } from "@/lib/strings";

// Placeholder page until the activity engine spec (SDD/2026-09-30_motor-de-atividades.md).
// Static export: one page per activity published at build time.
export const dynamicParams = false;

/** Static export needs at least one path; this one renders as 404. */
const NO_ACTIVITIES = "_";

export async function generateStaticParams() {
  const { items } = await getBuildCatalog();
  return items.length > 0 ? items.map(({ slug }) => ({ slug })) : [{ slug: NO_ACTIVITIES }];
}

async function findItem(slug: string) {
  const { items } = await getBuildCatalog();
  return items.find((item) => item.slug === slug);
}

export async function generateMetadata({ params }: PageProps<"/play/[slug]">): Promise<Metadata> {
  const item = await findItem((await params).slug);
  return item ? { title: item.title, description: item.description } : {};
}

export default async function PlayPage({ params }: PageProps<"/play/[slug]">) {
  const item = await findItem((await params).slug);
  if (!item) notFound();
  const category = getCategory(item.category)!;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-24 text-center">
      <p className="text-sm text-muted">{category.name}</p>
      <h1 className="font-display text-5xl font-medium">{item.title}</h1>
      <LevelPill min={item.levelMin} max={item.levelMax} />
      <p className="max-w-xl text-fg-secondary">{item.description}</p>
      <p className="text-xs tracking-[0.3em] text-muted uppercase">— {strings.comingSoon} —</p>
      <ButtonLink href="/activities" variant="secondary">
        {strings.notFound.cta}
      </ButtonLink>
    </section>
  );
}
