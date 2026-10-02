"use client";

import { useEffect } from "react";
import { imageExists } from "@/lib/site-images";

/** Every image src inside an item (its media, front, options…). */
export function imagesIn(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => imagesIn(v, found));
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.src === "string" && typeof record.alt === "string") found.push(record.src);
    Object.values(record).forEach((v) => imagesIn(v, found));
  }
  return found;
}

/**
 * Warms the cache with the NEXT item's images only, so moving on is instant without
 * downloading the whole activity up front (spec: mais imagens nas atividades, RNF02).
 */
export function usePreloadNext(nextItem: unknown) {
  const key = imagesIn(nextItem).filter(imageExists).join("\n");
  useEffect(() => {
    if (!key) return;
    for (const src of key.split("\n")) {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
    }
  }, [key]);
}
