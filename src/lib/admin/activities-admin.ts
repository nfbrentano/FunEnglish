"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore/lite";
import { ACTIVITIES_COLLECTION } from "../activities/collections";
import { toSeedJson } from "../activities/export";
import type { ActivityDoc, ActivityInput } from "../activities/schema/activity";
import { buildSearchTokens } from "../activities/search";
import { buildCatalogIndex } from "../catalog/sections";
import { CATALOG_COLLECTION, CATALOG_INDEX_DOC, type CatalogIndex } from "../catalog/schema";
import { getLiteDb } from "../firebase";
import { jsonBytes, MAX_REVISIONS, revisionSummary } from "./revisions";

/** What the panel edits: the authored fields plus review data. */
export type AdminActivity = ActivityInput & {
  id: string;
  origin: "ai" | "human";
  reviewStatus: "pending" | "reviewed";
  createdAt: Date | null;
  updatedAt: Date | null;
};

const toDate = (value: unknown) =>
  value && typeof (value as { toDate?: () => Date }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate()
    : null;

const activities = () => collection(getLiteDb(), ACTIVITIES_COLLECTION);

function fromFirestore(id: string, data: Record<string, unknown>): AdminActivity {
  // Server-managed fields stay out of what the editor edits and saves back.
  const {
    searchTokens: _tokens,
    editedInPanelAt: _edited,
    ...authored
  } = data as Record<string, unknown> & { searchTokens?: unknown; editedInPanelAt?: unknown };
  void [_tokens, _edited];
  return {
    ...(authored as unknown as ActivityInput),
    id,
    origin: (data.origin as AdminActivity["origin"]) ?? "human",
    reviewStatus: (data.reviewStatus as AdminActivity["reviewStatus"]) ?? "reviewed",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Every activity, drafts included (admins only; enforced by the Firestore rules). */
export async function listActivities(): Promise<AdminActivity[]> {
  const snapshot = await getDocs(activities());
  return snapshot.docs.map((d) => fromFirestore(d.id, d.data()));
}

export async function getActivity(id: string): Promise<AdminActivity | null> {
  const snapshot = await getDoc(doc(activities(), id));
  return snapshot.exists() ? fromFirestore(snapshot.id, snapshot.data()) : null;
}

export async function isSlugTaken(slug: string, exceptId: string | null): Promise<boolean> {
  const snapshot = await getDocs(query(activities(), where("slug", "==", slug)));
  return snapshot.docs.some((d) => d.id !== exceptId);
}

type SaveInput = Omit<AdminActivity, "id" | "createdAt" | "updatedAt">;

/** Someone saved the activity after the editor loaded it (spec: gestão completa, RF12). */
export class SaveConflictError extends Error {
  constructor() {
    super("The activity was saved by someone else after it was opened");
  }
}

/** Who saved, shown in the version history. */
export type Author = { uid: string; name: string };

/** catalog/index must stay under Firestore's 1 MiB per document, with margin (RNF03). */
export const MAX_CATALOG_BYTES = 900 * 1024;

export class CatalogTooLargeError extends Error {
  constructor(bytes: number) {
    super(
      `catalog/index would be ${Math.ceil(bytes / 1024)} KB (max ${MAX_CATALOG_BYTES / 1024} KB)`,
    );
  }
}

const revisions = (id: string) => collection(doc(activities(), id), "revisions");

export type SaveOptions = {
  author?: Author;
  /** Overrides the automatic "3 fields changed" (e.g. "Restored from …"). */
  summary?: string;
  /** `updatedAt` the editor loaded; a different one on the server means a conflict. */
  expectedUpdatedAt?: Date | null;
  /** Save anyway ("Overwrite"). */
  force?: boolean;
};

/**
 * Creates or updates an activity, then refreshes catalog/index. Returns the id and the new
 * `updatedAt`. The conflict check and the write happen in one transaction.
 */
export async function saveActivity(
  id: string | null,
  input: SaveInput,
  { expectedUpdatedAt, force = false, author, summary }: SaveOptions = {},
): Promise<{ id: string; updatedAt: Date | null }> {
  const db = getLiteDb();
  const ref = id ? doc(activities(), id) : doc(activities());
  // Firestore rejects undefined; a JSON round-trip drops those keys.
  const data = JSON.parse(JSON.stringify(input)) as SaveInput;
  await runTransaction(db, async (transaction) => {
    const existing = id ? await transaction.get(ref) : null;
    if (existing?.exists() && !force && expectedUpdatedAt !== undefined) {
      const current = toDate(existing.get("updatedAt"))?.getTime() ?? null;
      if (current !== (expectedUpdatedAt?.getTime() ?? null)) throw new SaveConflictError();
    }
    transaction.set(ref, {
      ...data,
      searchTokens: buildSearchTokens(input.title, input.tags),
      createdAt: existing?.exists() ? existing.get("createdAt") : serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Firestore is the source of truth: the seed won't overwrite this edit (RF09).
      editedInPanelAt: serverTimestamp(),
    });
    // Every save is a version that can be restored (RF11).
    transaction.set(doc(revisions(ref.id)), {
      data,
      savedAt: serverTimestamp(),
      savedBy: author ?? null,
      summary: summary ?? revisionSummary(existing?.exists() ? existing.data() : null, data),
    });
  });
  const [saved] = await Promise.all([getDoc(ref), rebuildCatalogIndex(), pruneRevisions(ref.id)]);
  return { id: ref.id, updatedAt: toDate(saved.get("updatedAt")) };
}

/** Keeps the last MAX_REVISIONS versions. */
async function pruneRevisions(id: string) {
  const snapshot = await getDocs(
    query(revisions(id), orderBy("savedAt", "desc"), limit(MAX_REVISIONS + 5)),
  );
  await Promise.all(snapshot.docs.slice(MAX_REVISIONS).map((d) => deleteDoc(d.ref)));
}

export type Revision = {
  id: string;
  savedAt: Date | null;
  savedBy: Author | null;
  summary: string;
  data: SaveInput;
};

export async function listRevisions(id: string): Promise<Revision[]> {
  const snapshot = await getDocs(
    query(revisions(id), orderBy("savedAt", "desc"), limit(MAX_REVISIONS)),
  );
  return snapshot.docs.map((d) => ({
    id: d.id,
    savedAt: toDate(d.get("savedAt")),
    savedBy: (d.get("savedBy") as Author | null) ?? null,
    summary: String(d.get("summary") ?? ""),
    data: d.get("data") as SaveInput,
  }));
}

/** "Restore" saves the old version as a new one, so restoring can be undone too (CA10). */
export async function restoreRevision(id: string, revision: Revision, author?: Author) {
  const when = revision.savedAt?.toLocaleString("en-US") ?? "an earlier version";
  return saveActivity(id, revision.data, { force: true, author, summary: `Restored from ${when}` });
}

/**
 * The same change on many activities (RF13): one batch per 200 activities (2 writes each: the
 * activity and its revision) and a single catalog rebuild at the end (RNF06).
 */
export async function bulkUpdate(
  items: readonly AdminActivity[],
  patch: Partial<SaveInput>,
  { author, summary }: { author?: Author; summary: string },
): Promise<void> {
  const db = getLiteDb();
  for (let i = 0; i < items.length; i += 200) {
    const batch = writeBatch(db);
    for (const item of items.slice(i, i + 200)) {
      const { id, createdAt: _c, updatedAt: _u, ...rest } = item;
      void [_c, _u];
      const data = JSON.parse(JSON.stringify({ ...rest, ...patch })) as SaveInput;
      batch.update(doc(activities(), id), {
        ...JSON.parse(JSON.stringify(patch)),
        updatedAt: serverTimestamp(),
        editedInPanelAt: serverTimestamp(),
      });
      batch.set(doc(revisions(id)), {
        data,
        savedAt: serverTimestamp(),
        savedBy: author ?? null,
        summary,
      });
    }
    await batch.commit();
  }
  await rebuildCatalogIndex();
}

export async function bulkDelete(ids: readonly string[]): Promise<void> {
  for (const id of ids) await removeActivityAndHistory(id);
  await rebuildCatalogIndex();
}

async function removeActivityAndHistory(id: string) {
  const history = await getDocs(revisions(id));
  await Promise.all(history.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(activities(), id));
}

/** Every activity in the content/activities file format, for "Export all" (RF10). */
export async function exportAllActivities(): Promise<Record<string, unknown>[]> {
  const snapshot = await getDocs(activities());
  return snapshot.docs
    .map((d) => toSeedJson(d.data()))
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
}

export async function deleteActivity(id: string): Promise<void> {
  await removeActivityAndHistory(id);
  await rebuildCatalogIndex();
}

/**
 * catalog/index from the published activities, so a change shows up in the catalog right away;
 * static pages and the sitemap follow on the next build (spec: painel admin, RF10).
 */
export async function rebuildCatalogIndex(): Promise<void> {
  const snapshot = await getDocs(query(activities(), where("status", "==", "published")));
  const published = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      data: {
        ...data,
        createdAt: toDate(data.createdAt) ?? new Date(),
        updatedAt: toDate(data.updatedAt) ?? new Date(),
      } as ActivityDoc<Date>,
    };
  });
  // Firestore rejects undefined: a JSON round-trip drops any missing optional field.
  const index = JSON.parse(JSON.stringify(buildCatalogIndex(published))) as CatalogIndex;
  const bytes = jsonBytes(index);
  if (bytes > MAX_CATALOG_BYTES) throw new CatalogTooLargeError(bytes);
  await setDoc(doc(getLiteDb(), CATALOG_COLLECTION, CATALOG_INDEX_DOC), index);
}
