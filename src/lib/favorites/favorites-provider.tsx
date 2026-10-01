"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "../auth/use-auth";
import { strings } from "../strings";
import {
  firestoreFavorites,
  MAX_FAVORITES,
  MAX_LIST_NAME,
  MAX_LISTS,
  type Favorite,
  type FavoriteList,
  type FavoritesRepository,
} from "./repository";

const PENDING_KEY = "fun-english:pending-favorite";

export type FavoritesState = {
  signedIn: boolean;
  ready: boolean;
  favorites: Map<string, Favorite>;
  lists: FavoriteList[];
  isFavorite: (activityId: string) => boolean;
  /** Returns the new state (true = now a favorite). Optimistic; rolls back on failure. */
  toggleFavorite: (activityId: string) => Promise<boolean>;
  setInList: (activityId: string, listId: string, inList: boolean) => Promise<void>;
  /** Creates a list (and adds the activity to it, if given). Returns null if not allowed. */
  createList: (name: string, activityId?: string) => Promise<string | null>;
  renameList: (listId: string, name: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  /** Visitors: remember the heart they clicked, to save it right after they log in. */
  rememberForLater: (activityId: string) => void;
};

const FavoritesContext = createContext<FavoritesState | null>(null);

function newListId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function FavoritesProvider({
  children,
  repository = firestoreFavorites,
}: {
  children: ReactNode;
  repository?: FavoritesRepository;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const uid = user?.uid ?? null;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Map<string, Favorite>>(new Map());
  const [lists, setLists] = useState<FavoriteList[]>([]);
  // A different teacher on this tab starts empty (the load below merges into what's on screen).
  const [stateFor, setStateFor] = useState(uid);
  if (stateFor !== uid) {
    setStateFor(uid);
    setFavorites(new Map());
    setLists([]);
  }
  // Latest values for the callbacks (kept stable, so hearts don't re-render on every change).
  const latest = useRef({ favorites, lists });
  useEffect(() => {
    latest.current = { favorites, lists };
  }, [favorites, lists]);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    repository
      .load(uid)
      .then(async (data) => {
        if (!active) return;
        const map = new Map(data.favorites.map((f) => [f.activityId, f]));
        // A heart clicked before logging in.
        let pending: string | null = null;
        try {
          pending = sessionStorage.getItem(PENDING_KEY);
          sessionStorage.removeItem(PENDING_KEY);
        } catch {}
        if (pending && !map.has(pending)) {
          map.set(pending, { activityId: pending, addedAt: new Date(), listIds: [] });
          repository.addFavorite(uid, pending, []).catch(() => toast(strings.favorites.saveError));
          toast(strings.favorites.saved);
        }
        // Keep what the teacher did while this was loading (a heart clicked right after login);
        // the server's copy wins when both have the same activity or list.
        setFavorites((onScreen) => new Map([...onScreen, ...map]));
        setLists((onScreen) => [
          ...data.lists,
          ...onScreen.filter((list) => !data.lists.some((l) => l.id === list.id)),
        ]);
        setLoadedFor(uid);
      })
      .catch((error: unknown) => console.warn("Could not load favorites", error));
    return () => {
      active = false;
    };
  }, [uid, repository, toast]);

  const ready = uid !== null && loadedFor === uid;

  /** Applies a change now and undoes it if saving fails. */
  const optimistic = useCallback(
    async (apply: () => void, undo: () => void, save: () => Promise<void>) => {
      apply();
      try {
        await save();
      } catch (error) {
        console.warn("Could not save favorites", error);
        undo();
        toast(strings.favorites.saveError);
        throw error;
      }
    },
    [toast],
  );

  const toggleFavorite = useCallback(
    async (activityId: string) => {
      if (!uid) return false;
      const current = latest.current.favorites;
      const previous = current.get(activityId);
      if (previous) {
        await optimistic(
          () => setFavorites((m) => withoutKey(m, activityId)),
          () => setFavorites((m) => new Map(m).set(activityId, previous)),
          () => repository.removeFavorite(uid, activityId),
        );
        return false;
      }
      if (current.size >= MAX_FAVORITES) {
        toast(strings.favorites.favoritesLimit(MAX_FAVORITES));
        return false;
      }
      const favorite = { activityId, addedAt: new Date(), listIds: [] };
      await optimistic(
        () => setFavorites((m) => new Map(m).set(activityId, favorite)),
        () => setFavorites((m) => withoutKey(m, activityId)),
        () => repository.addFavorite(uid, activityId, []),
      );
      return true;
    },
    [uid, repository, optimistic, toast],
  );

  const setInList = useCallback(
    async (activityId: string, listId: string, inList: boolean) => {
      if (!uid) return;
      const favorite = latest.current.favorites.get(activityId);
      if (!favorite) return;
      const listIds = inList
        ? [...new Set([...favorite.listIds, listId])]
        : favorite.listIds.filter((id) => id !== listId);
      await optimistic(
        () => setFavorites((m) => new Map(m).set(activityId, { ...favorite, listIds })),
        () => setFavorites((m) => new Map(m).set(activityId, favorite)),
        () => repository.setFavoriteLists(uid, activityId, listIds),
      );
    },
    [uid, repository, optimistic],
  );

  const createList = useCallback(
    async (rawName: string, activityId?: string) => {
      const name = rawName.trim().slice(0, MAX_LIST_NAME);
      if (!uid || !name) return null;
      const current = latest.current.lists;
      if (current.length >= MAX_LISTS) {
        toast(strings.favorites.listsLimit(MAX_LISTS));
        return null;
      }
      const list = { id: newListId(), name, order: current.length, createdAt: new Date() };
      await optimistic(
        () => setLists((all) => [...all, list]),
        () => setLists((all) => all.filter((l) => l.id !== list.id)),
        () => repository.createList(uid, list),
      );
      if (activityId) await setInList(activityId, list.id, true);
      return list.id;
    },
    [uid, repository, optimistic, setInList, toast],
  );

  const renameList = useCallback(
    async (listId: string, rawName: string) => {
      const name = rawName.trim().slice(0, MAX_LIST_NAME);
      const previous = latest.current.lists.find((l) => l.id === listId);
      if (!uid || !name || !previous) return;
      await optimistic(
        () => setLists((all) => all.map((l) => (l.id === listId ? { ...l, name } : l))),
        () => setLists((all) => all.map((l) => (l.id === listId ? previous : l))),
        () => repository.renameList(uid, listId, name),
      );
    },
    [uid, repository, optimistic],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      const { lists: currentLists, favorites: currentFavorites } = latest.current;
      const list = currentLists.find((l) => l.id === listId);
      if (!uid || !list) return;
      const inList = [...currentFavorites.values()].filter((f) => f.listIds.includes(listId));
      await optimistic(
        () => {
          setLists((all) => all.filter((l) => l.id !== listId));
          setFavorites((m) => {
            const next = new Map(m);
            for (const f of inList)
              next.set(f.activityId, { ...f, listIds: f.listIds.filter((id) => id !== listId) });
            return next;
          });
        },
        () => {
          setLists((all) => [...all, list].sort((a, b) => a.order - b.order));
          setFavorites((m) => {
            const next = new Map(m);
            for (const f of inList) next.set(f.activityId, f);
            return next;
          });
        },
        () =>
          repository.deleteList(
            uid,
            listId,
            inList.map((f) => f.activityId),
          ),
      );
    },
    [uid, repository, optimistic],
  );

  const value = useMemo<FavoritesState>(
    () => ({
      signedIn: uid !== null,
      ready,
      favorites: uid ? favorites : new Map(),
      lists: uid ? lists : [],
      isFavorite: (id) => uid !== null && favorites.has(id),
      toggleFavorite,
      setInList,
      createList,
      renameList,
      deleteList,
      rememberForLater: (id) => {
        try {
          sessionStorage.setItem(PENDING_KEY, id);
        } catch {}
      },
    }),
    [ready, uid, favorites, lists, toggleFavorite, setInList, createList, renameList, deleteList],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

function withoutKey<K, V>(map: Map<K, V>, key: K): Map<K, V> {
  const next = new Map(map);
  next.delete(key);
  return next;
}

export function useFavorites(): FavoritesState {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return context;
}

/** Same as useFavorites, but returns null outside the provider (e.g. isolated component tests). */
export function useOptionalFavorites(): FavoritesState | null {
  return useContext(FavoritesContext);
}
