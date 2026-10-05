"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { signOut } from "./actions";
import { loadAuth, PROFILE_CHANGED_EVENT } from "./firebase-auth";
import type { AuthState, AuthUser } from "./use-auth";

const AuthContext = createContext<AuthState | null>(null);

/** Session for the whole site. Persists across reloads (Firebase keeps it in IndexedDB). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: AuthUser | null; loading: boolean }>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let onProfileChanged: (() => void) | undefined;
    let active = true;
    loadAuth()
      .then(({ auth, sdk }) => {
        if (!active) return;
        const publish = async (user: typeof auth.currentUser) => {
          if (!user) {
            setState({ loading: false, user: null });
            return;
          }
          const { getUserRole } = await import("./profile");
          const role = await getUserRole(user.uid);
          if (!active) return;
          setState({
            loading: false,
            user: {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role,
            },
          });
        };
        unsubscribe = sdk.onAuthStateChanged(auth, publish);
        onProfileChanged = () => void publish(auth.currentUser);
        window.addEventListener(PROFILE_CHANGED_EVENT, onProfileChanged);

      })
      .catch((error: unknown) => {
        console.warn("Could not start authentication", error);
        if (active) setState({ user: null, loading: false });
      });
    return () => {
      active = false;
      unsubscribe?.();
      if (onProfileChanged) window.removeEventListener(PROFILE_CHANGED_EVENT, onProfileChanged);
    };
  }, []);

  return <AuthContext.Provider value={{ ...state, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState | null {
  return useContext(AuthContext);
}
