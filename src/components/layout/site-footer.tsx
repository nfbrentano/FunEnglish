"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME, SOCIAL_LINKS } from "@/lib/site";
import { strings } from "@/lib/strings";

const FOOTER_LINKS = [
  { href: "/about", label: strings.footer.about },
  { href: "/faq", label: strings.footer.faq },
  { href: "/contact", label: strings.footer.contact },
  { href: "/privacy", label: strings.footer.privacy },
  { href: "/terms", label: strings.footer.terms },
];

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/live") || pathname?.startsWith("/homework")) return null;
  return (
    <footer data-site-chrome className="mt-auto border-t border-border-subtle">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-xl">{SITE_NAME}</p>
          <p className="text-sm text-muted">{strings.footer.tagline}</p>
        </div>
        <nav aria-label={strings.nav.footer}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-sm text-fg-secondary hover:text-accent">
                  {label}
                </Link>
              </li>
            ))}
            {SOCIAL_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-sm text-fg-secondary hover:text-accent"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
