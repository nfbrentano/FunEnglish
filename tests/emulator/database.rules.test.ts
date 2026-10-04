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
    database: {
      rules: readFileSync("database.rules.json", "utf8"),
      host: "127.0.0.1",
      port: 9000,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Realtime Database security rules (CA02: default closed)", () => {
  it("denies unauthenticated read and write to any path", async () => {
    const rtdb = testEnv.unauthenticatedContext().database();
    await assertFails(rtdb.ref("rooms/room-1").set({ active: true }));
    await assertFails(rtdb.ref("rooms/room-1").once("value"));
  });

  it("denies authenticated users read and write to any path", async () => {
    const rtdb = testEnv.authenticatedContext("student-1").database();
    await assertFails(rtdb.ref("live/session-123").set({ ping: 1 }));
    await assertFails(rtdb.ref("live/session-123").once("value"));
  });
});
