import { describe, expect, it, vi } from "vitest";

// Images "in this build" (next.config.ts sets this from public/images) and the site URL.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_IMAGES = [
    "/images/activities/some-or-any/thumb.webp",
    "/images/categories/fun.webp",
  ].join(",");
  process.env.NEXT_PUBLIC_SITE_URL = "https://fun-english.web.app";
});

import {
  activityJsonLd,
  activityTitle,
  DEFAULT_OG_IMAGE,
  educationalLevel,
  jsonLdScript,
  metaDescription,
  pageMetadata,
  ROBOTS_DISALLOW,
  sitemapEntries,
  socialImage,
} from "@/lib/seo";

const SITE = "https://fun-english.web.app";

describe("activityTitle (RF01, CA01)", () => {
  it("names the activity and its category", () => {
    expect(activityTitle("Some or Any", "grammar")).toBe("Some or Any – Grammar ESL Activity");
  });
});

describe("metaDescription (RF01)", () => {
  it("keeps short text as it is, without extra spaces", () => {
    expect(metaDescription("  Choose  some or any. ")).toBe("Choose some or any.");
  });

  it("cuts long text at a word, within 160 characters", () => {
    const long = "Practice the past simple with short everyday stories ".repeat(5);
    const cut = metaDescription(long);
    expect(cut.length).toBeLessThanOrEqual(160);
    expect(cut.endsWith("…")).toBe(true);
    expect(long.startsWith(cut.slice(0, -1))).toBe(true);
    expect(cut).not.toMatch(/\s…$/);
  });
});

describe("socialImage (RF02)", () => {
  it("uses the uploaded thumbnail, without the version", () => {
    expect(socialImage("/images/activities/some-or-any/thumb.webp?v=1a2b3c4d", "grammar")).toBe(
      "/images/activities/some-or-any/thumb.webp",
    );
  });

  it("falls back to the category art, then to the site card", () => {
    expect(socialImage("/images/activities/new/thumb.webp", "fun")).toBe(
      "/images/categories/fun.webp",
    );
    expect(socialImage("/images/activities/new/thumb.webp", "grammar")).toBe(DEFAULT_OG_IMAGE.url);
    expect(socialImage(undefined)).toBe(DEFAULT_OG_IMAGE.url);
  });

  it("keeps an image hosted elsewhere", () => {
    expect(socialImage("https://cdn.example.com/a.webp")).toBe("https://cdn.example.com/a.webp");
  });
});

describe("pageMetadata (RF02, RF05)", () => {
  const metadata = pageMetadata({
    title: "ESL Activities",
    description: "Interactive ESL games.",
    path: "/activities",
  });

  it("sets the canonical without filters", () => {
    expect(metadata.alternates?.canonical).toBe("/activities");
  });

  it("fills Open Graph and a large Twitter card", () => {
    expect(metadata.openGraph).toMatchObject({
      title: "ESL Activities | Fun English",
      description: "Interactive ESL games.",
      url: "/activities",
      siteName: "Fun English",
      images: [{ url: DEFAULT_OG_IMAGE.url, width: 1200, height: 630 }],
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("keeps the home title as it is", () => {
    const home = pageMetadata({
      title: "Fun English – Interactive ESL Activities",
      absoluteTitle: true,
      description: "x",
      path: "/",
    });
    expect(home.title).toEqual({ absolute: "Fun English – Interactive ESL Activities" });
    expect(home.openGraph?.title).toBe("Fun English – Interactive ESL Activities");
  });
});

describe("activityJsonLd (RF06)", () => {
  const [resource, breadcrumbs] = activityJsonLd({
    slug: "some-or-any",
    title: "Some or Any",
    description: "Choose some or any.",
    category: "grammar",
    levelMin: "beginner",
    levelMax: "intermediate",
    thumbnail: { src: "/images/activities/some-or-any/thumb.webp" },
  }) as Record<string, unknown>[];

  it("describes a free English learning resource", () => {
    expect(resource).toMatchObject({
      "@type": "LearningResource",
      name: "Some or Any",
      url: `${SITE}/play/some-or-any`,
      image: `${SITE}/images/activities/some-or-any/thumb.webp`,
      educationalLevel: "Beginner, Intermediate",
      inLanguage: "en",
      isAccessibleForFree: true,
    });
  });

  it("has breadcrumbs Home › Activities › Grammar › activity", () => {
    const items = breadcrumbs.itemListElement as { position: number; name: string; item: string }[];
    expect(items.map((i) => i.name)).toEqual(["Home", "Activities", "Grammar", "Some or Any"]);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4]);
    expect(items[2].item).toBe(`${SITE}/activities/grammar`);
  });

  it("can't close the script tag", () => {
    expect(jsonLdScript({ name: "</script><b>" })).not.toContain("</script>");
  });
});

describe("educationalLevel", () => {
  it("lists every level in the range", () => {
    expect(educationalLevel("beginner", "advanced")).toBe("Beginner, Intermediate, Advanced");
    expect(educationalLevel("advanced", "advanced")).toBe("Advanced");
  });
});

describe("sitemapEntries (RF03, CA03)", () => {
  const entries = sitemapEntries(
    [
      { slug: "some-or-any", category: "grammar", updatedAt: "2026-09-30T10:00:00.000Z" },
      { slug: "odd-one-out-1", category: "fun", updatedAt: "2026-10-01T10:00:00.000Z" },
      { slug: "no-date", category: "fun", updatedAt: null },
    ],
    ["fun", "grammar", "writing"],
  );
  const urls = entries.map((e) => e.url);

  it("lists the catalog, every category and every activity given", () => {
    expect(urls).toEqual(
      expect.arrayContaining([
        SITE,
        `${SITE}/activities`,
        `${SITE}/activities/fun`,
        `${SITE}/activities/grammar`,
        `${SITE}/activities/writing`,
        `${SITE}/play/some-or-any`,
        `${SITE}/play/odd-one-out-1`,
        `${SITE}/play/no-date`,
      ]),
    );
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("dates activities by updatedAt and categories by their latest activity", () => {
    const at = (url: string) => entries.find((e) => e.url === url)?.lastModified;
    expect(at(`${SITE}/play/some-or-any`)).toBe("2026-09-30T10:00:00.000Z");
    expect(at(`${SITE}/activities/fun`)).toBe("2026-10-01T10:00:00.000Z");
    expect(at(`${SITE}/activities`)).toBe("2026-10-01T10:00:00.000Z");
    expect(entries.find((e) => e.url === `${SITE}/play/no-date`)).not.toHaveProperty(
      "lastModified",
    );
    expect(entries.find((e) => e.url === `${SITE}/activities/writing`)).not.toHaveProperty(
      "lastModified",
    );
  });

  it("leaves out private pages", () => {
    expect(urls.some((u) => /admin|dashboard|login|signup|play-shell/.test(u))).toBe(false);
  });
});

describe("ROBOTS_DISALLOW (RF04, RF08)", () => {
  it("blocks private pages and student mode", () => {
    expect(ROBOTS_DISALLOW).toEqual(
      expect.arrayContaining(["/admin", "/dashboard", "/login", "/signup", "/*?mode=student"]),
    );
  });
});
