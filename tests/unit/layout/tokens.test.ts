import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Layout spec RF08: components get colors from theme tokens only (src/styles/theme.css).
const HEX_COLOR = /#[0-9a-f]{3,8}\b/i;
const RAW_COLOR = /\b(?:rgb|hsl)a?\(/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.(tsx?|css)$/.test(file))
    .map((file) => join(dir, file));
}

describe("design tokens", () => {
  const files = [...sourceFiles("src/components"), ...sourceFiles("src/app")];

  it.each(files)("%s has no hardcoded colors", (file) => {
    const offending = readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => HEX_COLOR.test(line) || RAW_COLOR.test(line));
    expect(offending).toEqual([]);
  });
});
