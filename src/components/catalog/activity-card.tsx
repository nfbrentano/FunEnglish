"use client";

import { Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LevelPill } from "@/components/ui/level-pill";
import { getCategory } from "@/lib/activities/categories";
import type { CatalogItem } from "@/lib/catalog/schema";
import { useShareLink } from "@/lib/share/use-share-link";
import { strings } from "@/lib/strings";
import { ActivityThumbnail } from "./activity-thumbnail";

const actionClasses =
  "relative z-10 flex size-9 items-center justify-center rounded-full bg-primary/80 text-fg-secondary backdrop-blur hover:text-accent";

export function activityHref(item: Pick<CatalogItem, "slug">): string {
  return `/play/${item.slug}`;
}

type ActivityCardProps = {
  item: CatalogItem;
  imageAvailable: boolean;
  isNew?: boolean;
  priority?: boolean;
};

/** Whole card opens the activity; favorite and share sit above the link. */
export function ActivityCard({ item, imageAvailable, isNew = false, priority }: ActivityCardProps) {
  const category = getCategory(item.category)!;
  const { share, copied } = useShareLink();

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-elevated transition-colors duration-200 hover:border-border-strong">
      <div className="relative">
        <ActivityThumbnail item={item} available={imageAvailable} priority={priority} />
        {isNew && (
          <span className="absolute top-3 left-3">
            <Badge>{strings.catalog.newBadge}</Badge>
          </span>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5">
          {/* Placeholder until the favorites spec: visitors are sent to log in. */}
          <Link
            href="/login?next=/activities"
            aria-label={`${strings.catalog.loginToFavorite}: ${item.title}`}
            className={actionClasses}
          >
            <Heart aria-hidden="true" className="size-4" />
          </Link>
          <button
            type="button"
            aria-label={`${strings.catalog.share}: ${item.title}`}
            onClick={() => share({ title: item.title, path: activityHref(item) })}
            className={actionClasses}
          >
            <Share2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-display text-xl leading-snug font-medium text-fg">
          <Link
            href={activityHref(item)}
            className="line-clamp-2 after:absolute after:inset-0 after:content-['']"
          >
            {item.title}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-fg-secondary">
          <span>{category.name}</span>
          <LevelPill min={item.levelMin} max={item.levelMax} />
        </div>
      </div>
      <span role="status" className="sr-only">
        {copied ? strings.catalog.linkCopied : ""}
      </span>
    </article>
  );
}
