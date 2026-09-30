import { beforeEach, describe, expect, it, vi } from "vitest";

describe("getFirebaseApp", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "test-api-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "demo-fun-english.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-fun-english");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "1:123:web:abc");
  });

  it("initializes the app only once, even across module reloads", async () => {
    const first = (await import("@/lib/firebase")).getFirebaseApp();
    vi.resetModules();
    const second = (await import("@/lib/firebase")).getFirebaseApp();

    expect(second).toBe(first);
    expect(first.options.projectId).toBe("demo-fun-english");
  });
});
