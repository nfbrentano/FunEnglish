/**
 * Validates content/activities/**\/*.json and upserts them into Firestore.
 *
 *   npm run seed:check        validate only
 *   npm run seed:emulator     write to the local emulator
 *   npm run seed -- --production   write to the real project (needs FIREBASE_SERVICE_ACCOUNT_KEY)
 *   --dir=<path>              extra content folder (repeatable), e.g. e2e fixtures
 *   --force                   also overwrite activities edited in the admin panel (asks first;
 *                             add --yes to skip the question, e.g. in scripts)
 *
 * Firestore is the source of truth: activities edited in the admin panel after their file was
 * pulled (`npm run content:pull`) are skipped and listed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { loadEnvConfig } from "@next/env";
import { prepareSeed, type SeedFile } from "../src/lib/activities/seed";
import { rebuildCatalogIndex, upsertActivities } from "../src/lib/activities/seed-writer";
import { getAdminDb } from "../src/lib/firebase-admin/core";

const CONTENT_DIR = join(process.cwd(), "content", "activities");

function readSeedFiles(dir: string): SeedFile[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      // Paths stay relative to their content folder (the "ai/" prefix marks AI content).
      path: relative(dir, join(dir, file)),
      contents: readFileSync(join(dir, file), "utf8"),
    }));
}

async function confirmForce(): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    "--force overwrites activities edited in the admin panel. Type 'overwrite' to continue: ",
  );
  rl.close();
  return answer.trim() === "overwrite";
}

async function main() {
  loadEnvConfig(process.cwd());
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");

  const extraDirs = process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--dir="))
    .map((arg) => join(process.cwd(), arg.slice("--dir=".length)));
  const files = [CONTENT_DIR, ...extraDirs].flatMap(readSeedFiles);
  const { activities, errors } = prepareSeed(files);

  for (const { path, messages } of errors) {
    console.error(`✗ ${path}`);
    for (const message of messages) console.error(`    ${message}`);
  }
  console.log(`${activities.length} valid, ${errors.length} invalid (of ${files.length} files)`);

  if (!dryRun) {
    if (!process.env.FIRESTORE_EMULATOR_HOST && !args.has("--production")) {
      throw new Error(
        "Refusing to write to the production Firestore. Use `npm run seed:emulator`, or pass --production.",
      );
    }
    const target = process.env.FIRESTORE_EMULATOR_HOST
      ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}`
      : "production";
    const force = args.has("--force");
    if (force && !args.has("--yes") && !(await confirmForce())) {
      throw new Error("Cancelled: nothing was written.");
    }
    const { created, updated, skipped } = await upsertActivities(
      getAdminDb(),
      activities.map((a) => a.doc),
      { force },
    );
    console.log(
      `Firestore (${target}): ${created} created, ${updated} updated, ${skipped.length} skipped`,
    );
    if (skipped.length > 0) {
      console.log("Skipped (edited in the admin panel; run `npm run content:pull` first):");
      for (const slug of skipped) console.log(`    ${slug}`);
    }
    const index = await rebuildCatalogIndex(getAdminDb());
    console.log(`catalog/index: ${index.items.length} published activities`);
  }

  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
