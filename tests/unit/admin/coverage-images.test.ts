import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeCoverage, isLow } from "@/lib/admin/coverage";
import { findMissingImages, parseImageStyle } from "@/lib/admin/missing-images";
import { isMissingImage } from "@/components/admin/admin-list";

describe("computeCoverage (RF15, CA14)", () => {
  it("counts published and drafts per category × level (every level in the range) and × type", () => {
    const { byLevel, byType } = computeCoverage([
      {
        category: "listening",
        type: "quiz",
        levelMin: "beginner",
        levelMax: "intermediate",
        status: "published",
      },
      {
        category: "listening",
        type: "fill-blanks",
        levelMin: "beginner",
        levelMax: "beginner",
        status: "draft",
      },
    ]);
    expect(byLevel.listening.beginner).toEqual({ published: 1, drafts: 1 });
    expect(byLevel.listening.intermediate).toEqual({ published: 1, drafts: 0 });
    expect(byLevel.listening.advanced).toEqual({ published: 0, drafts: 0 });
    expect(byType.listening["fill-blanks"]).toEqual({ published: 0, drafts: 1 });
    expect(isLow(byLevel.listening.advanced)).toBe(true);
    expect(isLow({ published: 3, drafts: 0 })).toBe(false);
  });
});

describe("missing images (RF16, CA13, CA15)", () => {
  const style = parseImageStyle(
    readFileSync(join(process.cwd(), "content/prompts/image-style.md"), "utf8"),
  );

  it("reads the style paragraph of the guide", () => {
    expect(style).toMatch(/^Flat vector illustration/);
    expect(style).toContain("no frame, no border");
  });

  it("lists thumbnails and content images not in public/, with the import file name", () => {
    const activity = {
      id: "a1",
      title: "Kitchen",
      slug: "kitchen-items",
      thumbnail: {
        src: "/images/activities/kitchen-items/thumb.webp",
        alt: "A kitchen shelf",
        source: "ai",
      },
      content: {
        cards: [
          {
            front: {
              image: {
                src: "/images/activities/kitchen-items/kettle.webp",
                alt: "A kettle",
                source: "ai",
              },
            },
          },
          {
            front: {
              image: { src: "https://example.com/x.png", alt: "Remote", source: "stock" },
            },
          },
        ],
      },
    };
    const missing = findMissingImages(
      [activity],
      new Set(["/images/activities/kitchen-items/thumb.webp"]),
      style,
    );
    expect(missing).toEqual([
      expect.objectContaining({
        src: "/images/activities/kitchen-items/kettle.webp",
        fileName: "kitchen-items--kettle.png",
        prompt: expect.stringMatching(/^A kettle\. Flat vector illustration/),
      }),
    ]);
  });

  it("isMissingImage ignores URLs it can't check", () => {
    const images = new Set(["/images/a.webp"]);
    expect(isMissingImage("/images/a.webp", images)).toBe(false);
    expect(isMissingImage("/images/b.webp", images)).toBe(true);
    expect(isMissingImage("https://example.com/c.webp", images)).toBe(false);
  });
});
