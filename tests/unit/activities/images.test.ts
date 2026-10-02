import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// CT05 / CA05 (spec: conteúdo inicial): format, weight and proportions of the activity images.
// Prompts are checked in the activity JSON (content.test.ts).
const IMAGES = join(process.cwd(), "public", "images", "activities");
const MAX_BYTES = 200 * 1024;
const MAX_TOTAL = 30 * 1024 * 1024;

const files = (dir: string) =>
  readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) =>
    statSync(join(dir, f)).isFile(),
  );

/** Width and height from a WebP header (lossy VP8, lossless VP8L or extended VP8X). */
export function webpSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP")
    return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8 ")
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X")
    return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  return null;
}

const images = files(IMAGES);

describe("activity images", () => {
  it("are all WebP, at most 200 KB each and 30 MB in total", () => {
    expect(images.filter((f) => !f.endsWith(".webp"))).toEqual([]);
    expect(images.filter((f) => statSync(join(IMAGES, f)).size > MAX_BYTES)).toEqual([]);
    const total = images.reduce((sum, f) => sum + statSync(join(IMAGES, f)).size, 0);
    expect(total).toBeLessThanOrEqual(MAX_TOTAL);
  });

  it("thumbnails are 16:10 and content images at most 1600 px wide", () => {
    const problems = images.flatMap((f) => {
      const size = webpSize(readFileSync(join(IMAGES, f)));
      if (!size) return [`${f}: not a readable WebP`];
      if (f.endsWith("thumb.webp") && Math.abs(size.width / size.height - 1.6) > 0.01)
        return [`${f}: ${size.width}×${size.height} is not 16:10`];
      if (size.width > 1600) return [`${f}: ${size.width} px wide`];
      return [];
    });
    expect(problems).toEqual([]);
  });
});
