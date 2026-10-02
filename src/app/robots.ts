import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW, absoluteUrl } from "@/lib/seo";

// Static export: written to out/robots.txt at build time (spec: SEO e metadados, RF04).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ROBOTS_DISALLOW },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
