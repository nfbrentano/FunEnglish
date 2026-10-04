import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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

describe("contactMessages", () => {
  const message = () => ({
    name: "Ana",
    email: "ana@example.com",
    subject: "Idea",
    message: "A quiz about phrasal verbs, please!",
    createdAt: serverTimestamp(),
  });

  it("anyone can send a valid message", async () => {
    const visitor = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(addDoc(collection(visitor, "contactMessages"), message()));
  });

  it("rejects invalid or oversized messages and extra fields (CA06)", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const send = (data: Record<string, unknown>) =>
      assertFails(addDoc(collection(db, "contactMessages"), data));
    await send({ ...message(), message: "x".repeat(2001) });
    await send({ ...message(), email: "abc" });
    await send({ ...message(), name: "" });
    await send({ ...message(), website: "spam" });
    await send({ ...message(), createdAt: new Date("2020-01-01") });
    const { subject: _subject, ...withoutSubject } = message();
    void _subject;
    await send(withoutSubject);
  });

  it("nobody reads, edits or deletes messages from the client (CA06)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "contactMessages/m1"), {
        ...message(),
        createdAt: new Date(),
      });
    });
    for (const ctx of [
      testEnv.unauthenticatedContext(),
      testEnv.authenticatedContext("ana"),
      testEnv.authenticatedContext("admin-1", { admin: true }),
    ]) {
      const db = ctx.firestore();
      await assertFails(getDoc(doc(db, "contactMessages/m1")));
      await assertFails(getDocs(collection(db, "contactMessages")));
      await assertFails(setDoc(doc(db, "contactMessages/m1"), { subject: "x" }, { merge: true }));
      await assertFails(deleteDoc(doc(db, "contactMessages/m1")));
    }
  });
});

describe("activity revisions (spec: gestão completa, CA16)", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "activities/published/revisions/r1"), {
        data: { title: "Old" },
        summary: "Created",
      });
    });
  });

  it("only admins read and write the history, even of a published activity", async () => {
    for (const ctx of [
      testEnv.unauthenticatedContext(),
      testEnv.authenticatedContext("teacher-1"),
    ]) {
      const db = ctx.firestore();
      await assertFails(getDoc(doc(db, "activities/published/revisions/r1")));
      await assertFails(getDocs(collection(db, "activities/published/revisions")));
      await assertFails(setDoc(doc(db, "activities/published/revisions/r2"), { summary: "x" }));
    }
    const admin = testEnv.authenticatedContext("admin-1", { admin: true }).firestore();
    await assertSucceeds(getDocs(collection(admin, "activities/published/revisions")));
    await assertSucceeds(setDoc(doc(admin, "activities/published/revisions/r2"), { summary: "x" }));
    await assertSucceeds(deleteDoc(doc(admin, "activities/published/revisions/r1")));
  });

  it("teachers can't mark an activity as edited in the panel", async () => {
    const db = testEnv.authenticatedContext("teacher-1").firestore();
    await assertFails(
      setDoc(doc(db, "activities/published"), { editedInPanelAt: new Date() }, { merge: true }),
    );
  });
});

describe("classes and students (spec 01: turmas e alunos, RNF01, RNF02, CA07)", () => {
  const teacherA = "teacher-A";
  const teacherB = "teacher-B";

  it("teacher can create and read their own classes (CA01)", async () => {
    const dbA = testEnv.authenticatedContext(teacherA).firestore();
    const classRef = doc(dbA, `users/${teacherA}/classes/c1`);

    await assertSucceeds(
      setDoc(classRef, {
        name: "Teens B1",
        studentIds: [],
        archived: false,
        createdAt: new Date(),
      }),
    );

    const snap = await assertSucceeds(getDoc(classRef));
    expect(snap.data()?.name).toBe("Teens B1");
  });

  it("another teacher or unauthenticated user cannot read or write teacher's classes", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${teacherA}/classes/c1`), {
        name: "Secret Class",
        studentIds: [],
        archived: false,
        createdAt: new Date(),
      });
    });

    const dbB = testEnv.authenticatedContext(teacherB).firestore();
    const dbAnon = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(dbB, `users/${teacherA}/classes/c1`)));
    await assertFails(getDoc(doc(dbAnon, `users/${teacherA}/classes/c1`)));
    await assertFails(
      setDoc(doc(dbB, `users/${teacherA}/classes/c2`), {
        name: "Hacked Class",
        studentIds: [],
        archived: false,
        createdAt: new Date(),
      }),
    );
  });

  it("rejects invalid class name length (> 60 chars)", async () => {
    const dbA = testEnv.authenticatedContext(teacherA).firestore();
    const classRef = doc(dbA, `users/${teacherA}/classes/c-long`);

    await assertFails(
      setDoc(classRef, {
        name: "A".repeat(61),
        studentIds: [],
        archived: false,
        createdAt: new Date(),
      }),
    );
  });

  it("teacher can create and read their own students (CA01, CA02)", async () => {
    const dbA = testEnv.authenticatedContext(teacherA).firestore();
    const studentRef = doc(dbA, "students/s1");

    await assertSucceeds(
      setDoc(studentRef, {
        teacherUid: teacherA,
        name: "Ana Silva",
        email: "ana@example.com",
        classIds: ["c1"],
        homeworkPin: "hash1234",
        createdAt: new Date(),
      }),
    );

    const snap = await assertSucceeds(getDoc(studentRef));
    expect(snap.data()?.name).toBe("Ana Silva");
  });

  it("teacher B CANNOT read or write teacher A's students (CA07, CT07)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "students/s-private"), {
        teacherUid: teacherA,
        name: "Private Student",
        classIds: ["c1"],
        homeworkPin: "hash9999",
        createdAt: new Date(),
      });
    });

    const dbB = testEnv.authenticatedContext(teacherB).firestore();
    const dbAnon = testEnv.unauthenticatedContext().firestore();

    // Teacher B reading student of Teacher A must fail (CA07)
    await assertFails(getDoc(doc(dbB, "students/s-private")));
    await assertFails(getDoc(doc(dbAnon, "students/s-private")));

    // Teacher B modifying or deleting student of Teacher A must fail
    await assertFails(
      setDoc(doc(dbB, "students/s-private"), { name: "Modified" }, { merge: true }),
    );
    await assertFails(deleteDoc(doc(dbB, "students/s-private")));
  });

  it("rejects creating student for another teacherUid", async () => {
    const dbB = testEnv.authenticatedContext(teacherB).firestore();
    await assertFails(
      setDoc(doc(dbB, "students/s-fake"), {
        teacherUid: teacherA,
        name: "Imposter",
        classIds: ["c1"],
        homeworkPin: "hash1234",
        createdAt: new Date(),
      }),
    );
  });

  it("student subcollections are accessible only by the owner teacher", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "students/s1"), {
        teacherUid: teacherA,
        name: "Student One",
        classIds: ["c1"],
        homeworkPin: "hash1234",
        createdAt: new Date(),
      });
    });

    const dbA = testEnv.authenticatedContext(teacherA).firestore();
    const dbB = testEnv.authenticatedContext(teacherB).firestore();

    const gradeRefA = doc(dbA, "students/s1/grades/g1");
    const gradeRefB = doc(dbB, "students/s1/grades/g1");

    await assertSucceeds(setDoc(gradeRefA, { score: 10, activityId: "act1" }));
    await assertSucceeds(getDoc(gradeRefA));

    // Teacher B fails
    await assertFails(getDoc(gradeRefB));
    await assertFails(setDoc(gradeRefB, { score: 0 }));
  });
});
