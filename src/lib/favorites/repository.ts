"use client";

import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore/lite";
import { getLiteDb } from "../firebase";
import { USERS_COLLECTION } from "../auth/profile";

export const MAX_FAVORITES = 1000;
export const MAX_LISTS = 50;
export const MAX_LIST_NAME = 60;

export type Favorite = { activityId: string; addedAt: Date; listIds: string[] };
export type FavoriteList = { id: string; name: string; createdAt: Date; order: number };

/** Storage of a teacher's favorites and lists. Swappable in tests. */
export type FavoritesRepository = {
  load(uid: string): Promise<{ favorites: Favorite[]; lists: FavoriteList[] }>;
  addFavorite(uid: string, activityId: string, listIds: string[]): Promise<void>;
  removeFavorite(uid: string, activityId: string): Promise<void>;
  setFavoriteLists(uid: string, activityId: string, listIds: string[]): Promise<void>;
  createList(uid: string, list: Omit<FavoriteList, "createdAt">): Promise<void>;
  renameList(uid: string, listId: string, name: string): Promise<void>;
  /** Deletes the list and takes it off its favorites; the favorites themselves stay. */
  deleteList(uid: string, listId: string, favoriteIds: string[]): Promise<void>;
};

const toDate = (value: unknown) =>
  value && typeof (value as { toDate?: () => Date }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate()
    : new Date();

const favoritesOf = (uid: string) => collection(getLiteDb(), USERS_COLLECTION, uid, "favorites");
const listsOf = (uid: string) => collection(getLiteDb(), USERS_COLLECTION, uid, "lists");

/** Firestore: users/{uid}/favorites/{activityId} and users/{uid}/lists/{listId}. */
export const firestoreFavorites: FavoritesRepository = {
  async load(uid) {
    // Two queries per session, shared by every heart on every page (spec: favoritos, RF07).
    const [favorites, lists] = await Promise.all([
      getDocs(favoritesOf(uid)),
      getDocs(listsOf(uid)),
    ]);
    return {
      favorites: favorites.docs.map((d) => ({
        activityId: d.id,
        addedAt: toDate(d.get("addedAt")),
        listIds: (d.get("listIds") as string[] | undefined) ?? [],
      })),
      lists: lists.docs
        .map((d) => ({
          id: d.id,
          name: String(d.get("name")),
          createdAt: toDate(d.get("createdAt")),
          order: Number(d.get("order") ?? 0),
        }))
        .sort((a, b) => a.order - b.order),
    };
  },
  async addFavorite(uid, activityId, listIds) {
    await setDoc(doc(favoritesOf(uid), activityId), { addedAt: serverTimestamp(), listIds });
  },
  async removeFavorite(uid, activityId) {
    await deleteDoc(doc(favoritesOf(uid), activityId));
  },
  async setFavoriteLists(uid, activityId, listIds) {
    await updateDoc(doc(favoritesOf(uid), activityId), { listIds });
  },
  async createList(uid, list) {
    await setDoc(doc(listsOf(uid), list.id), {
      name: list.name,
      order: list.order,
      createdAt: serverTimestamp(),
    });
  },
  async renameList(uid, listId, name) {
    await updateDoc(doc(listsOf(uid), listId), { name });
  },
  async deleteList(uid, listId, favoriteIds) {
    const batch = writeBatch(getLiteDb());
    batch.delete(doc(listsOf(uid), listId));
    for (const id of favoriteIds)
      batch.update(doc(favoritesOf(uid), id), { listIds: arrayRemove(listId) });
    await batch.commit();
  },
};
