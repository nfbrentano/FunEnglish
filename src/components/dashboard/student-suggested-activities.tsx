"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useCatalogIndex, useClientNow } from "@/lib/catalog/use-catalog-index";
import { ActivityCard } from "@/components/catalog/activity-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogItem } from "@/lib/catalog/schema";
import { levelInRange, type Level } from "@/lib/activities/levels";
import { isNew } from "@/lib/catalog/sections";

type StudentSuggestedActivitiesProps = {
  level?: string | null;
  interests?: string[] | null;
};

function mapCEFRToLevel(cefr?: string | null): Level | null {
  if (!cefr) return null;
  const upper = cefr.toUpperCase();
  if (upper.startsWith("A")) return "beginner";
  if (upper.startsWith("B")) return "intermediate";
  if (upper.startsWith("C")) return "advanced";
  return null;
}

function scoreItem(item: CatalogItem, interests: string[]): number {
  if (!interests || interests.length === 0) return 0;
  
  let score = 0;
  const itemTags = item.tags.map(t => t.toLowerCase());
  const category = item.category.toLowerCase();
  
  for (const interest of interests) {
    const i = interest.toLowerCase();
    if (itemTags.includes(i)) score += 3;
    else if (itemTags.some(t => t.includes(i) || i.includes(t))) score += 1;
    if (category.includes(i) || i.includes(category)) score += 2;
  }
  
  return score;
}

export function StudentSuggestedActivities({ level, interests }: StudentSuggestedActivitiesProps) {
  const { index, waiting } = useCatalogIndex();
  const now = useClientNow();

  const suggestions = useMemo(() => {
    if (!index || index.items.length === 0) return [];

    let filtered = index.items;
    
    // 1. Filter by level if available
    const mappedLevel = mapCEFRToLevel(level);
    if (mappedLevel) {
      filtered = filtered.filter(item => levelInRange(mappedLevel, item.levelMin, item.levelMax));
    }
    
    // 2. Score by interests
    const interestsList = interests || [];
    
    // Map with scores
    const scored = filtered.map(item => ({
      item,
      score: scoreItem(item, interestsList),
    }));
    
    // Sort by score (descending), then by recency
    scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.item.createdAt.localeCompare(a.item.createdAt);
    });
    
    // Take top 4
    return scored.slice(0, 4).map(s => s.item);
  }, [index, level, interests]);

  if (waiting) {
    return (
      <div className="space-y-4">
        <h4 className="font-display text-lg font-medium text-fg flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          Suggested Activities
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null; // Or show empty state
  }

  return (
    <div className="space-y-4">
      <h4 className="font-display text-lg font-medium text-fg flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        Suggested Activities
      </h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {suggestions.map((item) => (
          <ActivityCard
            key={item.id}
            item={item}
            imageAvailable={true} // In our app, images are generally available or fallback correctly
            isNew={now ? isNew(item.createdAt, now) : false}
          />
        ))}
      </div>
    </div>
  );
}
