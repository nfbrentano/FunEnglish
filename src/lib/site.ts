export const SITE_NAME = "Fun English";

/** Public contact (Contact page, Privacy Policy). Also written in content/pages/*.md. */
export const CONTACT_EMAIL = "nfgbrentano@gmail.com";

/** Base URL used for canonical links, the sitemap and share links (set as a GitHub Actions variable for deploys). */
export function resolveSiteUrl(explicitUrl?: string): string {
  return (explicitUrl || "http://localhost:3000").replace(/\/+$/, "");
}

export const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** Social profiles shown in the footer (none yet — see layout spec, D02). */
export const SOCIAL_LINKS: { label: string; href: string }[] = [];
