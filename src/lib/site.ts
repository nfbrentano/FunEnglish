export const SITE_NAME = "Fun English";

/** Base URL used for canonical links, the sitemap and share links (set in apphosting.yaml). */
export function resolveSiteUrl(explicitUrl?: string): string {
  return (explicitUrl || "http://localhost:3000").replace(/\/+$/, "");
}

export const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
