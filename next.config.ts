import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Site images (category art, results) that exist at build time, so the player only requests
 * those: a missing one would be a 404 in every visitor's console (spec: mais imagens, RF04, RF09).
 */
function siteImages(): string {
  return ["categories", "results"]
    .flatMap((folder) => {
      const dir = join(process.cwd(), "public", "images", folder);
      return existsSync(dir)
        ? readdirSync(dir)
            .filter((f) => f.endsWith(".webp"))
            .map((f) => `/images/${folder}/${f}`)
        : [];
    })
    .join(",");
}

// Static export for Firebase Hosting (Spark plan): `next build` writes the site to out/.
// No server at runtime, so no ISR, route handlers with Request, proxy or default image optimization.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // `*.dev.tsx` routes (e.g. the /dev/ui component gallery) exist only in `next dev`.
  pageExtensions: isDev ? ["dev.tsx", "tsx", "ts"] : ["tsx", "ts"],
  env: { NEXT_PUBLIC_SITE_IMAGES: siteImages() },
};

export default nextConfig;
