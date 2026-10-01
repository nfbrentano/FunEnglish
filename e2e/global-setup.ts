import { execSync } from "node:child_process";

/** Fake Firebase project served by the emulators; nothing touches the real project. */
export const E2E_ENV = {
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_PROJECT_ID: "demo-fun-english",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
  NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: "127.0.0.1",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-fun-english",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-fun-english.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:0:web:demo",
  NEXT_PUBLIC_SITE_URL: "http://localhost:5002",
};

// Runs after the emulators (webServer) are up: seed them, then build the static site against them.
export default function globalSetup() {
  const env = { ...process.env, ...E2E_ENV };
  execSync("npx tsx scripts/seed.ts --dir=e2e/fixtures/activities", { env, stdio: "inherit" });
  // npm run build clears the Next.js fetch cache, so pages never reuse data from an older seed.
  if (!process.env.E2E_SKIP_BUILD) execSync("npm run build", { env, stdio: "inherit" });
}
