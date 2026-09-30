"use client";

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const visitor: AuthState = { user: null, loading: false, signOut: async () => {} };

/**
 * Placeholder: everyone is a visitor until the auth spec (SDD/2026-09-30_autenticacao.md)
 * wires this to Firebase Auth. Components already consume this shape.
 */
export function useAuth(): AuthState {
  return visitor;
}
