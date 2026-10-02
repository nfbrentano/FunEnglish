import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { ACTIVITIES_COLLECTION } from "./collections";
import { buildCatalogIndex } from "../catalog/sections";
import { CATALOG_COLLECTION, CATALOG_INDEX_DOC } from "../catalog/schema";
import type { ActivityDoc } from "./schema/activity";
import { seedDecision, type SeedDoc } from "./seed";

export { ACTIVITIES_COLLECTION };

/**
 * Creates or replaces each activity, matched by slug; createdAt is kept on updates. Activities
 * edited in the admin panel after their file are skipped unless `force` (see seedDecision).
 */
export async function upsertActivities(
  db: Firestore,
  docs: readonly SeedDoc[],
  { force = false }: { force?: boolean } = {},
) {
  const collection = db.collection(ACTIVITIES_COLLECTION);
  let created = 0;
  let updated = 0;
  /** Slugs kept because they were edited in the admin panel after the file. */
  const skipped: string[] = [];

  for (const doc of docs) {
    // Firestore rejects `undefined`; a JSON round-trip drops those keys from the plain data.
    const { editedInPanelAt, ...data } = JSON.parse(JSON.stringify(doc)) as SeedDoc;
    // Stored as a Timestamp, like the panel writes it.
    const panelFields = editedInPanelAt ? { editedInPanelAt: new Date(editedInPanelAt) } : {};
    const existing = await collection.where("slug", "==", doc.slug).limit(1).get();
    const now = FieldValue.serverTimestamp();

    if (existing.empty) {
      await collection.add({ ...data, ...panelFields, createdAt: now, updatedAt: now });
      created++;
      continue;
    }
    const current = existing.docs[0];
    const edited = current.get("editedInPanelAt") as { toDate(): Date } | undefined;
    if (seedDecision(edited?.toDate() ?? null, editedInPanelAt, force) === "skip") {
      skipped.push(doc.slug);
      continue;
    }
    await current.ref.set({
      ...data,
      ...panelFields,
      createdAt: current.get("createdAt") ?? now,
      updatedAt: now,
    });
    updated++;
  }

  return { created, updated, skipped };
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
