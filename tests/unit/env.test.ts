import { describe, expect, it } from "vitest";
import { getFirebaseConfig, MissingEnvError } from "@/lib/env";

const completeEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-fun-english.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-fun-english",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:abc",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
};

describe("getFirebaseConfig", () => {
  it("maps the public env vars to Firebase options", () => {
    expect(getFirebaseConfig(completeEnv)).toMatchObject({
      apiKey: "test-api-key",
      projectId: "demo-fun-english",
      appId: "1:123:web:abc",
    });
  });

  it("names every missing required variable", () => {
    const env = {
      ...completeEnv,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: undefined,
      NEXT_PUBLIC_FIREBASE_APP_ID: "",
    };

    expect(() => getFirebaseConfig(env)).toThrowError(MissingEnvError);
    expect(() => getFirebaseConfig(env)).toThrowError(
      /NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID/,
    );
  });

  it("does not require the optional messaging sender id", () => {
    expect(() =>
      getFirebaseConfig({ ...completeEnv, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: undefined }),
    ).not.toThrow();
  });
});
