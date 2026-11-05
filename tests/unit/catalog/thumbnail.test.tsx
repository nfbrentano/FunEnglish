import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityThumbnail } from "@/components/catalog/activity-thumbnail";
import type { CatalogItem } from "@/lib/catalog/schema";

const sampleItem: CatalogItem = {
  id: "1",
  slug: "test-activity",
  title: "Test Activity",
  description: "A fun test activity",
  category: "grammar",
  type: "quiz",
  levelMin: "beginner",
  levelMax: "intermediate",
  tags: [],
  thumbnail: { src: "/images/activities/test/thumb.webp", alt: "A test notebook" },
  featured: false,
  createdAt: "2026-09-29T00:00:00.000Z",
};

describe("ActivityThumbnail", () => {
  it("renders the image with withBasePath applied when available", () => {
    render(<ActivityThumbnail item={sampleItem} available={true} />);

    const img = screen.getByRole("img", { name: "A test notebook" });
    expect(img).toBeInTheDocument();
    expect(decodeURIComponent(img.getAttribute("src") ?? "")).toContain("/images/activities/test/thumb.webp");
  });

  it("renders category placeholder icon when image is not available", () => {
    render(<ActivityThumbnail item={sampleItem} available={false} />);

    expect(screen.getByRole("img", { name: "A test notebook" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "A test notebook" })?.tagName).toBe("DIV");
  });
});
