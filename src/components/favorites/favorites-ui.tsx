"use client";

import { Heart, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { loginHref } from "@/lib/auth/redirect";
import {
  useFavorites,
  useOptionalFavorites,
  type FavoritesState,
} from "@/lib/favorites/favorites-provider";
import { MAX_LIST_NAME } from "@/lib/favorites/repository";
import { strings } from "@/lib/strings";

type FavoritesUi = {
  openLoginPrompt: () => void;
  openLists: (activityId: string) => void;
};

const FavoritesUiContext = createContext<FavoritesUi | null>(null);

const dialogClasses =
  "m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border-subtle bg-elevated p-0 text-fg backdrop:bg-black/50";

function DialogHeader({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="font-display text-2xl">
        {title}
      </h2>
      <button
        type="button"
        aria-label={strings.settings.close}
        onClick={onClose}
        className="flex size-11 items-center justify-center rounded-full text-fg-secondary hover:text-fg"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

/** One login prompt and one lists dialog for the whole page, opened by any heart. */
export function FavoritesUiProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const loginRef = useRef<HTMLDialogElement>(null);
  const listsRef = useRef<HTMLDialogElement>(null);
  const [listsFor, setListsFor] = useState<string | null>(null);
  const loginTitle = useId();
  const listsTitle = useId();

  const openLoginPrompt = useCallback(() => loginRef.current?.showModal(), []);
  const openLists = useCallback((activityId: string) => {
    setListsFor(activityId);
    listsRef.current?.showModal();
  }, []);
  const value = useMemo(() => ({ openLoginPrompt, openLists }), [openLoginPrompt, openLists]);
  // Back to this page after logging in (the heart clicked is saved then, see rememberForLater).
  const next = pathname;

  return (
    <FavoritesUiContext.Provider value={value}>
      {children}
      <dialog
        ref={loginRef}
        aria-labelledby={loginTitle}
        className={dialogClasses}
        onClick={(event) => event.target === loginRef.current && loginRef.current?.close()}
      >
        <div className="space-y-4 p-6">
          <DialogHeader
            id={loginTitle}
            title={strings.favorites.loginTitle}
            onClose={() => loginRef.current?.close()}
          />
          <p className="text-fg-secondary">{strings.favorites.loginText}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={loginHref(next)}
              className={buttonClasses("primary")}
              onClick={() => loginRef.current?.close()}
            >
              {strings.account.logIn}
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className={buttonClasses("secondary")}
              onClick={() => loginRef.current?.close()}
            >
              {strings.account.signUp}
            </Link>
          </div>
        </div>
      </dialog>
      <dialog
        ref={listsRef}
        aria-labelledby={listsTitle}
        className={dialogClasses}
        onClose={() => setListsFor(null)}
        onClick={(event) => event.target === listsRef.current && listsRef.current?.close()}
      >
        {listsFor && (
          <ListsPanel
            titleId={listsTitle}
            activityId={listsFor}
            onClose={() => listsRef.current?.close()}
          />
        )}
      </dialog>
    </FavoritesUiContext.Provider>
  );
}

function ListsPanel({
  titleId,
  activityId,
  onClose,
}: {
  titleId: string;
  activityId: string;
  onClose: () => void;
}) {
  const { lists, favorites, setInList, createList } = useFavorites();
  const [name, setName] = useState("");
  const inLists = favorites.get(activityId)?.listIds ?? [];

  return (
    <div className="space-y-4 p-6">
      <DialogHeader id={titleId} title={strings.favorites.listsTitle} onClose={onClose} />
      {lists.length === 0 ? (
        <p className="text-sm text-fg-secondary">{strings.favorites.listsEmpty}</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {lists.map((list) => (
            <li key={list.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-secondary">
                <input
                  type="checkbox"
                  checked={inLists.includes(list.id)}
                  onChange={(event) =>
                    void setInList(activityId, list.id, event.target.checked).catch(() => {})
                  }
                  className="size-4 accent-(--accent)"
                />
                {list.name}
              </label>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim()) return;
          const created = await createList(name, activityId).catch(() => null);
          if (created) setName("");
        }}
      >
        <label className="sr-only" htmlFor={`${titleId}-new`}>
          {strings.favorites.newList}
        </label>
        <input
          id={`${titleId}-new`}
          value={name}
          maxLength={MAX_LIST_NAME}
          onChange={(event) => setName(event.target.value)}
          placeholder={strings.favorites.newListPlaceholder}
          className="min-h-11 flex-1 rounded-full border border-border-strong bg-primary px-4 text-sm text-fg placeholder:text-muted focus:border-accent"
        />
        <Button type="submit" variant="secondary" disabled={!name.trim()}>
          <Plus aria-hidden="true" className="size-4" />
          {strings.favorites.create}
        </Button>
      </form>
      <div className="flex justify-end">
        <Button onClick={onClose}>{strings.favorites.done}</Button>
      </div>
    </div>
  );
}

function useFavoritesUi(): FavoritesUi {
  return useContext(FavoritesUiContext) ?? { openLoginPrompt: () => {}, openLists: () => {} };
}

type FavoriteButtonProps = {
  activityId: string;
  title: string;
  className: string;
  iconClassName?: string;
};

/** Heart: toggles a favorite for teachers, invites visitors to log in (spec: favoritos). */
const visitor: Pick<
  FavoritesState,
  "signedIn" | "isFavorite" | "toggleFavorite" | "rememberForLater"
> = {
  signedIn: false,
  isFavorite: () => false,
  toggleFavorite: async () => false,
  rememberForLater: () => {},
};

export function FavoriteButton({
  activityId,
  title,
  className,
  iconClassName = "size-4",
}: FavoriteButtonProps) {
  // Outside the providers (isolated tests) the heart behaves as for a visitor.
  const favorites = useOptionalFavorites() ?? visitor;
  const { openLoginPrompt, openLists } = useFavoritesUi();
  const toast = useToast();
  const active = favorites.isFavorite(activityId);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? strings.favorites.remove(title) : strings.favorites.add(title)}
      onClick={async () => {
        if (!favorites.signedIn) {
          favorites.rememberForLater(activityId);
          openLoginPrompt();
          return;
        }
        const nowFavorite = await favorites.toggleFavorite(activityId).catch(() => active);
        if (nowFavorite && !active) {
          toast(strings.favorites.saved, {
            label: strings.favorites.addToList,
            onClick: () => openLists(activityId),
          });
        }
      }}
      className={className}
    >
      <Heart
        aria-hidden="true"
        className={`${iconClassName} ${active ? "fill-current text-accent" : ""}`}
      />
    </button>
  );
}
