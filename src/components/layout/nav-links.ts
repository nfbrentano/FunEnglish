import { strings } from "@/lib/strings";

export const MAIN_NAV = [
  { href: "/", label: strings.nav.home },
  { href: "/activities", label: strings.nav.activities },
] as const;

/** "/" only matches itself; other links also match their sub-pages. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
