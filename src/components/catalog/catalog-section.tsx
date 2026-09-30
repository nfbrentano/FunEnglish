import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { strings } from "@/lib/strings";

type CatalogSectionProps = {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  seeAllHref: string;
  children: ReactNode;
};

export function CatalogSection({
  id,
  title,
  subtitle,
  icon,
  seeAllHref,
  children,
}: CatalogSectionProps) {
  const headingId = `section-${id}`;
  return (
    <section aria-labelledby={headingId} className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h2 id={headingId} className="font-display text-3xl leading-tight font-medium">
              {title}
            </h2>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        <Link
          href={seeAllHref}
          aria-label={strings.catalog.seeAllIn(title)}
          className="flex shrink-0 items-center gap-1 text-sm text-accent hover:underline"
        >
          {strings.catalog.seeAll}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}
