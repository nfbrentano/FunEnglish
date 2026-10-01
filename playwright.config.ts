import { defineConfig, devices } from "@playwright/test";

// Firebase emulators: Hosting serves out/ (routing matches production), Firestore holds seeded data.
const PORT = 5002;
const ADMIN_SPECS = /admin-panel\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: ADMIN_SPECS },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: ADMIN_SPECS },
    // Admin tests publish, edit and delete activities, so they run after the catalog tests
    // (which assume the seeded content) and one at a time.
    {
      name: "admin",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ADMIN_SPECS,
      dependencies: ["desktop", "mobile"],
      fullyParallel: false,
    },
  ],
  webServer: {
    command: "firebase emulators:start --only auth,firestore,hosting --project demo-fun-english",
    // The Firestore emulator answers "Ok" on its root once it's ready.
    url: "http://127.0.0.1:8080",
    // A stray emulator on 8080 would be "reused" without Hosting, so always start a fresh pair.
    reuseExistingServer: false,
    // SIGINT lets the Firebase CLI stop its Java emulators instead of leaving them orphaned.
    gracefulShutdown: { signal: "SIGINT", timeout: 15_000 },
    timeout: 120_000,
  },
});
