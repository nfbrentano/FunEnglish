"use client";

import { Clock, Heart, List, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActivityCard } from "@/components/catalog/activity-card";
import { Carousel } from "@/components/catalog/carousel";
import { ClassesSection } from "@/components/dashboard/classes-section";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/use-auth";
import type { CatalogIndex, CatalogItem } from "@/lib/catalog/schema";
import { isNew } from "@/lib/catalog/sections";
import { useCatalogIndex, useClientNow } from "@/lib/catalog/use-catalog-index";
import { useFavorites } from "@/lib/favorites/favorites-provider";
import { MAX_LIST_NAME, type FavoriteList } from "@/lib/favorites/repository";
import {
  firestoreHistory,
  HISTORY_SHOWN,
  type HistoryRepository,
  type PlayRecord,
} from "@/lib/history/history";
import { strings } from "@/lib/strings";

type DashboardViewProps = {
  initial: CatalogIndex;
  imagePaths: string[];
  history?: HistoryRepository;
};

function firstName(user: { displayName: string | null; email: string | null }): string | null {
  return user.displayName?.trim().split(/\s+/)[0] || user.email?.split("@")[0] || null;
}

function Section({
  id,
  title,
  icon,
  aside,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2
          id={`${id}-title`}
          className="flex items-center gap-3 font-display text-3xl font-medium"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-accent">
            {icon}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border-strong p-6">
      <p className="text-fg-secondary">{text}</p>
      <ButtonLink href="/activities" variant="secondary">
        {strings.dashboard.browse}
      </ButtonLink>
    </div>
  );
}

function UnavailableCard({ onRemove }: { onRemove: () => void }) {
  return (
    <article className="flex h-full min-h-48 flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-border-strong p-4">
      <p className="text-fg-secondary">{strings.dashboard.unavailable}</p>
      <Button variant="secondary" onClick={onRemove}>
        {strings.dashboard.remove}
      </Button>
    </article>
  );
}

const grid = "grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

