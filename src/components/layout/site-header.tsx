"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/use-auth";
import { SITE_NAME } from "@/lib/site";
import { strings } from "@/lib/strings";
import { AccountArea } from "./account-area";
import { isActivePath, MAIN_NAV } from "./nav-links";
import { ThemeSelector } from "./theme-selector";

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  if (pathname?.startsWith("/live") || pathname?.startsWith("/homework")) return null;

  return (
    <header
      data-site-chrome
      className="sticky top-0 z-40 border-b border-border-subtle bg-primary/85 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-300 items-center gap-8 px-4">
        <Link href="/" className="font-display text-2xl font-medium tracking-wide text-fg">
          {SITE_NAME}
        </Link>
        <nav aria-label={strings.nav.main} className="hidden md:block">
          <ul className="flex items-center gap-6">
            {MAIN_NAV.map(({ href, label }) => {
              const active = isActivePath(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`text-sm transition-colors duration-200 ${
                      active ? "text-accent" : "text-fg-secondary hover:text-fg"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto hidden items-center gap-4 md:flex">
          <ThemeSelector compact />
          <AccountArea user={user} loading={loading} onSignOut={signOut} />
        </div>
      </div>
    </header>
  );
}
