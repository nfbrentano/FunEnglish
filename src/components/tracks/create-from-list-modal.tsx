"use client";

import { ListPlus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Favorite, FavoriteList } from "@/lib/favorites/repository";
import { strings } from "@/lib/strings";

interface CreateFromListModalProps {
  lists: FavoriteList[];
  favorites: Favorite[];
  isOpen: boolean;
  onClose: () => void;
  onCreateFromList: (list: FavoriteList, activityIds: string[]) => Promise<void>;
}

export function CreateFromListModal({
  lists,
  favorites,
  isOpen,
  onClose,
  onCreateFromList,
}: CreateFromListModalProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(
    lists[0]?.id ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getListActivities = (listId: string): string[] => {
    return favorites
      .filter((f) => f.listIds.includes(listId))
      .map((f) => f.activityId);
  };

  const handleCreate = async () => {
    if (!selectedListId) return;
    const list = lists.find((l) => l.id === selectedListId);
    if (!list) return;

    const activityIds = getListActivities(list.id);
    if (activityIds.length === 0) {
      setError("This list has no activities. Choose a list with activities.");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await onCreateFromList(list, activityIds);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating track from list");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-from-list-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <h2 id="create-from-list-title" className="font-display text-xl font-medium text-fg flex items-center gap-2">
            <ListPlus className="size-5 text-accent" />
            <span>{strings.tracks.createFromListTitle}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted hover:bg-primary hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-xs text-fg-secondary">
          {strings.tracks.selectListPrompt}
        </p>

        {error && (
          <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-xs text-error font-medium">
            {error}
          </div>
        )}

        {lists.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong p-4 text-center text-xs text-muted">
            {strings.tracks.noListsAvailable}
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {lists.map((list) => {
              const count = getListActivities(list.id).length;
              const isSelected = selectedListId === list.id;
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => {
                    setSelectedListId(list.id);
                    setError(null);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left text-xs transition-colors ${
                    isSelected
                      ? "border-accent bg-accent/10 text-fg"
                      : "border-border-subtle bg-primary text-fg-secondary hover:border-accent/40"
                  }`}
                >
                  <span className="font-medium text-fg text-sm">{list.name}</span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-border-subtle">
                    {strings.tracks.activitiesCount(count)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
          <Button type="button" variant="ghost" onClick={onClose} disabled={creating}>
            {strings.dashboard.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={creating || !selectedListId || lists.length === 0}
          >
            {creating ? "Creating…" : strings.favorites.create}
          </Button>
        </div>
      </div>
    </div>
  );
}
