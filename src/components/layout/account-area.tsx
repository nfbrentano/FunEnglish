"use client";

import { LayoutDashboard, LogOut, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth/use-auth";
import { strings } from "@/lib/strings";

function initials(user: AuthUser): string {
  const source = user.displayName || user.email || "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

type AccountAreaProps = {
  user: AuthUser | null;
  loading?: boolean;
  onSignOut: () => void | Promise<void>;
};

/** "Log in" / "Sign up" for visitors; avatar with a Dashboard / Log out menu for teachers. */
export function AccountArea({ user, loading = false, onSignOut }: AccountAreaProps) {
  if (loading) return <div aria-hidden="true" className="size-9 rounded-full bg-border-subtle" />;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <ButtonLink href="/login" variant="ghost">
          {strings.account.logIn}
        </ButtonLink>
        <ButtonLink href="/signup" variant="primary">
          {strings.account.signUp}
        </ButtonLink>
      </div>
    );
  }

  return <AccountMenu user={user} onSignOut={onSignOut} />;
}

function AccountMenu({
  user,
  onSignOut,
}: {
  user: AuthUser;
  onSignOut: AccountAreaProps["onSignOut"];
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClasses =
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-fg-secondary hover:bg-secondary hover:text-fg";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={strings.account.menu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-elevated text-xs font-semibold text-accent"
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, remote avatar
          <img src={user.photoURL} alt="" className="size-full object-cover" />
        ) : (
          initials(user)
        )}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-border-subtle bg-elevated p-1 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-xs text-muted">{user.displayName || user.email}</p>
          <Link
            role="menuitem"
            href={user.role === "student" ? "/student" : "/dashboard"}
            className={itemClasses}
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard aria-hidden="true" className="size-4" />{" "}
            {user.role === "student" ? "Student portal" : strings.account.dashboard}
          </Link>
          {user.role !== "student" && (
            <Link
              role="menuitem"
              href="/lousa"
              className={itemClasses}
              onClick={() => setOpen(false)}
            >
              <Pencil aria-hidden="true" className="size-4" /> Lousa
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            className={itemClasses}
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
          >
            <LogOut aria-hidden="true" className="size-4" /> {strings.account.logOut}
          </button>
        </div>
      )}
    </div>
  );
}
