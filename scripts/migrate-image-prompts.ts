/**
 * Moves the prompts of content/prompts/images/<slug>/<name>.txt into the activities, next to each
 * image (spec: imagens pelo painel, RF02). Always updates the JSON files in content/activities;
 * also updates Firestore (the source of truth) with --emulator or --production.
 *
 *   npm run images:migrate-prompts                   files only
 *   npm run images:migrate-prompts -- --production   files + production Firestore
 *   --overwrite                                      replace prompts that are already set
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { format } from "prettier";
import { ACTIVITIES_COLLECTION } from "../src/lib/activities/collections";
import { applyImagePrompts, promptFromTxt } from "../src/lib/activities/image-prompts";
import { getAdminDb } from "../src/lib/firebase-admin/core";

const PROMPTS_DIR = join(process.cwd(), "content", "prompts", "images");
const CONTENT_DIR = join(process.cwd(), "content", "activities");

function readPrompts(): Map<string, string> {
  const prompts = new Map<string, string>();
  if (!existsSync(PROMPTS_DIR)) return prompts;
  for (const file of readdirSync(PROMPTS_DIR, { recursive: true, encoding: "utf8" })) {
    const match = /^([^/\\]+)[/\\]([^/\\]+)\.txt$/.exec(file);
    if (!match) continue;
    const prompt = promptFromTxt(readFileSync(join(PROMPTS_DIR, file), "utf8"));
    if (prompt) prompts.set(`/images/activities/${match[1]}/${match[2]}.webp`, prompt);
  }
  return prompts;
}

async function main() {
  loadEnvConfig(process.cwd());
  const args = new Set(process.argv.slice(2));
  const overwrite = args.has("--overwrite");
  const prompts = readPrompts();
  const used = new Set<string>();
  console.log(`${prompts.size} prompt files`);

  let files = 0;
  for (const file of readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf8" })) {
    if (!file.endsWith(".json")) continue;
    const path = join(CONTENT_DIR, file);
    const { value, filled } = applyImagePrompts(JSON.parse(readFileSync(path, "utf8")), prompts, {
      overwrite,
    });
    filled.forEach((src) => used.add(src));
    if (filled.length === 0) continue;
    writeFileSync(path, await format(JSON.stringify(value), { parser: "json" }));
    files++;
  }
  console.log(`Files: prompts added to ${files} activities`);

  if (args.has("--production") || args.has("--emulator")) {
    if (args.has("--emulator")) process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    const db = getAdminDb();
    const snapshot = await db.collection(ACTIVITIES_COLLECTION).get();
    let docs = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const { value, filled } = applyImagePrompts(
        { thumbnail: data.thumbnail, content: data.content },
        prompts,
        { overwrite },
      );
      filled.forEach((src) => used.add(src));
      if (filled.length === 0) continue;
      // Only the image fields change; editedInPanelAt stays as it was.
      await doc.ref.update({ thumbnail: value.thumbnail, content: value.content });
      docs++;
    }
    const target = process.env.FIRESTORE_EMULATOR_HOST ? "emulator" : "production";
    console.log(`Firestore (${target}): prompts added to ${docs} activities`);
  }

  const unused = [...prompts.keys()].filter((src) => !used.has(src));
  if (unused.length > 0) {
    console.log("Prompt files with no matching image (already set, or the image was renamed):");
    for (const src of unused) console.log(`    ${src}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
