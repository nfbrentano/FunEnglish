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

describe("Whiteboard Storage security rules (SDD 07, RNF07, CA09)", () => {
  it("allows teacher to upload an image up to 2 MB to their own session boards path", async () => {
    const storage = testEnv.authenticatedContext("teacher-1").storage();
    const fileRef = storage.ref("boards/teacher-1/session-abc/image1.webp");
    const smallBlob = new Uint8Array([1, 2, 3, 4]);
    await fileRef.put(smallBlob, { contentType: "image/webp" });
  });

  it("denies unauthenticated upload to boards path", async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    const fileRef = storage.ref("boards/teacher-1/session-abc/image1.webp");
    const smallBlob = new Uint8Array([1, 2, 3, 4]);
    await assertFails(Promise.resolve(fileRef.put(smallBlob, { contentType: "image/webp" })));
  });

  it("denies teacher upload to another teacher's boards path", async () => {
    const storage = testEnv.authenticatedContext("teacher-2").storage();
    const fileRef = storage.ref("boards/teacher-1/session-abc/image1.webp");
    const smallBlob = new Uint8Array([1, 2, 3, 4]);
    await assertFails(Promise.resolve(fileRef.put(smallBlob, { contentType: "image/webp" })));
  });

  it("denies non-image uploads (e.g. application/pdf)", async () => {
    const storage = testEnv.authenticatedContext("teacher-1").storage();
    const fileRef = storage.ref("boards/teacher-1/session-abc/doc.pdf");
    const smallBlob = new Uint8Array([1, 2, 3, 4]);
    await assertFails(Promise.resolve(fileRef.put(smallBlob, { contentType: "application/pdf" })));
  });

  it("denies image uploads larger than 2 MB", async () => {
    const storage = testEnv.authenticatedContext("teacher-1").storage();
    const fileRef = storage.ref("boards/teacher-1/session-abc/large.png");
    // 2 MB + 1 byte
    const largeBlob = new Uint8Array(2 * 1024 * 1024 + 1);
    await assertFails(Promise.resolve(fileRef.put(largeBlob, { contentType: "image/png" })));
  });
});
