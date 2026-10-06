import Image from "next/image";
import { CategoryIcon } from "@/components/ui/category-icon";
import { getCategory } from "@/lib/activities/categories";
import type { CatalogItem } from "@/lib/catalog/schema";

/**
 * 16:10 thumbnail. Images that don't exist yet (known at build time) show a tinted placeholder
 * with the category icon instead of a broken image.
 */
export function ActivityThumbnail({
  item,
  available,
  priority = false,
}: {
  item: CatalogItem;
  available: boolean;
  priority?: boolean;
}) {
  const category = getCategory(item.category)!;

  return (
    <div className="relative aspect-16/10 overflow-hidden bg-secondary">
      {available ? (
        <Image
          src={item.thumbnail.src}
          alt={item.thumbnail.alt}
          fill
          priority={priority}
          sizes="(min-width: 768px) 288px, 256px"
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
      ) : (
        <div
          role="img"
          aria-label={item.thumbnail.alt}
          className="flex size-full items-center justify-center"
          style={{
            backgroundColor: `color-mix(in oklab, ${category.color} 12%, var(--bg-elevated))`,
          }}
        >
          <CategoryIcon category={category} size="lg" />
        </div>
      )}
    </div>
  );
}
