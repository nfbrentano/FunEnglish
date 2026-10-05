import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
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

describe("Realtime Database security rules for Live Room (RNF01, RNF03, CA12, CT11)", () => {
  it("denies unauthenticated read and write to liveRooms and liveRoomPins", async () => {
    const rtdb = testEnv.unauthenticatedContext().database();
    await assertFails(rtdb.ref("liveRooms/ROOM01").set({ teacherUid: "t1" }));
    await assertFails(rtdb.ref("liveRooms/ROOM01").once("value"));
    await assertFails(rtdb.ref("liveRoomPins/ROOM01").once("value"));
  });

  it("denies student read access to liveRoomPins (RNF01, RNF03)", async () => {
    const studentDb = testEnv.authenticatedContext("student-1").database();
    await assertFails(studentDb.ref("liveRoomPins/ROOM01").once("value"));
    await assertFails(studentDb.ref("liveRoomPins/ROOM01/s1").once("value"));
  });

  it("teacher can create live room and write PINs, student cannot write state or others' data (CA12, CT11)", async () => {
    const teacherDb = testEnv.authenticatedContext("teacher-1").database();
    const studentDb = testEnv.authenticatedContext("student-1").database();
    const student2Db = testEnv.authenticatedContext("student-2").database();

    // 1. Teacher creates room
    await assertSucceeds(
      teacherDb.ref("liveRooms/ROOM01").set({
        teacherUid: "teacher-1",
        sessionId: "session-1",
        locked: false,
        allowGuests: false,
        state: {
          mode: "activity",
          itemIndex: 0,
          revealed: false,
        },
        roster: {
          s1: { firstName: "Ana" },
        },
      }),
    );

    // Teacher sets PIN
    await assertSucceeds(
      teacherDb.ref("liveRoomPins/ROOM01").set({
        s1: "correct-hash",
      }),
    );

    // 2. Student 1 writes own participant node with matching PIN hash -> SUCCEEDS
    await assertSucceeds(
      studentDb.ref("liveRooms/ROOM01/participants/student-1").set({
        name: "Ana",
        studentId: "s1",
        pinHash: "correct-hash",
        via: "pin",
        online: true,
      }),
    );

    // 3. Attack 1: Student 2 tries to join as s1 with wrong PIN -> FAILS
    await assertFails(
      student2Db.ref("liveRooms/ROOM01/participants/student-2").set({
        name: "Hacker",
        studentId: "s1",
        pinHash: "wrong-hash",
        via: "pin",
        online: true,
      }),
    );

    // 4. Attack 2: Student tries to write in state -> FAILS
    await assertFails(
      studentDb.ref("liveRooms/ROOM01/state/revealed").set(true),
    );

    // 5. Attack 3: Student tries to write to another participant's node -> FAILS
    await assertFails(
      studentDb.ref("liveRooms/ROOM01/participants/student-2").set({
        name: "Hijack",
      }),
    );

    // 6. Student submits answer to current question (itemIndex 0, revealed false) -> SUCCEEDS
    await assertSucceeds(
      studentDb.ref("liveRooms/ROOM01/answers/0/student-1").set({
        value: "Option A",
        at: 1000,
      }),
    );

    // 7. Attack 4: Student tries to submit a second time to same question -> FAILS
    await assertFails(
      studentDb.ref("liveRooms/ROOM01/answers/0/student-1").set({
        value: "Option B",
        at: 2000,
      }),
    );

    // 8. Attack 5: Student tries to answer a different question (itemIndex 1 != current 0) -> FAILS
    await assertFails(
      studentDb.ref("liveRooms/ROOM01/answers/1/student-1").set({
        value: "Option C",
        at: 1000,
      }),
    );

    // 9. Teacher reveals question
    await assertSucceeds(
      teacherDb.ref("liveRooms/ROOM01/state/revealed").set(true),
    );

    // 10. Attack 6: Student 2 tries to submit after reveal -> FAILS
    await assertFails(
      student2Db.ref("liveRooms/ROOM01/answers/0/student-2").set({
        value: "Late answer",
        at: 3000,
      }),
    );
  });
});
