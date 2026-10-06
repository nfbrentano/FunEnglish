"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ActivityCard } from "@/components/catalog/activity-card";
import { ButtonLink } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { CATEGORIES } from "@/lib/activities/categories";
import { useAuth } from "@/lib/auth/use-auth";
import type { CatalogIndex } from "@/lib/catalog/schema";
import { homeHighlights, isNew } from "@/lib/catalog/sections";
import { useCatalogIndex, useClientNow } from "@/lib/catalog/use-catalog-index";
import { strings } from "@/lib/strings";

const t = strings.homePage;

/** Landing page (spec: páginas institucionais, RF01). Highlights come from catalog/index. */
export function HomeView({ initial, imagePaths }: { initial: CatalogIndex; imagePaths: string[] }) {
  const { index } = useCatalogIndex(initial);
  const { user } = useAuth();
  const now = useClientNow();
  const images = useMemo(() => new Set(imagePaths), [imagePaths]);
  const highlights = homeHighlights(index.items);
  const count = index.items.length;

  return (
    <div className="flex flex-col">
      <section className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
          <p className="text-xs tracking-[0.3em] text-accent uppercase">{t.eyebrow}</p>
          <h1 className="font-display text-5xl leading-[1.05] font-medium text-fg sm:text-6xl md:text-7xl">
            {t.title}
          </h1>
          <p className="max-w-2xl text-lg text-fg-secondary">{t.subtitle}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/activities" className="min-h-12 px-7 text-base">
              {t.browse}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink
              href={user ? "/dashboard" : "/signup"}
              variant="secondary"
              className="min-h-12 px-7 text-base"
            >
              {user ? t.dashboard : t.signUp}
            </ButtonLink>
          </div>
          <dl aria-label={t.stats} className="mt-6 grid w-full max-w-2xl grid-cols-3 gap-3">
            {[
              [count > 0 ? String(count) : "—", t.activities(count)],
              [String(CATEGORIES.length), t.categories],
              [t.free, t.freeDetail],
            ].map(([value, label]) => (
              <div
                key={label}
                className="flex flex-col-reverse gap-1 rounded-2xl border border-border-subtle bg-elevated px-3 py-4"
              >
                <dt className="text-xs text-fg-secondary sm:text-sm">{label}</dt>
                <dd className="font-display text-3xl text-fg sm:text-4xl">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {highlights.length > 0 && (
        <section
          aria-labelledby="featured-title"
          className="mx-auto w-full max-w-300 space-y-6 px-4 py-16"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 id="featured-title" className="font-display text-4xl font-medium">
                {t.featured}
              </h2>
              <p className="text-fg-secondary">{t.featuredSubtitle}</p>
            </div>
            <Link href="/activities" className="text-sm text-accent hover:underline">
              {t.seeAll}
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3">
            {highlights.map((item, i) => (
              <li key={item.id}>
                <ActivityCard
                  item={item}
                  imageAvailable={images.has(item.thumbnail.src)}
                  isNew={now !== null && isNew(item.createdAt, now)}
                  priority={i < 3}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="categories-title"
        className="mx-auto w-full max-w-300 space-y-6 px-4 pb-16"
      >
        <h2 id="categories-title" className="font-display text-4xl font-medium">
          {t.categoriesTitle}
        </h2>
        <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link
                href={`/activities/${category.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-elevated p-4 transition-colors hover:border-accent"
              >
                <CategoryIcon category={category} size="lg" />
                <span className="flex flex-col">
                  <span className="font-display text-2xl text-fg">{category.name}</span>
                  <span className="text-sm text-fg-secondary">{category.subtitle}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {!user && (
        <section className="border-t border-border-subtle bg-secondary">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
            <h2 className="font-display text-4xl font-medium">{t.ctaTitle}</h2>
            <p className="text-fg-secondary">{t.ctaText}</p>
            <ButtonLink href="/signup" className="min-h-12 px-7 text-base">
              {t.signUp}
            </ButtonLink>
          </div>
        </section>
      )}
    </div>
  );
}
