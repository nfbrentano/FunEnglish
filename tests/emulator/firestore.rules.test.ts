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
  updateDoc,
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

  describe("student notes subcollection (spec 02: RNF01, RNF02, CA01, CA06, CA07)", () => {
    const studentWithPortal = "s-portal";
    const studentPortalUid = "student-portal-user-1";

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, `students/${studentWithPortal}`), {
          teacherUid: teacherA,
          name: "Ana Silva",
          classIds: ["c1"],
          portalUid: studentPortalUid,
          homeworkPin: "hash1234",
          createdAt: new Date(),
        });

        await setDoc(doc(db, `students/${studentWithPortal}/notes/note-private`), {
          category: "pronunciation",
          text: "thought -> /θɔːt/",
          visibility: "private",
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await setDoc(doc(db, `students/${studentWithPortal}/notes/note-shared`), {
          category: "strength",
          text: "Great teamwork",
          visibility: "shared",
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it("teacher can create, read, update and delete notes for their student (CA01, CA06)", async () => {
      const dbA = testEnv.authenticatedContext(teacherA).firestore();
      const newNoteRef = doc(dbA, `students/${studentWithPortal}/notes/n-new`);

      await assertSucceeds(
        setDoc(newNoteRef, {
          category: "grammar",
          text: "he go -> he goes",
          correction: "he go -> he goes",
          visibility: "private",
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const snap = await assertSucceeds(getDoc(newNoteRef));
      expect(snap.data()?.text).toBe("he go -> he goes");

      // Update visibility to shared (CA06)
      await assertSucceeds(setDoc(newNoteRef, { visibility: "shared" }, { merge: true }));

      // Delete note
      await assertSucceeds(deleteDoc(newNoteRef));
    });

    it("teacher B CANNOT read or write notes for teacher A's student", async () => {
      const dbB = testEnv.authenticatedContext(teacherB).firestore();
      const noteRef = doc(dbB, `students/${studentWithPortal}/notes/note-shared`);

      await assertFails(getDoc(noteRef));
      await assertFails(setDoc(noteRef, { text: "Hacked" }, { merge: true }));
      await assertFails(deleteDoc(noteRef));
    });

    it("student portalUid can read SHARED notes (CA06)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentPortalUid).firestore();
      const sharedNoteRef = doc(dbStudent, `students/${studentWithPortal}/notes/note-shared`);

      const snap = await assertSucceeds(getDoc(sharedNoteRef));
      expect(snap.data()?.text).toBe("Great teamwork");
    });

    it("student portalUid CANNOT read PRIVATE notes (CA07, CT07)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentPortalUid).firestore();
      const privateNoteRef = doc(dbStudent, `students/${studentWithPortal}/notes/note-private`);

      await assertFails(getDoc(privateNoteRef));
    });

    it("student portalUid CANNOT write or delete notes", async () => {
      const dbStudent = testEnv.authenticatedContext(studentPortalUid).firestore();
      const newNoteRef = doc(dbStudent, `students/${studentWithPortal}/notes/student-hack`);
      const sharedNoteRef = doc(dbStudent, `students/${studentWithPortal}/notes/note-shared`);

      await assertFails(
        setDoc(newNoteRef, {
          category: "strength",
          text: "I am great",
          visibility: "shared",
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
      await assertFails(deleteDoc(sharedNoteRef));
    });

    it("rejects notes with invalid category or text exceeding 500 characters", async () => {
      const dbA = testEnv.authenticatedContext(teacherA).firestore();
      const noteRef = doc(dbA, `students/${studentWithPortal}/notes/n-invalid`);

      await assertFails(
        setDoc(noteRef, {
          category: "unknown-cat",
          text: "valid text",
          visibility: "private",
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await assertFails(
        setDoc(noteRef, {
          category: "grammar",
          text: "a".repeat(501),
          visibility: "private",
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });
  });

  describe("student portal and invites (spec 03: RNF01, RNF02, RNF03, CA06, CA07, CA09)", () => {
    const studentUser = "student-ana";
    const studentDocId = "s-ana";
    const otherStudentDocId = "s-bruno";

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        // Student Ana linked to portal
        await setDoc(doc(db, `students/${studentDocId}`), {
          teacherUid: teacherA,
          name: "Ana Silva",
          classIds: ["c1"],
          portalUid: studentUser,
          homeworkPin: "hash1111",
          createdAt: new Date(),
        });

        // Student Bruno linked to another portal user
        await setDoc(doc(db, `students/${otherStudentDocId}`), {
          teacherUid: teacherA,
          name: "Bruno Costa",
          classIds: ["c1"],
          portalUid: "student-bruno",
          homeworkPin: "hash2222",
          createdAt: new Date(),
        });

        // Class session for Ana
        await setDoc(doc(db, `students/${studentDocId}/classes/session-1`), {
          sessionId: "session-1",
          date: new Date(),
          durationMinutes: 50,
          activities: [{ id: "act1", title: "Past Simple Quiz" }],
          words: ["went", "bought"],
          classNotes: "Great participation today!",
        });

        // An invite in invites collection
        await setDoc(doc(db, "invites/TEST1234"), {
          code: "TEST1234",
          studentId: studentDocId,
          teacherUid: teacherA,
          expiresAt: new Date(Date.now() + 86400000),
        });
      });
    });

    it("allows creating user profile with role: 'student' (RNF01)", async () => {
      const dbStudent = testEnv.authenticatedContext("new-student").firestore();
      await assertSucceeds(
        setDoc(doc(dbStudent, "users/new-student"), {
          displayName: "New Student",
          email: "student@test.com",
          photoURL: null,
          role: "student",
          createdAt: new Date(),
        }),
      );
    });

    it("student CANNOT change their role to 'teacher' (CA06)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      // Setup initial profile as student
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), `users/${studentUser}`), {
          displayName: "Ana",
          email: "ana@test.com",
          photoURL: null,
          role: "student",
          createdAt: new Date(),
        });
      });

      // Attempt to change role to teacher must fail (CA06)
      await assertFails(
        setDoc(doc(dbStudent, `users/${studentUser}`), { role: "teacher" }, { merge: true }),
      );
    });

    it("student with portalUid can read their own student document", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      const snap = await assertSucceeds(getDoc(doc(dbStudent, `students/${studentDocId}`)));
      expect(snap.data()?.name).toBe("Ana Silva");
    });

    it("student CANNOT read other students' documents (CA09)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      await assertFails(getDoc(doc(dbStudent, `students/${otherStudentDocId}`)));
    });

    it("student CANNOT update students collection or overwrite portalUid via SDK (CA09)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      // Attempt to update own student doc
      await assertFails(
        setDoc(doc(dbStudent, `students/${studentDocId}`), { name: "Hacked" }, { merge: true }),
      );
      // Attempt to overwrite another student's portalUid
      await assertFails(
        setDoc(
          doc(dbStudent, `students/${otherStudentDocId}`),
          { portalUid: studentUser },
          { merge: true },
        ),
      );
    });

    it("student can read their own class session history, but not other students' (CA04, CA09)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      const snap = await assertSucceeds(
        getDoc(doc(dbStudent, `students/${studentDocId}/classes/session-1`)),
      );
      expect(snap.data()?.words).toContain("went");

      // Cannot read other student's class history
      await assertFails(
        getDoc(doc(dbStudent, `students/${otherStudentDocId}/classes/session-1`)),
      );

      // Student cannot write or delete class history
      await assertFails(
        setDoc(
          doc(dbStudent, `students/${studentDocId}/classes/session-fake`),
          { fake: true },
        ),
      );
    });

    it("client SDK CANNOT read or write invites collection (RNF02, CA09)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      const dbTeacher = testEnv.authenticatedContext(teacherA).firestore();
      const dbAnon = testEnv.unauthenticatedContext().firestore();

      // Nobody reads from client SDK
      await assertFails(getDoc(doc(dbStudent, "invites/TEST1234")));
      await assertFails(getDoc(doc(dbTeacher, "invites/TEST1234")));
      await assertFails(getDoc(doc(dbAnon, "invites/TEST1234")));

      // Nobody writes from client SDK
      await assertFails(setDoc(doc(dbStudent, "invites/HACK1234"), { code: "HACK1234" }));
      await assertFails(setDoc(doc(dbTeacher, "invites/HACK1234"), { code: "HACK1234" }));
    });

    it("when teacher removes portal access, student immediately loses read access (RF08, CA07)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      // Initially student can read
      await assertSucceeds(getDoc(doc(dbStudent, `students/${studentDocId}`)));

      // Teacher removes portalUid
      const dbTeacher = testEnv.authenticatedContext(teacherA).firestore();
      await assertSucceeds(
        setDoc(doc(dbTeacher, `students/${studentDocId}`), { portalUid: "" }, { merge: true }),
      );

      // Student now fails to read
      await assertFails(getDoc(doc(dbStudent, `students/${studentDocId}`)));
    });
  });

  describe("student vocabulary (spec 04: RNF01, RNF02, CA08, CT08)", () => {
    const teacherA = "teacher-1";
    const studentUser = "student-portal-user-1";
    const studentDocId = "student-ana-vocab";
    const otherStudentDocId = "student-bruno-vocab";

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        // Ana
        await setDoc(doc(db, `students/${studentDocId}`), {
          teacherUid: teacherA,
          name: "Ana Silva",
          classIds: ["c1"],
          portalUid: studentUser,
          homeworkPin: "hash1111",
          createdAt: new Date(),
        });
        // Bruno
        await setDoc(doc(db, `students/${otherStudentDocId}`), {
          teacherUid: teacherA,
          name: "Bruno Costa",
          classIds: ["c1"],
          portalUid: "student-bruno-uid",
          homeworkPin: "hash2222",
          createdAt: new Date(),
        });

        // Seed a word in Ana's dictionary
        await setDoc(doc(db, `students/${studentDocId}/vocabulary/luggage`), {
          term: "luggage",
          meaning: "bagagem",
          example: "Heavy luggage",
          sessionIds: ["session-1"],
          firstAddedAt: new Date().toISOString(),
          lastAddedAt: new Date().toISOString(),
          learned: false,
        });

        // Seed a word in Bruno's dictionary
        await setDoc(doc(db, `students/${otherStudentDocId}/vocabulary/customs`), {
          term: "customs",
          meaning: "alfândega",
          sessionIds: ["session-1"],
          firstAddedAt: new Date().toISOString(),
          lastAddedAt: new Date().toISOString(),
          learned: false,
        });
      });
    });

    it("teacher can create, read, update and delete vocabulary words", async () => {
      const dbTeacher = testEnv.authenticatedContext(teacherA).firestore();
      // Read
      const snap = await assertSucceeds(
        getDoc(doc(dbTeacher, `students/${studentDocId}/vocabulary/luggage`)),
      );
      expect(snap.data()?.term).toBe("luggage");

      // Create new word
      await assertSucceeds(
        setDoc(doc(dbTeacher, `students/${studentDocId}/vocabulary/passport`), {
          term: "passport",
          meaning: "passaporte",
          sessionIds: ["session-1"],
          firstAddedAt: new Date().toISOString(),
          lastAddedAt: new Date().toISOString(),
          learned: false,
        }),
      );

      // Update
      await assertSucceeds(
        updateDoc(doc(dbTeacher, `students/${studentDocId}/vocabulary/passport`), {
          meaning: "documento passaporte",
        }),
      );

      // Delete
      await assertSucceeds(
        deleteDoc(doc(dbTeacher, `students/${studentDocId}/vocabulary/passport`)),
      );
    });

    it("student can read their own vocabulary and update ONLY 'learned' (RNF02, CA08)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();

      // Read own word succeeds
      const snap = await assertSucceeds(
        getDoc(doc(dbStudent, `students/${studentDocId}/vocabulary/luggage`)),
      );
      expect(snap.data()?.meaning).toBe("bagagem");

      // Update ONLY learned succeeds (CA06)
      await assertSucceeds(
        updateDoc(doc(dbStudent, `students/${studentDocId}/vocabulary/luggage`), {
          learned: true,
        }),
      );
    });

    it("student can update SRS review fields on their own vocabulary (spec 13: RNF02, CA09)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();

      // Updating SRS fields succeeds
      await assertSucceeds(
        updateDoc(doc(dbStudent, `students/${studentDocId}/vocabulary/luggage`), {
          dueAt: "2026-10-15",
          intervalDays: 8,
          ease: 2.5,
          reps: 3,
          lapses: 0,
          lastReviewedAt: "2026-10-06T12:00:00.000Z",
        }),
      );
    });

    it("student operations are DENIED when trying to alter term or meaning, create word or read other student vocabulary (CA08, CA09, CT08)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();

      // 1. Alter term is denied (CA09)
      await assertFails(
        updateDoc(doc(dbStudent, `students/${studentDocId}/vocabulary/luggage`), {
          term: "hacked term",
        }),
      );

      // 2. Alter meaning is denied (CA08, CA09)
      await assertFails(
        updateDoc(doc(dbStudent, `students/${studentDocId}/vocabulary/luggage`), {
          meaning: "hacked meaning",
        }),
      );

      // 3. Creating a word is denied (CA08)
      await assertFails(
        setDoc(doc(dbStudent, `students/${studentDocId}/vocabulary/boarding-pass`), {
          term: "boarding pass",
          meaning: "cartão de embarque",
          sessionIds: [],
          firstAddedAt: new Date().toISOString(),
          lastAddedAt: new Date().toISOString(),
          learned: false,
        }),
      );

      // 4. Reading or writing Bruno's vocabulary is denied (CA08, CA09)
      await assertFails(
        getDoc(doc(dbStudent, `students/${otherStudentDocId}/vocabulary/customs`)),
      );
      await assertFails(
        updateDoc(doc(dbStudent, `students/${otherStudentDocId}/vocabulary/customs`), {
          intervalDays: 5,
        }),
      );
    });
  });

  describe("classroom sessions (spec 08: sessão de aula, RF01, RF08, RNF01)", () => {
    const teacherA = "teacher-A";
    const teacherB = "teacher-B";

    it("teacher can create, read, update, and delete their own sessions (CA01)", async () => {
      const dbA = testEnv.authenticatedContext(teacherA).firestore();
      const sessionRef = doc(dbA, `users/${teacherA}/sessions/s1`);

      await assertSucceeds(
        setDoc(sessionRef, {
          classId: "c1",
          className: "Teens B1",
          startedAt: new Date(),
          status: "active",
          attendance: { student1: true },
        }),
      );

      const snap = await assertSucceeds(getDoc(sessionRef));
      expect(snap.data()?.status).toBe("active");

      await assertSucceeds(
        updateDoc(sessionRef, {
          status: "ended",
          endedAt: new Date(),
        }),
      );

      await assertSucceeds(deleteDoc(sessionRef));
    });

    it("another teacher or unauthenticated user cannot read or write teacher's sessions", async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), `users/${teacherA}/sessions/s-secret`), {
          classId: "c1",
          className: "Secret Session",
          startedAt: new Date(),
          status: "active",
        });
      });

      const dbB = testEnv.authenticatedContext(teacherB).firestore();
      const dbAnon = testEnv.unauthenticatedContext().firestore();

      await assertFails(getDoc(doc(dbB, `users/${teacherA}/sessions/s-secret`)));
      await assertFails(getDoc(doc(dbAnon, `users/${teacherA}/sessions/s-secret`)));
      await assertFails(
        setDoc(doc(dbB, `users/${teacherA}/sessions/s-hacked`), {
          status: "active",
        }),
      );
    });
  });

  describe("homework (spec 10: RNF01, RNF07, CA09)", () => {
    const teacherA = "teacher-hw-a";
    const teacherB = "teacher-hw-b";
    const studentUser = "student-portal-1";

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, "homework/hw-1"), {
          teacherUid: teacherA,
          activityId: "act-1",
          activityTitle: "Animals Quiz",
          open: true,
          targetType: "class",
        });
        await setDoc(doc(db, "homework/hw-1/assignees/token-123"), {
          studentId: "s-1",
          firstName: "Ana",
        });
        await setDoc(doc(db, "homework/hw-1/submissions/sub-1"), {
          studentId: "s-1",
          studentName: "Ana",
          correct: 5,
          total: 5,
        });
        await setDoc(doc(db, "students/s-1"), {
          name: "Ana",
          teacherUid: teacherA,
          portalUid: studentUser,
          classIds: [],
          homeworkPin: "dummy-hash",
        });
        await setDoc(doc(db, "students/s-1/homeworkSubmissions/sub-1"), {
          homeworkId: "hw-1",
          correct: 5,
          total: 5,
        });
      });
    });

    it("anyone with ID can read the homework doc, but cannot list all homeworks (CA09)", async () => {
      const dbAnon = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(dbAnon, "homework/hw-1")));
      await assertFails(getDocs(collection(dbAnon, "homework")));
    });

    it("teacher can list their own homeworks, but another teacher cannot list them", async () => {
      const dbA = testEnv.authenticatedContext(teacherA).firestore();
      const dbB = testEnv.authenticatedContext(teacherB).firestore();

      await assertSucceeds(
        getDocs(query(collection(dbA, "homework"), where("teacherUid", "==", teacherA))),
      );
      await assertFails(
        getDocs(query(collection(dbB, "homework"), where("teacherUid", "==", teacherA))),
      );
    });

    it("client cannot read or write assignees directly (RNF07)", async () => {
      const dbAnon = testEnv.unauthenticatedContext().firestore();
      const dbA = testEnv.authenticatedContext(teacherA).firestore();

      await assertFails(getDoc(doc(dbAnon, "homework/hw-1/assignees/token-123")));
      await assertFails(getDoc(doc(dbA, "homework/hw-1/assignees/token-123")));
      await assertFails(
        setDoc(doc(dbA, "homework/hw-1/assignees/token-fake"), { studentId: "s-1" }),
      );
    });

    it("submissions are read only by the owner teacher, direct client writes are denied (RNF01, CA09)", async () => {
      const dbAnon = testEnv.unauthenticatedContext().firestore();
      const dbB = testEnv.authenticatedContext(teacherB).firestore();
      const dbA = testEnv.authenticatedContext(teacherA).firestore();

      // Non-teacher cannot read submissions
      await assertFails(getDoc(doc(dbAnon, "homework/hw-1/submissions/sub-1")));
      await assertFails(getDoc(doc(dbB, "homework/hw-1/submissions/sub-1")));

      // Teacher A can read their submissions
      await assertSucceeds(getDoc(doc(dbA, "homework/hw-1/submissions/sub-1")));

      // Direct write/create from client is completely denied (CA09: "enviar correct: 50, total: 10")
      await assertFails(
        setDoc(doc(dbAnon, "homework/hw-1/submissions/sub-hacked"), {
          correct: 50,
          total: 10,
        }),
      );
      await assertFails(
        setDoc(doc(dbA, "homework/hw-1/submissions/sub-hacked"), {
          correct: 50,
          total: 10,
        }),
      );
    });

    it("student portal and teacher can read student homeworkSubmissions, but client write is denied", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      const dbA = testEnv.authenticatedContext(teacherA).firestore();
      const dbB = testEnv.authenticatedContext(teacherB).firestore();

      await assertSucceeds(getDoc(doc(dbStudent, "students/s-1/homeworkSubmissions/sub-1")));
      await assertSucceeds(getDoc(doc(dbA, "students/s-1/homeworkSubmissions/sub-1")));
      await assertFails(getDoc(doc(dbB, "students/s-1/homeworkSubmissions/sub-1")));

      await assertFails(
        setDoc(doc(dbStudent, "students/s-1/homeworkSubmissions/sub-new"), {
          correct: 100,
        }),
      );
    });
  });

  describe("learning tracks (spec 11: RF01, RF02, RF03, RF05, RNF01, RNF03, CA09)", () => {
    const teacherA = "teacher-track-a";
    const teacherB = "teacher-track-b";
    const studentUser = "student-portal-ana";

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, "students/s-ana"), {
          name: "Ana",
          teacherUid: teacherA,
          portalUid: studentUser,
          classIds: [],
          homeworkPin: "dummy-hash",
        });
        await setDoc(doc(db, `users/${teacherA}/tracks/track-1`), {
          name: "Travel module",
          activityIds: ["act-1", "act-2"],
          countClassActivities: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await setDoc(doc(db, "students/s-ana/tracks/track-1"), {
          trackId: "track-1",
          trackName: "Travel module",
          activityIds: ["act-1", "act-2"],
          completed: {},
          assignedAt: new Date(),
        });
      });
    });

    it("teacher can CRUD their own tracks in users/{uid}/tracks", async () => {
      const dbA = testEnv.authenticatedContext(teacherA).firestore();
      const trackRef = doc(dbA, `users/${teacherA}/tracks/track-new`);

      // Create
      await assertSucceeds(
        setDoc(trackRef, {
          name: "Grammar Basics",
          activityIds: ["act-1"],
          description: "Learn essentials",
          level: "beginner",
          countClassActivities: false,
        }),
      );

      // Read
      await assertSucceeds(getDoc(trackRef));

      // Update
      await assertSucceeds(
        updateDoc(trackRef, {
          name: "Grammar Advanced",
        }),
      );

      // Delete
      await assertSucceeds(deleteDoc(trackRef));
    });

    it("teacher cannot create track with invalid name or empty activityIds", async () => {
      const dbA = testEnv.authenticatedContext(teacherA).firestore();

      // Empty name
      await assertFails(
        setDoc(doc(dbA, `users/${teacherA}/tracks/track-bad`), {
          name: "",
          activityIds: ["act-1"],
        }),
      );

      // Empty activityIds
      await assertFails(
        setDoc(doc(dbA, `users/${teacherA}/tracks/track-bad`), {
          name: "Valid Name",
          activityIds: [],
        }),
      );
    });

    it("another teacher or unauthenticated user cannot read or write teacher's tracks", async () => {
      const dbB = testEnv.authenticatedContext(teacherB).firestore();
      const dbAnon = testEnv.unauthenticatedContext().firestore();

      await assertFails(getDoc(doc(dbB, `users/${teacherA}/tracks/track-1`)));
      await assertFails(getDoc(doc(dbAnon, `users/${teacherA}/tracks/track-1`)));
      await assertFails(
        setDoc(doc(dbB, `users/${teacherA}/tracks/track-1`), {
          name: "Hacked",
          activityIds: ["act-1"],
        }),
      );
    });

    it("teacher can read and update student track progress in students/{id}/tracks/{id}", async () => {
      const dbA = testEnv.authenticatedContext(teacherA).firestore();
      const progRef = doc(dbA, "students/s-ana/tracks/track-1");

      await assertSucceeds(getDoc(progRef));
      await assertSucceeds(
        updateDoc(progRef, {
          "completed.act-1": { at: new Date().toISOString(), source: "manual" },
        }),
      );
    });

    it("student portalUid can read their own track progress", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      await assertSucceeds(getDoc(doc(dbStudent, "students/s-ana/tracks/track-1")));
    });

    it("student portalUid CANNOT write or update track progress (CA09)", async () => {
      const dbStudent = testEnv.authenticatedContext(studentUser).firestore();
      const progRef = doc(dbStudent, "students/s-ana/tracks/track-1");

      await assertFails(
        updateDoc(progRef, {
          "completed.act-1": { at: new Date().toISOString(), source: "manual" },
        }),
      );
      await assertFails(
        setDoc(doc(dbStudent, "students/s-ana/tracks/track-new"), {
          trackId: "track-new",
          completed: {},
        }),
      );
    });
  });

  describe("lesson plans (spec 12, RNF01, RNF03, RNF06, CA08)", () => {
    const teacherPlanA = "teacher-plan-a";
    const teacherPlanB = "teacher-plan-b";

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        // Seed a legacy plan with classId only
        await setDoc(doc(db, `users/${teacherPlanA}/plans/legacy-plan`), {
          classId: "class-1",
          title: "Legacy Class Plan",
          items: [{ kind: "activity", activityId: "act-1", title: "Activity 1", minutes: 10 }],
          words: ["hello"],
          status: "draft",
          updatedAt: new Date(),
        });
      });
    });

    it("teacher can create plan for student or class and read own plans", async () => {
      const dbA = testEnv.authenticatedContext(teacherPlanA).firestore();

      // Student plan
      await assertSucceeds(
        setDoc(doc(dbA, `users/${teacherPlanA}/plans/plan-student`), {
          targetType: "student",
          studentId: "s-123",
          title: "Student 1:1 Plan",
          items: [{ kind: "block", title: "Warm up", minutes: 5 }],
          words: ["word1"],
          status: "draft",
          updatedAt: new Date(),
        }),
      );

      // Class plan
      await assertSucceeds(
        setDoc(doc(dbA, `users/${teacherPlanA}/plans/plan-class`), {
          targetType: "class",
          classId: "c-123",
          title: "Class Plan",
          items: [{ kind: "activity", activityId: "act-1", title: "Act 1", minutes: 15 }],
          words: [],
          status: "draft",
          updatedAt: new Date(),
        }),
      );

      // Read own plan
      const snap = await assertSucceeds(getDoc(doc(dbA, `users/${teacherPlanA}/plans/plan-student`)));
      expect(snap.exists()).toBe(true);

      // Legacy plan is readable (RNF06)
      const legacySnap = await assertSucceeds(getDoc(doc(dbA, `users/${teacherPlanA}/plans/legacy-plan`)));
      expect(legacySnap.exists()).toBe(true);
    });

    it("teacher B receives permission-denied when attempting to read or write teacher A's plans (CA08)", async () => {
      const dbB = testEnv.authenticatedContext(teacherPlanB).firestore();

      await assertFails(getDoc(doc(dbB, `users/${teacherPlanA}/plans/legacy-plan`)));
      await assertFails(
        setDoc(doc(dbB, `users/${teacherPlanA}/plans/plan-hack`), {
          targetType: "student",
          studentId: "s-123",
          title: "Hacked Plan",
          items: [{ kind: "block", title: "Warm up", minutes: 5 }],
          words: [],
          status: "draft",
          updatedAt: new Date(),
        }),
      );
    });

    it("rejects plan with 16 items (CA08, RNF03)", async () => {
      const dbA = testEnv.authenticatedContext(teacherPlanA).firestore();
      const items = Array.from({ length: 16 }, (_, i) => ({
        kind: "activity",
        activityId: `act-${i}`,
        title: `Act ${i}`,
        minutes: 5,
      }));

      await assertFails(
        setDoc(doc(dbA, `users/${teacherPlanA}/plans/plan-oversized`), {
          targetType: "student",
          studentId: "s-123",
          title: "Oversized Plan",
          items,
          words: [],
          status: "draft",
          updatedAt: new Date(),
        }),
      );
    });

    it("rejects plan with neither studentId nor classId, or with both (CA08, RNF01)", async () => {
      const dbA = testEnv.authenticatedContext(teacherPlanA).firestore();

      // Neither
      await assertFails(
        setDoc(doc(dbA, `users/${teacherPlanA}/plans/plan-none`), {
          title: "No Target Plan",
          items: [{ kind: "block", title: "Warm up", minutes: 5 }],
          words: [],
          status: "draft",
          updatedAt: new Date(),
        }),
      );

      // Both
      await assertFails(
        setDoc(doc(dbA, `users/${teacherPlanA}/plans/plan-both`), {
          studentId: "s-123",
          classId: "c-123",
          title: "Both Targets Plan",
          items: [{ kind: "block", title: "Warm up", minutes: 5 }],
          words: [],
          status: "draft",
          updatedAt: new Date(),
        }),
      );
    });
  });

  describe("progress reports (spec 16)", () => {
    const teacherId = "teacher-rep-1";
    const studentId = "student-rep-1";
    const portalUid = "portal-rep-1";
    const otherStudentPortalUid = "portal-rep-2";

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, `students/${studentId}`), {
          teacherUid: teacherId,
          name: "Ana",
          classIds: [],
          homeworkPin: "hash",
          portalUid,
          createdAt: new Date(),
        });
        await setDoc(doc(db, `students/${studentId}/reports/rep-1`), {
          period: { type: "last-month", from: "2026-09-01", to: "2026-09-30", label: "September 2026" },
          metrics: {},
          revoked: false,
          createdAt: new Date(),
        });
        await setDoc(doc(db, "publicReports/token-hash-valid"), {
          tokenHash: "token-hash-valid",
          studentId,
          reportId: "rep-1",
          revoked: false,
          snapshot: { id: "rep-1" },
        });
        await setDoc(doc(db, "publicReports/token-hash-revoked"), {
          tokenHash: "token-hash-revoked",
          studentId,
          reportId: "rep-1",
          revoked: true,
          snapshot: { id: "rep-1" },
        });
      });
    });

    it("teacher can read and write student reports (RNF02, CA06)", async () => {
      const dbTeacher = testEnv.authenticatedContext(teacherId).firestore();
      await assertSucceeds(getDoc(doc(dbTeacher, `students/${studentId}/reports/rep-1`)));
      await assertSucceeds(
        setDoc(doc(dbTeacher, `students/${studentId}/reports/rep-2`), {
          period: { type: "last-month", from: "2026-09-01", to: "2026-09-30", label: "September 2026" },
          metrics: {},
          revoked: false,
          createdAt: new Date(),
        }),
      );
    });

    it("student portal user can read their own unrevoked report (CA08)", async () => {
      const dbStudent = testEnv.authenticatedContext(portalUid).firestore();
      await assertSucceeds(getDoc(doc(dbStudent, `students/${studentId}/reports/rep-1`)));
    });

    it("other student cannot read report (CA08)", async () => {
      const dbOther = testEnv.authenticatedContext(otherStudentPortalUid).firestore();
      await assertFails(getDoc(doc(dbOther, `students/${studentId}/reports/rep-1`)));
    });

    it("public can get active public report, but not revoked or list (RNF03, CA06, CA07)", async () => {
      const dbAnon = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(dbAnon, "publicReports/token-hash-valid")));
      await assertFails(getDoc(doc(dbAnon, "publicReports/token-hash-revoked")));
      await assertFails(getDocs(collection(dbAnon, "publicReports")));
    });
  });
});


