import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/activities/categories";

// Quality checks for the initial AI-generated catalog (SDD: conteúdo inicial gerado por IA).
const dir = join(process.cwd(), "content", "activities");
const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) =>
  f.endsWith(".json"),
);
const activities = files.map((file) => ({
  file,
  data: JSON.parse(readFileSync(join(dir, file), "utf8")),
}));
const published = activities.filter(({ data }) => data.status === "published");

type ImageRef = { src: string; alt: string; prompt?: string };

function images(value: unknown, found: ImageRef[] = []): ImageRef[] {
  if (Array.isArray(value)) value.forEach((v) => images(v, found));
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.src === "string" && typeof record.alt === "string")
      found.push(record as ImageRef);
    Object.values(record).forEach((v) => images(v, found));
  }
  return found;
}

describe("initial catalog", () => {
  it.each(CATEGORIES.map((c) => c.id))(
    "%s has 3+ published activities in 2+ level ranges",
    (category) => {
      const inCategory = published.filter(({ data }) => data.category === category);
      expect(inCategory.length).toBeGreaterThanOrEqual(3);
      expect(
        new Set(inCategory.map(({ data }) => `${data.levelMin}-${data.levelMax}`)).size,
      ).toBeGreaterThanOrEqual(2);
    },
  );

  it.each(activities.map(({ file, data }) => [file, data] as const))(
    "%s sits in its category folder",
    (file, data) => {
      expect(file.split(/[\\/]/).slice(-2)).toEqual([data.category, `${data.slug}.json`]);
    },
  );

  // The prompt lives next to the image, so any image can be generated again (spec: imagens pelo
  // painel, RF01). Uploads from the admin add only .webp files, so this never blocks a deploy.
  it.each(activities.map(({ file, data }) => [file, data] as const))(
    "%s has a prompt for every image",
    (_, data) => {
      for (const image of images(data)) expect(image.prompt, image.src).toBeTruthy();
    },
  );

  it.each(
    activities
      .filter(({ data }) => data.type === "quiz")
      .map(({ file, data }) => [file, data] as const),
  )("%s explains every answer", (_, data) => {
    for (const question of data.content.questions)
      expect(question.explanation, question.prompt).toBeTruthy();
  });
});
