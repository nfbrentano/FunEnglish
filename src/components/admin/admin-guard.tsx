"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { PlayerMessage } from "@/components/player/player-message";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/lib/admin/use-is-admin";
import { strings } from "@/lib/strings";

/** Logged in + `admin` claim. Data access is enforced again by the Firestore rules. */
export function AdminGuard({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminOnly>{children}</AdminOnly>
    </RequireAuth>
  );
}

function AdminOnly({ children }: { children: ReactNode }) {
  const admin = useIsAdmin({ refresh: true });
  if (admin === null) {
    return (
      <div
        role="status"
        aria-label={strings.admin.loading}
        className="mx-auto w-full max-w-300 px-4 py-16"
      >
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!admin) {
    return (
      <div className="mx-auto w-full max-w-300 px-4">
        <PlayerMessage title={strings.admin.notAuthorized}>
          {strings.admin.notAuthorizedHint}
        </PlayerMessage>
      </div>
    );
  }
  return children;
}
