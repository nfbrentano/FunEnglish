import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-fun-english",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("default rules", () => {
  it("deny writes from unauthenticated clients", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "activities/any"), { title: "Hack" }));
  });

  it("deny reads of unknown collections", async () => {
    const db = testEnv.authenticatedContext("teacher-1").firestore();
    await assertFails(getDoc(doc(db, "secrets/any")));
  });
});
