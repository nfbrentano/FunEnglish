import { beforeAll, describe, expect, it } from "vitest";
import { prepareSeed } from "@/lib/activities/seed";
import {
  ACTIVITIES_COLLECTION,
  rebuildCatalogIndex,
  upsertActivities,
} from "@/lib/activities/seed-writer";
import { getAdminDb } from "@/lib/firebase-admin/core";
import { validQuiz } from "../unit/activities/fixtures";

const db = getAdminDb();

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Run through `npm run test:emulator`");
  await db.recursiveDelete(db.collection(ACTIVITIES_COLLECTION));
});

describe("upsertActivities", () => {
  it("creates on the first run and updates by slug on the next, keeping createdAt", async () => {
    const { activities } = prepareSeed([
      { path: "ai/grammar/quiz.json", contents: JSON.stringify(validQuiz()) },
    ]);
    const docs = activities.map((a) => a.doc);

    expect(await upsertActivities(db, docs)).toEqual({ created: 1, updated: 0 });
    const first = (await db.collection(ACTIVITIES_COLLECTION).get()).docs[0];

    expect(await upsertActivities(db, docs)).toEqual({ created: 0, updated: 1 });
    const all = await db.collection(ACTIVITIES_COLLECTION).get();

    expect(all.size).toBe(1);
    expect(all.docs[0].id).toBe(first.id);
    expect(all.docs[0].get("createdAt").isEqual(first.get("createdAt"))).toBe(true);
    expect(all.docs[0].get("origin")).toBe("ai");
  });

  it("rebuilds catalog/index with published activities only", async () => {
    const draft = { ...validQuiz(), slug: "a-draft", status: "draft" };
    const published = { ...validQuiz(), slug: "published-one", status: "published" };
    const { activities } = prepareSeed([
      { path: "a.json", contents: JSON.stringify(draft) },
      { path: "b.json", contents: JSON.stringify(published) },
    ]);
    await upsertActivities(
      db,
      activities.map((a) => a.doc),
    );

    const index = await rebuildCatalogIndex(db);

    expect(index.items.map((i) => i.slug)).toEqual(["published-one"]);
    const stored = await db.doc("catalog/index").get();
    expect(stored.get("items")).toHaveLength(1);
  });
});
