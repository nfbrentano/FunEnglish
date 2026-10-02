"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore/lite";
import { ACTIVITIES_COLLECTION } from "../activities/collections";
import { toSeedJson } from "../activities/export";
import type { ActivityDoc, ActivityInput } from "../activities/schema/activity";
import { buildSearchTokens } from "../activities/search";
import { buildCatalogIndex } from "../catalog/sections";
import { CATALOG_COLLECTION, CATALOG_INDEX_DOC } from "../catalog/schema";
import { getLiteDb } from "../firebase";

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

export type SaveOptions = {
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
  { expectedUpdatedAt, force = false }: SaveOptions = {},
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
  });
  const [saved] = await Promise.all([getDoc(ref), rebuildCatalogIndex()]);
  return { id: ref.id, updatedAt: toDate(saved.get("updatedAt")) };
}

/** Every activity in the content/activities file format, for "Export all" (RF10). */
export async function exportAllActivities(): Promise<Record<string, unknown>[]> {
  const snapshot = await getDocs(activities());
  return snapshot.docs
    .map((d) => toSeedJson(d.data()))
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
}

export async function deleteActivity(id: string): Promise<void> {
  await deleteDoc(doc(activities(), id));
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
  await setDoc(
    doc(getLiteDb(), CATALOG_COLLECTION, CATALOG_INDEX_DOC),
    buildCatalogIndex(published),
  );
}
