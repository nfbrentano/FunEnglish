/**
 * Updates all image prompts across content/activities to include explicit aspect ratio
 * instructions (16:10 for thumbnails and category art, 1:1 for quiz options).
 *
 * Usage:
 *   npx tsx scripts/update-image-prompts-ratio.ts
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "prettier";

const CONTENT_DIR = join(process.cwd(), "content", "activities");

function updatePrompt(src: string, prompt: string): string {
  let cleaned = prompt.trim();
  const isThumb = src.endsWith("thumb.webp") || src.includes("/categories/");
  const isOption = /-option-\d+\.webp$/i.test(src);

  if (isThumb) {
    if (!cleaned.includes("aspect ratio 16:10")) {
      // Remove any trailing period before appending ratio suffix or append directly
      cleaned = `${cleaned} aspect ratio 16:10`;
    }
  } else if (isOption) {
    if (!cleaned.includes("square aspect ratio 1:1")) {
      cleaned = `${cleaned} square aspect ratio 1:1`;
    }
  }

  return cleaned;
}

async function main() {
  const files = readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".json"))
    .sort();

  let modifiedFiles = 0;
  let updatedPrompts = 0;

  for (const file of files) {
    const fullPath = join(CONTENT_DIR, file);
    const raw = readFileSync(fullPath, "utf8");
    const activity = JSON.parse(raw);
    let changed = false;

    if (activity.thumbnail && typeof activity.thumbnail.prompt === "string") {
      const original = activity.thumbnail.prompt;
      const updated = updatePrompt(activity.thumbnail.src || "thumb.webp", original);
      if (updated !== original) {
        activity.thumbnail.prompt = updated;
        changed = true;
        updatedPrompts++;
      }
    }

    const walk = (node: unknown) => {
      if (Array.isArray(node)) {
        node.forEach(walk);
      } else if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        if (typeof obj.src === "string" && typeof obj.prompt === "string" && obj.prompt.trim()) {
          const original = obj.prompt;
          const updated = updatePrompt(obj.src, original);
          if (updated !== original) {
            obj.prompt = updated;
            changed = true;
            updatedPrompts++;
          }
        }
        Object.values(obj).forEach(walk);
      }
    };

    if (activity.content) {
      walk(activity.content);
    }

    if (changed) {
      const formatted = await format(JSON.stringify(activity), { parser: "json" });
      writeFileSync(fullPath, formatted, "utf8");
      modifiedFiles++;
    }
  }

  console.log(`Updated ${updatedPrompts} prompts across ${modifiedFiles} files (of ${files.length} total files).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
