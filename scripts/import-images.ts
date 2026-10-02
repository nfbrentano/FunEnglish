/**
 * Imports AI-generated images into public/images/activities/.
 *
 * Save every generated image in ONE folder, named <slug>--<name> after its src
 * (/images/activities/<slug>/<name>.webp; the admin "Missing images" page shows each name):
 *   <slug>--<name>.png   (or .jpg / .webp), e.g. emoji-idioms--thumb.png
 * Then run:
 *   npm run images:import -- ~/Downloads/fun-english-images
 *
 * Each image is resized (thumbnails cropped to 1280×800, others up to 1600 px wide), converted to
 * WebP ≤ 200 KB and saved at public/images/activities/<slug>/<name>.webp.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";

const CONTENT_DIR = join(process.cwd(), "content", "activities");
const OUTPUT_DIR = join(process.cwd(), "public", "images", "activities");
const MAX_BYTES = 200 * 1024;
const FILE_NAME =
  /^([a-z0-9]+(?:-[a-z0-9]+)*)--([a-z0-9]+(?:-[a-z0-9]+)*)\.(png|jpe?g|webp|avif)$/i;

/** Every image the activities in content/activities use: "<slug>/<name>" of /images/activities/<slug>/<name>.webp. */
function expectedImages(): Set<string> {
  const expected = new Set<string>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") {
      const src = (node as { src?: unknown }).src;
      const match = typeof src === "string" ? /^\/images\/activities\/(.+)\.webp$/.exec(src) : null;
      if (match) expected.add(match[1]);
      Object.values(node).forEach(walk);
    }
  };
  for (const file of readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf8" })) {
    if (file.endsWith(".json")) walk(JSON.parse(readFileSync(join(CONTENT_DIR, file), "utf8")));
  }
  return expected;
}

async function toWebp(input: string, isThumbnail: boolean): Promise<Buffer> {
  const image = isThumbnail
    ? sharp(input).resize(1280, 800, { fit: "cover", position: "attention" })
    : sharp(input).resize({ width: 1600, withoutEnlargement: true });
  for (let quality = 82; quality >= 40; quality -= 8) {
    const buffer = await image.clone().webp({ quality }).toBuffer();
    if (buffer.length <= MAX_BYTES || quality <= 42) return buffer;
  }
  throw new Error("unreachable");
}

async function main() {
  const folder = resolve(
    (process.argv[2] ?? "~/Downloads/fun-english-images").replace(/^~/, homedir()),
  );
  if (!existsSync(folder)) throw new Error(`Folder not found: ${folder}`);

  const expected = expectedImages();
  const imported = new Set<string>();
  const skipped: string[] = [];

  for (const file of readdirSync(folder).sort()) {
    const match = FILE_NAME.exec(file);
    if (!match) {
      if (!file.startsWith(".")) skipped.push(`${file} (name must be <slug>--<name>.png)`);
      continue;
    }
    const [, slug, name] = match;
    const key = `${slug}/${name}`;
    if (!expected.has(key)) {
      skipped.push(`${file} (no prompt for "${key}": check the name)`);
      continue;
    }
    const buffer = await toWebp(join(folder, file), name === "thumb");
    mkdirSync(join(OUTPUT_DIR, slug), { recursive: true });
    writeFileSync(join(OUTPUT_DIR, slug, `${name}.webp`), buffer);
    imported.add(key);
    console.log(
      `✓ ${file} → public/images/activities/${key}.webp (${Math.round(buffer.length / 1024)} KB)`,
    );
  }

  for (const line of skipped) console.warn(`✗ skipped ${line}`);
  const missing = [...expected].filter(
    (key) => !imported.has(key) && !existsSync(join(OUTPUT_DIR, `${key}.webp`)),
  );
  console.log(
    `\n${imported.size} imported, ${skipped.length} skipped, ${missing.length} still missing`,
  );
  if (missing.length > 0)
    console.log(`Missing: ${missing.map((k) => k.replace("/", "--")).join(", ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
