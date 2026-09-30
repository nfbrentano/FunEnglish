import { ThemeSelector } from "@/components/layout/theme-selector";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { LevelPill } from "@/components/ui/level-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/lib/activities/categories";

// Development-only gallery of the base components (layout spec, CA06). Not part of the export.
export default function UiGallery() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-12 px-4 py-12">
      <header className="space-y-3">
        <h1 className="font-display text-5xl">Component gallery</h1>
        <ThemeSelector />
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <ButtonLink href="/activities" variant="secondary">
            Link
          </ButtonLink>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Badges and levels</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>New</Badge>
          <LevelPill min="beginner" max="beginner" />
          <LevelPill min="beginner" max="intermediate" />
          <LevelPill min="intermediate" max="advanced" />
          <LevelPill min="beginner" max="advanced" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Categories</h2>
        <div className="flex flex-wrap gap-4">
          {CATEGORIES.map((category) => (
            <span key={category.id} className="flex items-center gap-2 text-sm">
              <CategoryIcon category={category} size="md" /> {category.name}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Cards and skeletons</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="space-y-2 p-4">
            <h3 className="font-display text-xl">Some or Any</h3>
            <p className="text-sm text-fg-secondary">Grammar</p>
            <LevelPill min="beginner" max="intermediate" />
          </Card>
          <Card className="space-y-3 p-4">
            <Skeleton className="aspect-[16/10] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
        </div>
      </section>
    </div>
  );
}
