"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore/lite";
import { ACTIVITIES_COLLECTION } from "../activities/collections";
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
  return {
    ...(data as unknown as ActivityInput),
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

/** Creates or updates an activity, then refreshes catalog/index. Returns the id. */
export async function saveActivity(id: string | null, input: SaveInput): Promise<string> {
  const ref = id ? doc(activities(), id) : doc(activities());
  const existing = id ? await getDoc(ref) : null;
  // Firestore rejects undefined; a JSON round-trip drops those keys.
  const data = JSON.parse(JSON.stringify(input)) as SaveInput;
  await setDoc(ref, {
    ...data,
    searchTokens: buildSearchTokens(input.title, input.tags),
    createdAt: existing?.exists() ? existing.get("createdAt") : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await rebuildCatalogIndex();
  return ref.id;
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
