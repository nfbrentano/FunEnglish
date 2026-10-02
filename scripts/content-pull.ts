/**
 * Backs up every activity from Firestore into content/activities (spec: gestão completa, RF10).
 * Firestore is the source of truth; commit the result to keep history in git.
 *
 *   npm run content:pull             from production (GOOGLE_APPLICATION_CREDENTIALS)
 *   npm run content:pull:emulator    from the local emulator
 *
 * Files are formatted like the rest of the repo. Activities that exist only in the repo are
 * listed, never deleted.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { format } from "prettier";
import { ACTIVITIES_COLLECTION } from "../src/lib/activities/collections";
import { seedPathFor, toSeedJson } from "../src/lib/activities/export";
import { validateActivity } from "../src/lib/activities/validate";
import { getAdminDb } from "../src/lib/firebase-admin/core";

// --out=<dir> writes somewhere else (tests).
const OUT_ARG = process.argv.find((arg) => arg.startsWith("--out="));
const CONTENT_DIR = OUT_ARG
  ? join(process.cwd(), OUT_ARG.slice("--out=".length))
  : join(process.cwd(), "content", "activities");

/** slug → path of the file that holds it today. */
function filesBySlug(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(CONTENT_DIR)) return map;
  for (const file of readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf8" })) {
    if (!file.endsWith(".json")) continue;
    try {
      const slug = (JSON.parse(readFileSync(join(CONTENT_DIR, file), "utf8")) as { slug?: string })
        .slug;
      if (slug) map.set(slug, file);
    } catch {
      // An invalid file is reported by `npm run seed:check`.
    }
  }
  return map;
}

async function main() {
  loadEnvConfig(process.cwd());
  const target = process.env.FIRESTORE_EMULATOR_HOST
    ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}`
    : "production";
  const snapshot = await getAdminDb().collection(ACTIVITIES_COLLECTION).get();
  const existing = filesBySlug();
  let written = 0;
  let unchanged = 0;

  for (const doc of snapshot.docs) {
    const json = toSeedJson(doc.data());
    const result = validateActivity(json);
    if (!result.ok) console.warn(`! ${json.slug}: ${result.errors.join("; ")}`);

    const path = seedPathFor(json);
    const contents = await format(JSON.stringify(json), { parser: "json" });
    const previous = existing.get(String(json.slug));
    existing.delete(String(json.slug));

    // Category or origin changed in the panel: the file moves.
    if (previous && previous !== path) unlinkSync(join(CONTENT_DIR, previous));
    const full = join(CONTENT_DIR, path);
    if (previous === path && readFileSync(full, "utf8") === contents) {
      unchanged++;
      continue;
    }
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
    written++;
  }

  console.log(
    `Pulled ${snapshot.size} activities from ${target}: ${written} written, ${unchanged} unchanged`,
  );
  if (existing.size > 0) {
    console.log("Only in the repo (deleted in the panel?) — remove them by hand if so:");
    for (const path of existing.values()) console.log(`    content/activities/${path}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
