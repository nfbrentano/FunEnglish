import { describe, expect, it } from "vitest";
import { ACTIVITY_TYPES } from "@/lib/activities/schema/activity";
import { validateActivity } from "@/lib/activities/validate";
import { CONTENT_TEMPLATES } from "@/lib/admin/templates";

const base = {
  schemaVersion: 1,
  title: "Template",
  slug: "template",
  description: "A template activity.",
  category: "grammar",
  levelMin: "beginner",
  levelMax: "intermediate",
  tags: [],
  status: "published",
  featured: false,
  thumbnail: { src: "/images/activities/template/thumb.webp", alt: "Template", source: "ai" },
  origin: "human",
  reviewStatus: "reviewed",
};

describe("CONTENT_TEMPLATES", () => {
  it.each(ACTIVITY_TYPES)("%s template is a valid activity", (type) => {
    const result = validateActivity({ ...base, type, content: CONTENT_TEMPLATES[type] });
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
