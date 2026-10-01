"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore/lite";
import { USERS_COLLECTION } from "../auth/profile";
import { getLiteDb } from "../firebase";

export const HISTORY_SHOWN = 20;
export const HISTORY_KEPT = 50;

export type PlayRecord = { activityId: string; lastPlayedAt: Date };

/** "Recently played": users/{uid}/history/{activityId} (spec: dashboard, RF05). Swappable in tests. */
export type HistoryRepository = {
  record(uid: string, activityId: string): Promise<void>;
  /** Newest first; trims anything beyond the 50 most recent. */
  load(uid: string): Promise<PlayRecord[]>;
};

const historyOf = (uid: string) => collection(getLiteDb(), USERS_COLLECTION, uid, "history");

export const firestoreHistory: HistoryRepository = {
  async record(uid, activityId) {
    // One document per activity: playing it again just moves it to the top.
    await setDoc(doc(historyOf(uid), activityId), { lastPlayedAt: serverTimestamp() });
  },
  async load(uid) {
    const snapshot = await getDocs(historyOf(uid));
    const records = snapshot.docs
      .map((d) => {
        const value = d.get("lastPlayedAt") as { toDate?: () => Date } | null;
        return { activityId: d.id, lastPlayedAt: value?.toDate?.() ?? new Date() };
      })
      .sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime());
    // Trim lazily here, instead of paying extra reads on every play.
    await Promise.all(
      records.slice(HISTORY_KEPT).map((r) => deleteDoc(doc(historyOf(uid), r.activityId))),
    );
    return records.slice(0, HISTORY_KEPT);
  },
};
