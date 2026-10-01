/**
 * Checks that every YouTube clip in content/activities exists and can be embedded
 * (YouTube's oEmbed endpoint answers 401/404 otherwise). Run before publishing new content.
 *
 *   npm run content:check-videos
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONTENT_DIR = join(process.cwd(), "content", "activities");

function findVideoIds(value: unknown, found: Set<string>) {
  if (Array.isArray(value)) value.forEach((v) => findVideoIds(v, found));
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.kind === "youtube" && typeof record.videoId === "string") found.add(record.videoId);
    Object.values(record).forEach((v) => findVideoIds(v, found));
  }
}

async function main() {
  const uses = new Map<string, string[]>();
  for (const file of readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf8" })) {
    if (!file.endsWith(".json")) continue;
    const ids = new Set<string>();
    findVideoIds(JSON.parse(readFileSync(join(CONTENT_DIR, file), "utf8")), ids);
    for (const id of ids) uses.set(id, [...(uses.get(id) ?? []), file]);
  }

  let failures = 0;
  for (const [id, files] of uses) {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
    const response = await fetch(url);
    if (response.ok) {
      const { title, author_name: author } = (await response.json()) as {
        title: string;
        author_name: string;
      };
      console.log(`✓ ${id}  ${title} — ${author}`);
    } else {
      failures++;
      console.error(
        `✗ ${id}  HTTP ${response.status} (not found or embedding disabled) in ${files.join(", ")}`,
      );
    }
  }
  console.log(`${uses.size} videos checked, ${failures} unavailable`);
  if (failures > 0) process.exitCode = 1;
}

void main();
