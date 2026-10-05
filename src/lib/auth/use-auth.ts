"use client";

import { useAuthContext } from "./auth-provider";

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role?: "teacher" | "student";
};


export type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const outsideProvider: AuthState = { user: null, loading: false, signOut: async () => {} };

/** Current teacher (or visitor). Components outside the AuthProvider (e.g. tests) see a visitor. */
export function useAuth(): AuthState {
  return useAuthContext() ?? outsideProvider;
}
