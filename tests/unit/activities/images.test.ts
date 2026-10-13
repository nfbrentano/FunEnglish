import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kindForSrc, LIMITS } from "@/lib/admin/image-processing";

// CT05 / CA05 (spec: conteúdo inicial): format, weight and proportions of the activity images.
// Prompts are checked in the activity JSON (content.test.ts).
const IMAGES = join(process.cwd(), "public", "images");
const MAX_TOTAL = 30 * 1024 * 1024;

const files = (dir: string) =>
  readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => {
    if (f.split(/[/\\]/).some((part) => part.startsWith("."))) return false;
    return statSync(join(dir, f)).isFile();
  });

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
  it("are all WebP and stay within 30 MB in total", () => {
    expect(images.filter((f) => !f.endsWith(".webp"))).toEqual([]);
    const total = images.reduce((sum, f) => sum + statSync(join(IMAGES, f)).size, 0);
    expect(total).toBeLessThanOrEqual(MAX_TOTAL);
  });

  // Same limits as the admin upload and images:import (spec: mais imagens, RNF01).
  it("thumbnails and category art are 16:10 ≤ 200 KB; pictures ≤ 960 px ≤ 100 KB; answers ≤ 480 px ≤ 40 KB", () => {
    const problems = images.flatMap((f) => {
      const size = webpSize(readFileSync(join(IMAGES, f)));
      if (!size) return [`${f}: not a readable WebP`];
      const bytes = statSync(join(IMAGES, f)).size;
      const kind = kindForSrc(`/images/${f.split("\\").join("/")}`);
      const limit = LIMITS[kind];
      if (kind === "thumb" && Math.abs(size.width / size.height - 1.6) > 0.01)
        return [`${f}: ${size.width}×${size.height} is not 16:10`];
      if (size.width > limit.width) return [`${f}: ${size.width} px wide (max ${limit.width})`];
      if (bytes > limit.bytes)
        return [`${f}: ${Math.ceil(bytes / 1024)} KB (max ${limit.bytes / 1024})`];
      return [];
    });
    expect(problems).toEqual([]);
  });
});
