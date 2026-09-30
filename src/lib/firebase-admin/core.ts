// Admin SDK bootstrap shared by server code and Node scripts (seed, set-admin).
// App code must import from "@/lib/firebase-admin", which adds the server-only guard.
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { MissingEnvError } from "../env";

function isUsingEmulators(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

function isRunningOnGoogleCloud(): boolean {
  return Boolean(process.env.K_SERVICE || process.env.FIREBASE_CONFIG);
}

export function getAdminApp(): App {
  if (getApps().length > 0) return getApp();

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // The emulators accept any project id and need no credentials.
  if (isUsingEmulators()) return initializeApp({ projectId: projectId || "demo-fun-english" });

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccount)), projectId });
  }

  // On App Hosting (Cloud Run) the backend's service account is picked up automatically (ADC).
  if (isRunningOnGoogleCloud()) return initializeApp();

  throw new MissingEnvError(["FIREBASE_SERVICE_ACCOUNT_KEY"]);
}

export const getAdminDb = () => getFirestore(getAdminApp());
export const getAdminAuth = () => getAuth(getAdminApp());
