import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-fun-english",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "activities/published"), { status: "published", title: "Some or Any" });
    await setDoc(doc(db, "activities/draft"), { status: "draft", title: "WIP" });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("activities", () => {
  it("anyone reads a published activity and lists published ones", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "activities/published")));
    await assertSucceeds(
      getDocs(query(collection(db, "activities"), where("status", "==", "published"))),
    );
  });

  it("teachers cannot read drafts or list without the published filter", async () => {
    const db = testEnv.authenticatedContext("teacher-1").firestore();
    await assertFails(getDoc(doc(db, "activities/draft")));
    await assertFails(getDocs(collection(db, "activities")));
  });

  it("teachers and visitors cannot write", async () => {
    for (const ctx of [
      testEnv.unauthenticatedContext(),
      testEnv.authenticatedContext("teacher-1"),
    ]) {
      const db = ctx.firestore();
      await assertFails(setDoc(doc(db, "activities/new"), { status: "published", title: "Hack" }));
      await assertFails(
        setDoc(doc(db, "activities/published"), { status: "draft" }, { merge: true }),
      );
    }
  });

  it("admins read drafts and write", async () => {
    const db = testEnv.authenticatedContext("admin-1", { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, "activities/draft")));
    await assertSucceeds(setDoc(doc(db, "activities/new"), { status: "draft", title: "New" }));
  });
});

describe("other collections", () => {
  it("are denied by default", async () => {
    const db = testEnv.authenticatedContext("teacher-1").firestore();
    await assertFails(getDoc(doc(db, "secrets/any")));
    await assertFails(setDoc(doc(db, "secrets/any"), { x: 1 }));
  });
});
