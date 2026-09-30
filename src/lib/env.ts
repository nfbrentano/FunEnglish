import type { FirebaseOptions } from "firebase/app";

export class MissingEnvError extends Error {
  constructor(public readonly missing: string[]) {
    super(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Copy .env.example to .env.local and fill in the values (see README.md).",
    );
    this.name = "MissingEnvError";
  }
}

// Each NEXT_PUBLIC_* variable must be referenced literally so Next.js can inline it in the client bundle.
const firebasePublicEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

type FirebasePublicEnv = typeof firebasePublicEnv;

const REQUIRED_FIREBASE_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const satisfies readonly (keyof FirebasePublicEnv)[];

export function getFirebaseConfig(env: FirebasePublicEnv = firebasePublicEnv): FirebaseOptions {
  const missing = REQUIRED_FIREBASE_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) throw new MissingEnvError(missing);

  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
}

export const useFirebaseEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
export const firebaseEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || "127.0.0.1";
