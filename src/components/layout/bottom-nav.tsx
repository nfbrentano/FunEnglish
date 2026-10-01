"use client";

import { Heart, LayoutGrid, Search, Settings, User, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { strings } from "@/lib/strings";
import { ThemeSelector } from "./theme-selector";

const itemClasses =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.7rem] transition-colors duration-200";

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
}) {
  return (
    <li className="flex flex-1">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`${itemClasses} ${active ? "text-accent" : "text-muted hover:text-fg"}`}
      >
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
        {label}
      </Link>
    </li>
  );
}

/** Fixed bottom navigation on phones (< 768 px), in the style of nfgbrentano.art.br. */
export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const accountHref = user ? "/dashboard" : "/login";

  return (
    <>
      <nav
        data-site-chrome
        aria-label={strings.nav.mobile}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-secondary/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="flex">
          <NavItem
            href="/activities"
            label={strings.nav.activities}
            Icon={LayoutGrid}
            active={pathname === "/activities" || pathname.startsWith("/activities/")}
          />
          <NavItem
            href="/activities#search"
            label={strings.nav.search}
            Icon={Search}
            active={false}
          />
          <NavItem
            href="/dashboard#favorites"
            label={strings.nav.favorites}
            Icon={Heart}
            active={false}
          />
          <NavItem
            href={accountHref}
            label={strings.nav.account}
            Icon={User}
            active={["/login", "/signup", "/dashboard"].includes(pathname)}
          />
          <li className="flex flex-1">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => dialogRef.current?.showModal()}
              className={`${itemClasses} text-muted hover:text-fg`}
            >
              <Settings aria-hidden="true" className="size-5" strokeWidth={1.75} />
              {strings.nav.settings}
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={dialogRef}
        aria-labelledby="settings-title"
        onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
        className="mx-auto mt-auto mb-0 w-full max-w-lg rounded-t-2xl border border-border-subtle bg-elevated p-0 text-fg backdrop:bg-black/50"
      >
        <div className="space-y-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <h2 id="settings-title" className="font-display text-2xl">
              {strings.settings.title}
            </h2>
            <button
              type="button"
              aria-label={strings.settings.close}
              onClick={() => dialogRef.current?.close()}
              className="flex size-11 items-center justify-center rounded-full text-fg-secondary hover:text-fg"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-fg-secondary">{strings.theme.label}</p>
            <ThemeSelector />
          </div>
        </div>
      </dialog>
    </>
  );
}
