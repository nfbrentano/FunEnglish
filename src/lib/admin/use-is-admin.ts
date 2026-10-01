"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../auth/use-auth";
import { loadAuth } from "../auth/firebase-auth";

/**
 * Whether the signed-in teacher has the `admin` claim. `refresh` fetches a fresh token, so a
 * claim granted with `npm run set-admin` works without logging out and in again.
 */
export function useIsAdmin({ refresh = false }: { refresh?: boolean } = {}): boolean | null {
  const { user, loading } = useAuth();
  const [admin, setAdmin] = useState<{ uid: string; value: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadAuth()
      .then(({ auth }) => auth.currentUser?.getIdTokenResult(refresh))
      .then((token) => active && setAdmin({ uid: user.uid, value: token?.claims.admin === true }))
      .catch(() => active && setAdmin({ uid: user.uid, value: false }));
    return () => {
      active = false;
    };
  }, [user, refresh]);

  if (loading) return null;
  if (!user) return false;
  return admin?.uid === user.uid ? admin.value : null;
}
