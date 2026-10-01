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

/** Playwright only waits for Firestore (webServer url); Hosting and Auth may still be starting. */
async function waitFor(url: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Emulator didn't start at ${url}`);
}

// Runs after the emulators (webServer) are up: seed them, then build the static site against them.
export default async function globalSetup() {
  const env = { ...process.env, ...E2E_ENV };
  execSync("npx tsx scripts/seed.ts --dir=e2e/fixtures/activities", { env, stdio: "inherit" });
  // Always rebuild: the emulators start empty, so activity ids change on every run and an older
  // out/ wouldn't match. npm run build also clears the Next.js fetch cache.
  execSync("npm run build", { env, stdio: "inherit" });
  await Promise.all([waitFor("http://127.0.0.1:5002"), waitFor("http://127.0.0.1:9099")]);
}
