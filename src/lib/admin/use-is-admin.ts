"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../auth/use-auth";
import { loadAuth } from "../auth/firebase-auth";
import { ADMIN_EMAIL } from "../site";

/**
 * Whether the signed-in teacher has the `admin` claim and matches the registered admin email.
 * `refresh` fetches a fresh token, so a claim granted with `npm run set-admin` works without
 * logging out and in again.
 */
export function useIsAdmin({ refresh = false }: { refresh?: boolean } = {}): boolean | null {
  const { user, loading } = useAuth();
  const [admin, setAdmin] = useState<{ uid: string; value: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadAuth()
      .then(({ auth }) => auth.currentUser?.getIdTokenResult(refresh))
      .then((token) => {
        if (!active) return;
        const hasClaim = token?.claims.admin === true;
        // Verify claim and registered admin email (or allow if email is not present on synthetic emulator test accounts)
        const emailMatches = user.email
          ? user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
          : true;
        setAdmin({ uid: user.uid, value: hasClaim && emailMatches });
      })
      .catch(() => active && setAdmin({ uid: user.uid, value: false }));
    return () => {
      active = false;
    };
  }, [user, refresh]);

  if (loading) return null;
  if (!user) return false;
  return admin?.uid === user.uid ? admin.value : null;
}
