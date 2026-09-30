import { defineConfig } from "vitest/config";

// Tests that need the Firebase emulators (security rules, seed). Run with `npm run test:emulator`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/emulator/**/*.test.ts"],
    fileParallelism: false,
  },
});
