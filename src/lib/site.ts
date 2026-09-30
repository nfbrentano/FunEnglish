export const SITE_NAME = "Fun English";

/**
 * Base URL used for canonical links, the sitemap and share links.
 * NEXT_PUBLIC_SITE_URL wins; on Vercel we fall back to the production domain it exposes.
 */
export function resolveSiteUrl(explicitUrl?: string, vercelProductionHost?: string): string {
  const url =
    explicitUrl ||
    (vercelProductionHost ? `https://${vercelProductionHost}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

export const siteUrl = resolveSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
);
