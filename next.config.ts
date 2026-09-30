import type { NextConfig } from "next";

// Static export for Firebase Hosting (Spark plan): `next build` writes the site to out/.
// No server at runtime, so no ISR, route handlers with Request, proxy or default image optimization.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
