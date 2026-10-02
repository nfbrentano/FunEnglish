import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Every image in public/images at build time. The player requests only those: a picture that is
 * planned but not uploaded yet (or category art not generated) shows its fallback without a 404
 * in every visitor's console. An upload from the admin commits and triggers a new build, so the
 * list follows (spec: mais imagens nas atividades, RF05, RF09).
 */
function builtImages(): string {
  const root = join(process.cwd(), "public", "images");
  if (!existsSync(root)) return "";
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".webp"))
    .map((f) => `/images/${f.split("\\").join("/")}`)
    .join(",");
}

// Static export for Firebase Hosting (Spark plan): `next build` writes the site to out/.
// No server at runtime, so no ISR, route handlers with Request, proxy or default image optimization.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // `*.dev.tsx` routes (e.g. the /dev/ui component gallery) exist only in `next dev`.
  pageExtensions: isDev ? ["dev.tsx", "tsx", "ts"] : ["tsx", "ts"],
  env: { NEXT_PUBLIC_IMAGES: builtImages() },
};

export default nextConfig;
