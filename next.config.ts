import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Static export for Firebase Hosting (Spark plan): `next build` writes the site to out/.
// No server at runtime, so no ISR, route handlers with Request, proxy or default image optimization.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // `*.dev.tsx` routes (e.g. the /dev/ui component gallery) exist only in `next dev`.
  pageExtensions: isDev ? ["dev.tsx", "tsx", "ts"] : ["tsx", "ts"],
};

export default nextConfig;
