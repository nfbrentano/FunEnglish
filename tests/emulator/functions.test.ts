import { deleteApp, initializeApp } from "firebase/app";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Cloud Functions emulator integration (CA01, CA04)", () => {
  const app = initializeApp(
    {
      apiKey: "fake-api-key-for-emulator",
      projectId: "demo-fun-english",
    },
    "test-functions-app",
  );
  const functions = getFunctions(app, "southamerica-east1");

  beforeAll(() => {
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  it("calls health function and receives ok: true (CA01)", async () => {
    const healthCallable = httpsCallable<
      { echo?: string } | undefined,
      { ok: boolean; timestamp: number; echo?: string }
    >(functions, "health");

    const response = await healthCallable({ echo: "ping" });
    expect(response.data.ok).toBe(true);
    expect(response.data.echo).toBe("ping");
    expect(typeof response.data.timestamp).toBe("number");
  });

  it("rejects calling appCheckProtected without App Check token (CA04)", async () => {
    const protectedCallable = httpsCallable(functions, "appCheckProtected");
    await expect(protectedCallable()).rejects.toThrow();
  });
});
