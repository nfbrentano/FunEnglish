"use client";

import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore/lite";
import { getLiteDb } from "../firebase";

export const USERS_COLLECTION = "users";

export interface UserProfileData {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: "teacher" | "student";
  createdAt: unknown;
}

/** Creates users/{uid} on the first sign-in (email or Google). Rules allow role "teacher" or "student". */
export async function ensureUserProfile(
  user: User,
  displayName = user.displayName,
  role: "teacher" | "student" = "teacher",
): Promise<void> {
  const ref = doc(getLiteDb(), USERS_COLLECTION, user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    displayName: displayName ?? null,
    email: user.email,
    photoURL: user.photoURL ?? null,
    role,
    createdAt: serverTimestamp(),
  });
}

/** Fetches user role from users/{uid}. Defaults to "teacher" if not found. */
export async function getUserRole(uid: string): Promise<"teacher" | "student"> {
  try {
    const snap = await getDoc(doc(getLiteDb(), USERS_COLLECTION, uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.role === "student" || data?.role === "teacher") {
        return data.role;
      }
    }
  } catch (err) {
    console.warn("Could not fetch user role", err);
  }
  return "teacher";
}

