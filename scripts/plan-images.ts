/**
 * "Plan images" for activity files (spec: mais imagens nas atividades, RF06, RF10): a picture
 * (src, draft alt, prompt) for every item without one, in content/activities.
 *
 *   npm run images:plan                    every activity
 *   npm run images:plan -- some-or-any     only these slugs
 *   --answers=odd-one-out-1,kitchen-items  also picture answers in these quizzes
 *
 * Then review the alt texts, run `npm run seed -- --production` and generate the pictures from
 * the admin's Missing images page.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "prettier";
import { planImages } from "../src/lib/admin/plan-images";
import { parseImageStyle } from "../src/lib/admin/missing-images";

const CONTENT_DIR = join(process.cwd(), "content", "activities");
const style = parseImageStyle(
  readFileSync(join(process.cwd(), "content", "prompts", "image-style.md"), "utf8"),
);

async function main() {
  const args = process.argv.slice(2);
  const answers = new Set(
    (args.find((a) => a.startsWith("--answers="))?.slice("--answers=".length) ?? "")
      .split(",")
      .filter(Boolean),
  );
  const only = new Set(args.filter((a) => !a.startsWith("--")));
  let total = 0;
  for (const file of readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf8" }).sort()) {
    if (!file.endsWith(".json")) continue;
    const path = join(CONTENT_DIR, file);
    const activity = JSON.parse(readFileSync(path, "utf8"));
    if (only.size > 0 && !only.has(activity.slug)) continue;
    const { content, planned } = planImages(activity, {
      style,
      answers: answers.has(activity.slug),
    });
    if (planned === 0) continue;
    writeFileSync(path, await format(JSON.stringify({ ...activity, content }), { parser: "json" }));
    console.log(`${activity.slug}: ${planned} pictures planned`);
    total += planned;
  }
  console.log(`${total} pictures planned in total`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
