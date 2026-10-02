// Titles, descriptions, social cards, canonical links and JSON-LD of the public pages
// (spec: SEO e metadados). Pure functions: the pages call them from generateMetadata.
import type { Metadata } from "next";
import { getCategory } from "./activities/categories";
import { LEVELS, type Level } from "./activities/levels";
import { SITE_NAME, siteUrl } from "./site";
import { categoryImage, imageExists, stripVersion } from "./site-images";

/** Site-wide social card (1200×630), for pages without an image of their own. */
export const DEFAULT_OG_IMAGE = { url: "/og-default.png", width: 1200, height: 630 };

const MAX_DESCRIPTION = 160;

/** At most 160 characters, cut at a word with "…" (RF01). */
export function metaDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_DESCRIPTION) return clean;
  const cut = clean.slice(0, MAX_DESCRIPTION - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.–-]+$/, "");
  return `${atWord || cut}…`;
}

/** "Some or Any – Grammar ESL Activity"; the layout template adds " | Fun English" (RF01). */
export function activityTitle(title: string, category: string): string {
  const name = getCategory(category)?.name ?? category;
  return `${title} – ${name} ESL Activity`;
}

/** Absolute URL of a site path, or the URL itself when it is already absolute. */
export const absoluteUrl = (path: string) =>
  /^https?:\/\//.test(path) ? path : path === "/" ? siteUrl : `${siteUrl}${path}`;

/**
 * The social card image: the thumbnail when it was uploaded, else the category illustration,
 * else the site card (RF02). Images not in the build would be a broken preview.
 */
export function socialImage(thumbnail: string | undefined, category?: string): string {
  if (thumbnail && (/^https?:\/\//.test(thumbnail) || imageExists(thumbnail))) {
    return /^https?:\/\//.test(thumbnail) ? thumbnail : stripVersion(thumbnail);
  }
  if (category && imageExists(categoryImage(category))) return categoryImage(category);
  return DEFAULT_OG_IMAGE.url;
}

type PageSeo = {
  /** Without the " | Fun English" suffix; `absolute` skips it (the home page). */
  title: string;
  absoluteTitle?: boolean;
  description: string;
  /** Canonical path, without filters or ?mode=student (RF05, RF08). */
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
};

/** Metadata of a public page: description, canonical, Open Graph and Twitter card. */
export function pageMetadata({
  title,
  absoluteTitle,
  description,
  path,
  image = DEFAULT_OG_IMAGE.url,
  imageAlt,
  type = "website",
}: PageSeo): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  const desc = metaDescription(description);
  const images = [
    image === DEFAULT_OG_IMAGE.url
      ? { ...DEFAULT_OG_IMAGE, alt: `${SITE_NAME} – Interactive ESL Activities` }
      : { url: image, alt: imageAlt ?? title },
  ];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: fullTitle,
      description: desc,
      images,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: desc, images },
  };
}

type LdActivity = {
  slug: string;
  title: string;
  description: string;
  category: string;
  levelMin: Level;
  levelMax: Level;
  thumbnail: { src: string };
};

const LEVEL_NAMES: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** "Beginner", "Beginner, Intermediate"… every level the activity spans. */
export function educationalLevel(min: Level, max: Level): string {
  return LEVELS.slice(LEVELS.indexOf(min), LEVELS.indexOf(max) + 1)
    .map((level) => LEVEL_NAMES[level])
    .join(", ");
}

/** LearningResource and BreadcrumbList of an activity page (RF06). */
export function activityJsonLd(activity: LdActivity): object[] {
  const category = getCategory(activity.category);
  const url = absoluteUrl(`/play/${activity.slug}`);
  return [
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: activity.title,
      description: activity.description,
      url,
      image: absoluteUrl(socialImage(activity.thumbnail.src, activity.category)),
      educationalLevel: educationalLevel(activity.levelMin, activity.levelMax),
      learningResourceType: "Interactive activity",
      about: category?.name ?? activity.category,
      inLanguage: "en",
      isAccessibleForFree: true,
      provider: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Home", url: absoluteUrl("/") },
        { name: "Activities", url: absoluteUrl("/activities") },
        {
          name: category?.name ?? activity.category,
          url: absoluteUrl(`/activities/${activity.category}`),
        },
        { name: activity.title, url },
      ].map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    },
  ];
}

/** JSON for a <script type="application/ld+json">, safe against "</script>" in content. */
export const jsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/** Pages without filters that search engines should know about. */
const STATIC_PATHS = ["/", "/activities", "/activities/new", "/about", "/faq", "/contact"];
const LEGAL_PATHS = ["/privacy", "/terms"];

type SitemapActivity = { slug: string; category: string; updatedAt: string | null };
type SitemapEntry = {
  url: string;
  lastModified?: string;
  changeFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
};

/**
 * Catalog, categories, institutional pages and every published activity (RF03). The build reads
 * only published activities, so drafts never get here. A category changes when one of its
 * activities does.
 */
export function sitemapEntries(
  activities: SitemapActivity[],
  categories: readonly string[],
): SitemapEntry[] {
  const latest = (items: SitemapActivity[]) =>
    items.reduce<string | undefined>(
      (max, a) => (a.updatedAt && (!max || a.updatedAt > max) ? a.updatedAt : max),
      undefined,
    );
  const newest = latest(activities);
  const entries: SitemapEntry[] = [
    ...STATIC_PATHS.map((path) => ({
      url: absoluteUrl(path),
      ...(path.startsWith("/activities") || path === "/" ? { lastModified: newest } : {}),
      changeFrequency: "weekly" as const,
      priority: path === "/" || path === "/activities" ? 1 : 0.5,
    })),
    ...LEGAL_PATHS.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
    ...categories.map((id) => ({
      url: absoluteUrl(`/activities/${id}`),
      lastModified: latest(activities.filter((a) => a.category === id)),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...activities.map((a) => ({
      url: absoluteUrl(`/play/${a.slug}`),
      lastModified: a.updatedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
  return entries.map(({ lastModified, ...entry }) =>
    lastModified ? { ...entry, lastModified } : entry,
  );
}

/** Private and duplicate pages crawlers should skip (RF04, RF08). */
export const ROBOTS_DISALLOW = [
  "/admin",
  "/dashboard",
  "/login",
  "/signup",
  "/reset-password",
  "/play-shell",
  "/*?mode=student",
  "/*&mode=student",
];
