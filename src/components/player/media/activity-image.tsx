"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { getCategory } from "@/lib/activities/categories";
import { categoryImage, siteImageExists } from "@/lib/site-images";

/** What to show if the image doesn't load (spec: mais imagens nas atividades, RF05). */
export type ImageFallback =
  /** The category illustration (or, if that's missing too, the category icon). */
  | { kind: "category"; category: string }
  /** The alt text, large (a flashcard front that is only an image). */
  | { kind: "alt" }
  /** Nothing: the text around it is enough (quiz options, cards with a prompt). */
  | { kind: "hide" }
  /** Something specific (the results trophy icon). */
  | { kind: "element"; element: ReactNode };

/** The category of the activity being played, for images that fall back to it. */
export const PlayerCategoryContext = createContext("");
export const usePlayerCategory = () => useContext(PlayerCategoryContext);

type ActivityImageProps = {
  src: string;
  alt: string;
  fallback: ImageFallback;
  className?: string;
  /** Intrinsic size, so the layout doesn't jump while it loads (RNF02). */
  width?: number;
  height?: number;
  /** Above the fold (the intro's thumbnail): load now instead of lazily. */
  priority?: boolean;
};

/** True when the browser already tried and failed (before React could listen to `error`). */
const failedAlready = (img: HTMLImageElement | null) =>
  Boolean(img && img.complete && img.naturalWidth === 0);

/**
 * Every image of the player: lazy, sized, and never shown broken. A planned image not uploaded
 * yet, a wrong path or a network error all fall back to something meaningful (RF05).
 */
export function ActivityImage({
  src,
  alt,
  fallback,
  className = "",
  width,
  height,
  priority,
}: ActivityImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    // The static HTML may have failed before hydration.
    if (failedAlready(ref.current)) setFailed(src);
  }, [src]);

  if (failed === src) {
    if (fallback.kind === "category")
      return <CategoryArt category={fallback.category} className={className} />;
    if (fallback.kind === "alt")
      return (
        <p className="max-w-md font-display text-3xl leading-snug text-fg md:text-4xl">{alt}</p>
      );
    if (fallback.kind === "element") return <>{fallback.element}</>;
    return null;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export; images are already sized assets
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(src)}
      className={className}
    />
  );
}

/** The category's illustration, or its icon on the category tint until that image exists (RF09). */
export function CategoryArt({
  category,
  className = "",
}: {
  category: string;
  className?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const info = getCategory(category);

  useEffect(() => {
    if (failedAlready(ref.current)) setFailed(true);
  }, []);

  // Not generated yet: the icon right away, without a request that would 404.
  if (failed || !info || !siteImageExists(categoryImage(category))) {
    return (
      <div
        aria-hidden="true"
        data-testid="category-art"
        className={`flex aspect-[16/10] items-center justify-center rounded-2xl ${className}`}
        style={{
          background: `color-mix(in oklab, ${info?.color ?? "var(--accent)"} 18%, transparent)`,
        }}
      >
        {info && (
          <span className="scale-150">
            <CategoryIcon category={info} size="lg" />
          </span>
        )}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export; decorative
    <img
      ref={ref}
      src={categoryImage(category)}
      alt=""
      width={1280}
      height={800}
      loading="lazy"
      decoding="async"
      data-testid="category-art"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
