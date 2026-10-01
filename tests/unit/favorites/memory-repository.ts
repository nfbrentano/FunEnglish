import { vi } from "vitest";
import type { Favorite, FavoriteList, FavoritesRepository } from "@/lib/favorites/repository";

/** In-memory FavoritesRepository; `fail` makes the next write reject (to test rollbacks). */
export function memoryRepository(initial: { favorites?: Favorite[]; lists?: FavoriteList[] } = {}) {
  const favorites = new Map((initial.favorites ?? []).map((f) => [f.activityId, f]));
  const lists = new Map((initial.lists ?? []).map((l) => [l.id, l]));
  const state = { fail: false };
  const write = async (fn: () => void) => {
    if (state.fail) {
      state.fail = false;
      throw new Error("offline");
    }
    fn();
  };
  const repository: FavoritesRepository = {
    load: vi.fn(async () => ({ favorites: [...favorites.values()], lists: [...lists.values()] })),
    addFavorite: vi.fn((_uid, id, listIds) =>
      write(() => favorites.set(id, { activityId: id, addedAt: new Date(), listIds })),
    ),
    removeFavorite: vi.fn((_uid, id) => write(() => favorites.delete(id))),
    setFavoriteLists: vi.fn((_uid, id, listIds) =>
      write(() => favorites.set(id, { ...favorites.get(id)!, listIds })),
    ),
    createList: vi.fn((_uid, list) =>
      write(() => lists.set(list.id, { ...list, createdAt: new Date() })),
    ),
    renameList: vi.fn((_uid, id, name) => write(() => lists.set(id, { ...lists.get(id)!, name }))),
    deleteList: vi.fn((_uid, id, favoriteIds) =>
      write(() => {
        lists.delete(id);
        for (const fid of favoriteIds) {
          const f = favorites.get(fid)!;
          favorites.set(fid, { ...f, listIds: f.listIds.filter((l) => l !== id) });
        }
      }),
    ),
  };
  return { repository, favorites, lists, state };
}
