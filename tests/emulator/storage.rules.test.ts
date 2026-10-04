import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-fun-english",
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Storage security rules (CA02: default closed)", () => {
  it("denies unauthenticated read and write to any path", async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    const fileRef = storage.ref("images/test.webp");
    await assertFails(Promise.resolve(fileRef.putString("image-data")));
    await assertFails(fileRef.getDownloadURL());
  });

  it("denies authenticated users read and write to any path", async () => {
    const storage = testEnv.authenticatedContext("teacher-1").storage();
    const fileRef = storage.ref("whiteboard/session-1.png");
    await assertFails(Promise.resolve(fileRef.putString("whiteboard-data")));
    await assertFails(fileRef.getDownloadURL());
  });
});
