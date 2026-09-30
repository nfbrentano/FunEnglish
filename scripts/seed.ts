/**
 * Validates content/activities/**\/*.json and upserts them into Firestore.
 *
 *   npm run seed:check        validate only
 *   npm run seed:emulator     write to the local emulator
 *   npm run seed -- --production   write to the real project (needs FIREBASE_SERVICE_ACCOUNT_KEY)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { loadEnvConfig } from "@next/env";
import { prepareSeed, type SeedFile } from "../src/lib/activities/seed";
import { upsertActivities } from "../src/lib/activities/seed-writer";
import { getAdminDb } from "../src/lib/firebase-admin/core";

const CONTENT_DIR = join(process.cwd(), "content", "activities");

function readSeedFiles(): SeedFile[] {
  return readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      path: relative(CONTENT_DIR, join(CONTENT_DIR, file)),
      contents: readFileSync(join(CONTENT_DIR, file), "utf8"),
    }));
}

async function main() {
  loadEnvConfig(process.cwd());
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");

  const files = readSeedFiles();
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
    const { created, updated } = await upsertActivities(
      getAdminDb(),
      activities.map((a) => a.doc),
    );
    console.log(`Firestore (${target}): ${created} created, ${updated} updated`);
  }

  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
