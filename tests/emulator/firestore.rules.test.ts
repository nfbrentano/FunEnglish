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

describe("catalog", () => {
  it("anyone reads the catalog index; only admins write it", async () => {
    const visitor = testEnv.unauthenticatedContext().firestore();
    const teacher = testEnv.authenticatedContext("teacher-1").firestore();
    const admin = testEnv.authenticatedContext("admin-1", { admin: true }).firestore();

    await assertSucceeds(getDoc(doc(visitor, "catalog/index")));
    await assertFails(setDoc(doc(teacher, "catalog/index"), { items: [] }));
    await assertSucceeds(setDoc(doc(admin, "catalog/index"), { items: [] }));
  });
});

describe("users", () => {
  const profile = {
    displayName: "Ana",
    email: "ana@example.com",
    photoURL: null,
    role: "teacher",
    createdAt: new Date(),
  };

  it("a teacher creates and reads only their own profile", async () => {
    const ana = testEnv.authenticatedContext("ana").firestore();
    await assertSucceeds(setDoc(doc(ana, "users/ana"), profile));
    await assertSucceeds(getDoc(doc(ana, "users/ana")));
    await assertFails(getDoc(doc(testEnv.authenticatedContext("bob").firestore(), "users/ana")));
    await assertFails(setDoc(doc(ana, "users/bob"), profile));
  });

  it("nobody can become admin from the client", async () => {
    const ana = testEnv.authenticatedContext("ana").firestore();
    await assertFails(setDoc(doc(ana, "users/ana"), { ...profile, role: "admin" }));
    await assertSucceeds(setDoc(doc(ana, "users/ana"), profile));
    await assertFails(setDoc(doc(ana, "users/ana"), { role: "admin" }, { merge: true }));
    await assertSucceeds(setDoc(doc(ana, "users/ana"), { displayName: "Ana S." }, { merge: true }));
  });

  it("visitors can't read profiles", async () => {
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "users/ana")));
  });
});

describe("favorites and lists", () => {
  it("are private to their owner", async () => {
    const ana = testEnv.authenticatedContext("ana").firestore();
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(
      setDoc(doc(ana, "users/ana/favorites/some-or-any"), { addedAt: new Date(), listIds: [] }),
    );
    await assertSucceeds(
      setDoc(doc(ana, "users/ana/lists/l1"), { name: "Teens B1", order: 0, createdAt: new Date() }),
    );
    await assertSucceeds(getDoc(doc(ana, "users/ana/favorites/some-or-any")));

    await assertFails(getDoc(doc(bob, "users/ana/favorites/some-or-any")));
    await assertFails(
      setDoc(doc(bob, "users/ana/favorites/x"), { addedAt: new Date(), listIds: [] }),
    );
    await assertFails(
      getDoc(doc(testEnv.unauthenticatedContext().firestore(), "users/ana/lists/l1")),
    );
  });

  it("reject unexpected fields and empty list names", async () => {
    const ana = testEnv.authenticatedContext("ana").firestore();
    await assertFails(
      setDoc(doc(ana, "users/ana/favorites/x"), { addedAt: new Date(), listIds: [], admin: true }),
    );
    await assertFails(
      setDoc(doc(ana, "users/ana/lists/l2"), { name: "", order: 0, createdAt: new Date() }),
    );
  });
});

describe("history", () => {
  it("is private and only stores the time played", async () => {
    const ana = testEnv.authenticatedContext("ana").firestore();
    await assertSucceeds(
      setDoc(doc(ana, "users/ana/history/some-or-any"), { lastPlayedAt: new Date() }),
    );
    await assertFails(
      setDoc(doc(ana, "users/ana/history/x"), { lastPlayedAt: new Date(), score: 10 }),
    );
    await assertFails(
      getDoc(doc(testEnv.authenticatedContext("bob").firestore(), "users/ana/history/some-or-any")),
    );
  });
});
