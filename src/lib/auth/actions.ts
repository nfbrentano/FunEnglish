"use client";

import { loadAuth, notifyProfileChanged } from "./firebase-auth";
import { ensureUserProfile } from "./profile";

export async function signUpWithEmail(name: string, email: string, password: string) {
  const { auth, sdk } = await loadAuth();
  const { user } = await sdk.createUserWithEmailAndPassword(auth, email.trim(), password);
  await sdk.updateProfile(user, { displayName: name.trim() });
  notifyProfileChanged();
  await ensureUserProfile(user, name.trim());
  // Not blocking: teachers can use the site before verifying.
  sdk.sendEmailVerification(user).catch(() => {});
  return user;
}

export async function signInWithEmail(email: string, password: string) {
  const { auth, sdk } = await loadAuth();
  return (await sdk.signInWithEmailAndPassword(auth, email.trim(), password)).user;
}

export async function signInWithGoogle() {
  const { auth, sdk } = await loadAuth();
  const { user } = await sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider());
  await ensureUserProfile(user);
  return user;
}

/** Always resolves the same way, so the form never reveals whether an email has an account. */
export async function sendPasswordReset(email: string) {
  const { auth, sdk } = await loadAuth();
  try {
    await sdk.sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "auth/user-not-found" && code !== "auth/invalid-email") throw error;
  }
}

export async function signOut() {
  const { auth, sdk } = await loadAuth();
  await sdk.signOut(auth);
}
