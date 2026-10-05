"use client";

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CatalogItem } from "@/lib/catalog/schema";
import { strings } from "@/lib/strings";
import {
  MAX_TRACK_ACTIVITIES,
  MAX_TRACK_NAME_LENGTH,
  MIN_TRACK_ACTIVITIES,
  type LearningTrack,
} from "@/lib/tracks/types";

interface TrackEditorModalProps {
  initialTrack?: LearningTrack | null;
  initialActivityIds?: string[];
  initialName?: string;
  catalogItems: CatalogItem[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description?: string;
    level?: string;
    activityIds: string[];
    countClassActivities?: boolean;
  }) => Promise<void>;
}

export function TrackEditorModal({
  initialTrack,
  initialActivityIds,
  initialName,
  catalogItems,
  isOpen,
  onClose,
  onSave,
}: TrackEditorModalProps) {
  const [name, setName] = useState(initialTrack?.name ?? initialName ?? "");
  const [description, setDescription] = useState(initialTrack?.description ?? "");
  const [level, setLevel] = useState(initialTrack?.level ?? "");
  const [countClassActivities, setCountClassActivities] = useState(
    initialTrack?.countClassActivities ?? false,
  );
  const [activityIds, setActivityIds] = useState<string[]>(
    initialTrack?.activityIds ?? initialActivityIds ?? [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const publishedCatalog = catalogItems;
  const catalogMap = new Map(publishedCatalog.map((item) => [item.id, item]));

  const filteredSearchResults = searchQuery.trim()
    ? publishedCatalog
        .filter((item) => {
          const query = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(query);
          const matchCat = item.category.toLowerCase().includes(query);
          return (matchTitle || matchCat) && !activityIds.includes(item.id);
        })
        .slice(0, 8)
    : [];

  const handleAddActivity = (id: string) => {
    if (activityIds.length >= MAX_TRACK_ACTIVITIES) {
      setError(strings.tracks.maxActivitiesError);
      return;
    }
    setActivityIds((prev) => [...prev, id]);
    setSearchQuery("");
    setError(null);
  };

  const handleRemoveActivity = (index: number) => {
    setActivityIds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setActivityIds((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1]!;
      copy[index - 1] = copy[index]!;
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= activityIds.length - 1) return;
    setActivityIds((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1]!;
      copy[index + 1] = copy[index]!;
      copy[index] = temp;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(strings.tracks.nameRequiredError);
      return;
    }
    if (activityIds.length < MIN_TRACK_ACTIVITIES) {
      setError(strings.tracks.minActivitiesError);
      return;
    }
    if (activityIds.length > MAX_TRACK_ACTIVITIES) {
      setError(strings.tracks.maxActivitiesError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        name: name.trim().slice(0, MAX_TRACK_NAME_LENGTH),
        description: description.trim() || undefined,
        level: level.trim() || undefined,
        activityIds,
        countClassActivities,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving learning track");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-8 shadow-xl space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle shrink-0">
          <h2 id="track-editor-title" className="font-display text-2xl font-medium text-fg">
            {initialTrack ? strings.tracks.editorTitleEdit : strings.tracks.editorTitleNew}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-muted hover:bg-primary hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto flex-1 pr-1">
          {error && (
            <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-xs text-error font-medium">
              {error}
            </div>
          )}

          {/* Track Name */}
          <div className="space-y-1.5">
            <label htmlFor="track-name" className="text-xs font-semibold text-fg-secondary">
              {strings.tracks.nameLabel} *
            </label>
            <input
              id="track-name"
              type="text"
              required
              maxLength={MAX_TRACK_NAME_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={strings.tracks.namePlaceholder}
              className="w-full rounded-xl border border-border-strong bg-primary px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
            />
          </div>

          {/* Description & Level Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="track-desc" className="text-xs font-semibold text-fg-secondary">
                {strings.tracks.descriptionLabel}
              </label>
              <input
                id="track-desc"
                type="text"
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={strings.tracks.descriptionPlaceholder}
                className="w-full rounded-xl border border-border-strong bg-primary px-3.5 py-2 text-sm text-fg outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="track-level" className="text-xs font-semibold text-fg-secondary">
                {strings.tracks.levelLabel}
              </label>
              <select
                id="track-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              >
                <option value="">{strings.tracks.allLevels}</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Count Class Activities option (D01, RF06b) */}
          <div className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-primary p-3.5">
            <input
              id="count-class-activities"
              type="checkbox"
              checked={countClassActivities}
              onChange={(e) => setCountClassActivities(e.target.checked)}
              className="mt-1 size-4 accent-accent rounded"
            />
            <div className="space-y-0.5">
              <label
                htmlFor="count-class-activities"
                className="text-xs font-semibold text-fg cursor-pointer"
              >
                {strings.tracks.countClassActivities}
              </label>
              <p className="text-[11px] text-muted">
                {strings.tracks.countClassActivitiesHint}
              </p>
            </div>
          </div>

          {/* Activities List Section */}
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-fg-secondary uppercase tracking-wider">
                {strings.tracks.activitiesLabel} ({activityIds.length}/{MAX_TRACK_ACTIVITIES})
              </span>
            </div>

            {/* Selected Activities List */}
            {activityIds.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-strong p-4 text-center text-xs text-muted">
                {strings.tracks.minActivitiesError} Search below to add activities.
              </p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activityIds.map((id, index) => {
                  const item = catalogMap.get(id);
                  return (
                    <li
                      key={`${id}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-primary px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GripVertical className="size-4 text-muted shrink-0" />
                        <span className="flex size-5 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent shrink-0">
                          {index + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-medium text-fg">
                            {item?.title ?? `Activity (${id})`}
                          </span>
                          {item && (
                            <span className="ml-2 text-[11px] text-muted capitalize">
                              · {item.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reorder and remove buttons (CA02) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          aria-label={`${strings.tracks.moveUp} ${index + 1}`}
                          className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === activityIds.length - 1}
                          aria-label={`${strings.tracks.moveDown} ${index + 1}`}
                          className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveActivity(index)}
                          aria-label={`${strings.tracks.removeStep} ${index + 1}`}
                          className="rounded-lg p-1.5 text-muted hover:bg-error/15 hover:text-error"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Search and add activity */}
            {activityIds.length < MAX_TRACK_ACTIVITIES && (
              <div className="space-y-2 pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={strings.tracks.searchActivityPlaceholder}
                    className="w-full rounded-xl border border-border-strong bg-primary pl-9 pr-3.5 py-2 text-xs text-fg outline-none focus:border-accent"
                  />
                </div>

                {filteredSearchResults.length > 0 && (
                  <ul className="rounded-xl border border-border-subtle bg-primary divide-y divide-border-subtle max-h-40 overflow-y-auto">
                    {filteredSearchResults.map((item) => (
                      <li key={item.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-elevated">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-fg truncate">{item.title}</p>
                          <p className="text-[11px] text-muted capitalize">{item.category}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleAddActivity(item.id)}
                          className="h-7 px-2.5 text-xs text-accent"
                        >
                          <Plus className="size-3 mr-1" />
                          <span>{strings.tracks.addActivity}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              {strings.dashboard.cancel}
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim() || activityIds.length === 0}
            >
              {saving ? "Saving…" : strings.dashboard.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
