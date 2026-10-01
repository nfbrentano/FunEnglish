"use client";

import type { Auth } from "firebase/auth";
import { firebaseEmulatorHost, useFirebaseEmulators } from "../env";
import { getFirebaseApp } from "../firebase";

let authPromise: Promise<{ auth: Auth; sdk: typeof import("firebase/auth") }> | undefined;

/**
 * Firebase Auth, loaded on demand: it isn't part of the first page load, so every page stays
 * light; the header shows a placeholder until it's ready.
 */
export function loadAuth() {
  authPromise ??= import("firebase/auth").then((sdk) => {
    const auth = sdk.getAuth(getFirebaseApp());
    if (useFirebaseEmulators) {
      sdk.connectAuthEmulator(auth, `http://${firebaseEmulatorHost}:9099`, {
        disableWarnings: true,
      });
    }
    return { auth, sdk };
  });
  return authPromise;
}

export const PROFILE_CHANGED_EVENT = "fun-english-profile-changed";

/** Firebase doesn't report profile edits (e.g. the name set right after sign-up); this does. */
export function notifyProfileChanged() {
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}
