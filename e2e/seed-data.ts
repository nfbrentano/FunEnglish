import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** What e2e/global-setup.ts seeds: the real content plus the e2e fixtures. */
const dirs = ["content/activities", "e2e/fixtures/activities"];

export const seeded = dirs.flatMap((dir) =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".json"))
    .map(
      (file) =>
        JSON.parse(readFileSync(join(dir, file), "utf8")) as {
          status: string;
          category: string;
          title: string;
          levelMin: string;
          levelMax: string;
        },
    ),
);

export const PUBLISHED = seeded.filter((a) => a.status === "published").length;

const LEVELS = ["beginner", "intermediate", "advanced"];

/** Published activities of a category, optionally covering a level (as the catalog filters). */
export const publishedCount = (category: string, level?: string) =>
  seeded.filter(
    (a) =>
      a.status === "published" &&
      a.category === category &&
      (!level ||
        (LEVELS.indexOf(a.levelMin) <= LEVELS.indexOf(level) &&
          LEVELS.indexOf(level) <= LEVELS.indexOf(a.levelMax))),
  ).length;
