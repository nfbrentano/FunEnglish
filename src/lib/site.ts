export const SITE_NAME = "Fun English";

/** Public contact (Contact page, Privacy Policy). Also written in content/pages/*.md. */
export const CONTACT_EMAIL = "nfgbrentano@gmail.com";

/** Admin email authorized to manage, create and edit activities in /admin. */
export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || CONTACT_EMAIL;

export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");

/**
 * Prepends the basePath to local asset/page paths (e.g. for GitHub Pages subfolder /FunEnglish).
 */
export function withBasePath(path: string): string {
  if (!path || !basePath) return path;
  if (/^(?:https?:)?\/\//.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean.startsWith(basePath) ? clean : `${basePath}${clean}`;
}

/** Base URL used for canonical links, the sitemap and share links (set as a GitHub Actions variable for deploys). */
export function resolveSiteUrl(explicitUrl?: string): string {
  const fallback = basePath
    ? `https://nfbrentano.github.io${basePath}`
    : "http://localhost:3000";
  return (explicitUrl || fallback).replace(/\/+$/, "");
}

export const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** Social profiles shown in the footer (none yet — see layout spec, D02). */
export const SOCIAL_LINKS: { label: string; href: string }[] = [];
