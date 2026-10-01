"use client";

import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore/lite";
import { getLiteDb } from "../firebase";

export const USERS_COLLECTION = "users";

/** Creates users/{uid} on the first sign-in (email or Google). Rules only allow role "teacher". */
export async function ensureUserProfile(user: User, displayName = user.displayName): Promise<void> {
  const ref = doc(getLiteDb(), USERS_COLLECTION, user.uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    displayName: displayName ?? null,
    email: user.email,
    photoURL: user.photoURL ?? null,
    role: "teacher",
    createdAt: serverTimestamp(),
  });
}
