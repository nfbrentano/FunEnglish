import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { SeedDoc } from "./seed";

export const ACTIVITIES_COLLECTION = "activities";

/** Creates or replaces each activity, matched by slug. createdAt is kept on updates. */
export async function upsertActivities(db: Firestore, docs: readonly SeedDoc[]) {
  const collection = db.collection(ACTIVITIES_COLLECTION);
  let created = 0;
  let updated = 0;

  for (const doc of docs) {
    // Firestore rejects `undefined`; a JSON round-trip drops those keys from the plain data.
    const data = JSON.parse(JSON.stringify(doc)) as SeedDoc;
    const existing = await collection.where("slug", "==", doc.slug).limit(1).get();
    const now = FieldValue.serverTimestamp();

    if (existing.empty) {
      await collection.add({ ...data, createdAt: now, updatedAt: now });
      created++;
    } else {
      const current = existing.docs[0];
      await current.ref.set({
        ...data,
        createdAt: current.get("createdAt") ?? now,
        updatedAt: now,
      });
      updated++;
    }
  }

  return { created, updated };
}