/** The teacher's own page: favorites, class lists and recently played (spec: dashboard). */
export function DashboardView({
  initial,
  imagePaths,
  history = firestoreHistory,
}: DashboardViewProps) {
  const { user } = useAuth();
  const { index } = useCatalogIndex(initial);
  const favorites = useFavorites();
  const now = useClientNow();
  const images = useMemo(() => new Set(imagePaths), [imagePaths]);
  const byId = useMemo(() => new Map(index.items.map((item) => [item.id, item])), [index.items]);
  const [recent, setRecent] = useState<PlayRecord[] | null>(null);
  const [openList, setOpenList] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    history
      .load(user.uid)
      .then((records) => active && setRecent(records))
      .catch((error: unknown) => {
        console.warn("Could not load history", error);
        if (active) setRecent([]);
      });
    return () => {
      active = false;
    };
  }, [user, history]);

  const card = (item: CatalogItem) => (
    <ActivityCard
      item={item}
      imageAvailable={images.has(item.thumbnail.src)}
      isNew={now !== null && isNew(item.createdAt, now)}
    />
  );

  const favoriteEntries = [...favorites.favorites.values()].sort(
    (a, b) => b.addedAt.getTime() - a.addedAt.getTime(),
  );
  const name = user ? firstName(user) : null;
  const recentItems = (recent ?? [])
    .map((record) => byId.get(record.activityId))
    .filter((item): item is CatalogItem => item !== undefined)
    .slice(0, HISTORY_SHOWN);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-14 px-4 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-5xl font-medium">
          {name ? strings.dashboard.welcome(name) : strings.dashboard.welcomeAnonymous}
        </h1>
        <p className="text-fg-secondary">{strings.dashboard.subtitle}</p>
        <nav aria-label={strings.dashboard.sectionsNav} className="flex flex-wrap gap-2 pt-2">
          {[
            ["classes", strings.dashboard.classes],
            ["favorites", strings.dashboard.favorites],
            ["lists", strings.dashboard.lists],
            ["recent", strings.dashboard.recent],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-border-subtle px-4 py-2 text-sm hover:border-accent"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <ClassesSection />

      <Section
        id="favorites"
        title={strings.dashboard.favorites}
        icon={<Heart aria-hidden="true" className="size-5" />}
        aside={
          favorites.ready && (
            <span className="text-sm text-muted">
              {strings.dashboard.favoritesCount(favoriteEntries.length)}
            </span>
          )
        }
      >
        {!favorites.ready ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : favoriteEntries.length === 0 ? (
          <Empty text={strings.dashboard.emptyFavorites} />
        ) : (
          <ul className={grid}>
            {favoriteEntries.map((favorite) => {
              const item = byId.get(favorite.activityId);
              return (
                <li key={favorite.activityId}>
                  {item ? (
                    card(item)
                  ) : (
                    <UnavailableCard
                      onRemove={() =>
                        void favorites.toggleFavorite(favorite.activityId).catch(() => {})
                      }
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        id="lists"
        title={strings.dashboard.lists}
        icon={<List aria-hidden="true" className="size-5" />}
      >
        {!favorites.ready ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : favorites.lists.length === 0 ? (
          <Empty text={strings.dashboard.emptyLists} />
        ) : (
          <ul className="space-y-3">
            {favorites.lists.map((list) => (
              <ListRow
                key={list.id}
                list={list}
                open={openList === list.id}
                onToggle={() => setOpenList(openList === list.id ? null : list.id)}
                items={favoriteEntries
                  .filter((f) => f.listIds.includes(list.id))
                  .map((f) => byId.get(f.activityId))}
                renderCard={card}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        id="recent"
        title={strings.dashboard.recent}
        icon={<Clock aria-hidden="true" className="size-5" />}
      >
        {recent === null ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : recentItems.length === 0 ? (
          <Empty text={strings.dashboard.emptyRecent} />
        ) : (
          <Carousel label={strings.dashboard.recent}>
            {recentItems.map((item) => card(item))}
          </Carousel>
        )}
      </Section>
    </div>
  );
}

function ListRow({
  list,
  open,
  onToggle,
  items,
  renderCard,
}: {
  list: FavoriteList;
  open: boolean;
  onToggle: () => void;
  items: (CatalogItem | undefined)[];
  renderCard: (item: CatalogItem) => React.ReactNode;
}) {
  const { renameList, deleteList } = useFavorites();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const available = items.filter((item): item is CatalogItem => item !== undefined);
  const panelId = `list-${list.id}`;

  return (
    <li className="rounded-2xl border border-border-subtle bg-elevated">
      <div className="flex flex-wrap items-center gap-3 p-4">
        {editing ? (
          <form
            className="flex flex-1 flex-wrap gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              await renameList(list.id, name).catch(() => {});
              setEditing(false);
            }}
          >
            <label htmlFor={`${panelId}-name`} className="sr-only">
              {strings.dashboard.renameList(list.name)}
            </label>
            <input
              id={`${panelId}-name`}
              value={name}
              maxLength={MAX_LIST_NAME}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              className="min-h-11 flex-1 rounded-full border border-border-strong bg-primary px-4 text-fg focus:border-accent"
            />
            <Button type="submit" disabled={!name.trim()}>
              {strings.dashboard.save}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setName(list.name);
                setEditing(false);
              }}
            >
              {strings.dashboard.cancel}
            </Button>
          </form>
        ) : (
          <>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={open ? strings.dashboard.close : strings.dashboard.open(list.name)}
              onClick={onToggle}
              className="flex flex-1 items-baseline gap-3 text-left"
            >
              <span className="font-display text-2xl">{list.name}</span>
              <span className="text-sm text-muted">
                {strings.dashboard.listCount(available.length)}
              </span>
            </button>
            <Button
              variant="ghost"
              aria-label={strings.dashboard.renameList(list.name)}
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">{strings.dashboard.rename}</span>
            </Button>
            <Button
              variant="ghost"
              aria-label={strings.dashboard.deleteList(list.name)}
              onClick={() => {
                if (window.confirm(strings.dashboard.confirmDelete(list.name)))
                  void deleteList(list.id).catch(() => {});
              }}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">{strings.dashboard.delete}</span>
            </Button>
          </>
        )}
      </div>
      {open && (
        <div id={panelId} className="border-t border-border-subtle p-4">
          {available.length === 0 ? (
            <p className="text-sm text-fg-secondary">{strings.dashboard.emptyList}</p>
          ) : (
            <ul className={grid}>
              {available.map((item) => (
                <li key={item.id}>{renderCard(item)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
