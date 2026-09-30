import { defineConfig } from "vitest/config";

// Firestore security rules tests. Run through `npm run test:rules`, which starts the emulator.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
  },
});
