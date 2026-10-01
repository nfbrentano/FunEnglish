"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { loginHref } from "@/lib/auth/redirect";
import { useAuth } from "@/lib/auth/use-auth";
import { strings } from "@/lib/strings";

/**
 * Client-side guard (the site is static, there's no middleware): visitors go to the login page
 * and come back afterwards. The data itself is protected by the Firestore rules.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(loginHref(`${pathname}${window.location.search}`));
  }, [loading, user, router, pathname]);

  if (!user) {
    return (
      <div
        role="status"
        aria-label={strings.player.loading}
        className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-16"
      >
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return children;
}
