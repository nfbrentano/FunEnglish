import { expect } from "@playwright/test";
import { getAdminAuth, getAdminDb } from "../src/lib/firebase-admin/core";
import { E2E_ENV } from "./global-setup";

/** Admin access to the Firestore emulator, for checks the browser can't do. */
export function adminDb() {
  Object.assign(process.env, {
    FIRESTORE_EMULATOR_HOST: E2E_ENV.FIRESTORE_EMULATOR_HOST,
    FIREBASE_PROJECT_ID: E2E_ENV.FIREBASE_PROJECT_ID,
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  });
  return getAdminDb();
}

/** Same as `npm run set-admin -- <email>`, against the Auth emulator. */
export async function grantAdmin(email: string) {
  adminDb();
  const auth = getAdminAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
}

/** The profile is written just after sign-up shows the avatar, so wait for it. */
export async function userIdFor(email: string): Promise<string> {
  let id: string | undefined;
  await expect
    .poll(async () => {
      id = (await adminDb().collection("users").where("email", "==", email).get()).docs[0]?.id;
      return id;
    })
    .toBeTruthy();
  return id!;
}
