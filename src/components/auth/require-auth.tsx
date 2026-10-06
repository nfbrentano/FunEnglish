"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { loginHref } from "@/lib/auth/redirect";
import { useAuth } from "@/lib/auth/use-auth";
import { strings } from "@/lib/strings";

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: Array<"teacher" | "student">;
}

/**
 * Client-side guard (the site is static, there's no middleware): visitors go to the login page
 * and come back afterwards. The data itself is protected by the Firestore rules.
 * Also enforces role-based redirection (RF07, CA06): students attempting to access
 * /dashboard or /admin are redirected to /student.
 */
export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(loginHref(`${pathname}${window.location.search}`));
      return;
    }

    // Students accessing teacher dashboard or admin panel get redirected to /student (RF07, CA06)
    if (
      user.role === "student" &&
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        (allowedRoles && !allowedRoles.includes("student")))
    ) {
      router.replace("/student");
      return;
    }

    if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
      router.replace(user.role === "student" ? "/student" : "/dashboard");
    }
  }, [loading, user, router, pathname, allowedRoles]);

  if (
    !user ||
    (user.role === "student" &&
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        (allowedRoles && !allowedRoles.includes("student"))))
  ) {
    return (
      <div
        role="status"
        aria-label={strings.player.loading}
        className="mx-auto w-full max-w-300 space-y-4 px-4 py-16"
      >
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return children;
}

