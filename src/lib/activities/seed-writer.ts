import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { buildCatalogIndex } from "../catalog/sections";
import { CATALOG_COLLECTION, CATALOG_INDEX_DOC } from "../catalog/schema";
import type { ActivityDoc } from "./schema/activity";
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

/** Regenerates `catalog/index` from the published activities (spec: catálogo de atividades, RNF01). */
export async function rebuildCatalogIndex(db: Firestore) {
  const snapshot = await db
    .collection(ACTIVITIES_COLLECTION)
    .where("status", "==", "published")
    .get();
  const activities = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      data: {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as ActivityDoc<Date>,
    };
  });

  const index = buildCatalogIndex(activities);
  await db.collection(CATALOG_COLLECTION).doc(CATALOG_INDEX_DOC).set(index);
  return index;
}
