"use client";

import {
  Grid,
  ListPlus,
  Milestone,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import type { CatalogItem } from "@/lib/catalog/schema";
import { useCatalogIndex } from "@/lib/catalog/use-catalog-index";
import { useClasses } from "@/lib/classes/use-classes";
import { useFavorites } from "@/lib/favorites/favorites-provider";
import type { FavoriteList } from "@/lib/favorites/repository";
import { strings } from "@/lib/strings";
import {
  assignTrackToStudents,
  createTrack,
  createTrackFromList,
  deleteTrack,
  getTeacherTracks,
  updateTrack,
} from "@/lib/tracks/repository";
import type { LearningTrack } from "@/lib/tracks/types";
import { AssignTrackModal } from "./assign-track-modal";
import { ClassMatrixModal } from "./class-matrix-modal";
import { CreateFromListModal } from "./create-from-list-modal";
import { TrackEditorModal } from "./track-editor-modal";

interface TracksSectionProps {
  initialCatalog?: CatalogItem[];
}

export function TracksSection({ initialCatalog = [] }: TracksSectionProps) {
  const { user } = useAuth();
  const { classes, students } = useClasses();
  const favorites = useFavorites();
  const { index } = useCatalogIndex();
  const toast = useToast();

  const [tracks, setTracks] = useState<LearningTrack[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [editingTrack, setEditingTrack] = useState<LearningTrack | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isFromListOpen, setIsFromListOpen] = useState(false);
  const [assigningTrack, setAssigningTrack] = useState<LearningTrack | null>(null);
  const [matrixTrack, setMatrixTrack] = useState<LearningTrack | null>(null);

  const catalogItems = index.items.length > 0 ? index.items : initialCatalog;

  const loadTracks = async (uid: string) => {
    try {
      setLoading(true);
      const list = await getTeacherTracks(uid);
      setTracks(list);
    } catch (err) {
      console.warn("Could not load teacher tracks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadTracks(user.uid);
  }, [user]);

  const handleSaveTrack = async (data: {
    name: string;
    description?: string;
    level?: string;
    activityIds: string[];
    countClassActivities?: boolean;
  }) => {
    if (!user) return;
    if (editingTrack) {
      await updateTrack(user.uid, editingTrack.id, data);
      toast("Learning track updated!");
    } else {
      await createTrack(user.uid, data);
      toast("Learning track created!");
    }
    await loadTracks(user.uid);
  };

  const handleCreateFromList = async (list: FavoriteList, activityIds: string[]) => {
    if (!user) return;
    await createTrackFromList(user.uid, list, activityIds);
    toast(`Learning track "${list.name}" created with ${activityIds.length} activities!`);
    await loadTracks(user.uid);
  };

  const handleAssignTrack = async (
    track: LearningTrack,
    studentIds: string[],
    classIds: string[],
  ) => {
    if (!user) return;
    await assignTrackToStudents(user.uid, track, studentIds, classIds);
    toast(strings.tracks.assignSuccess);
    await loadTracks(user.uid);
  };

  const handleDeleteTrack = async (track: LearningTrack) => {
    if (!user) return;
    if (!window.confirm(strings.tracks.confirmDelete(track.name))) return;

    try {
      await deleteTrack(user.uid, track.id);
      toast("Track deleted");
      await loadTracks(user.uid);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error deleting track");
    }
  };

  return (
    <section id="tracks" aria-labelledby="tracks-title" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="tracks-title" className="flex items-center gap-3 font-display text-3xl font-medium">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-accent">
            <Milestone aria-hidden="true" className="size-5" />
          </span>
          {strings.tracks.title}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {favorites.lists.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setIsFromListOpen(true)}
              className="min-h-10 text-xs"
            >
              <ListPlus className="size-4 mr-1.5 text-accent" />
              <span>{strings.tracks.createFromList}</span>
            </Button>
          )}

          <Button
            onClick={() => {
              setEditingTrack(null);
              setIsEditorOpen(true);
            }}
            className="min-h-10 text-xs"
          >
            <Plus className="size-4 mr-1.5" />
            <span>{strings.tracks.newTrack}</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border-strong p-8">
          <p className="text-sm text-fg-secondary">{strings.tracks.emptyTracks}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setEditingTrack(null);
                setIsEditorOpen(true);
              }}
            >
              <Plus className="size-4 mr-1.5" />
              <span>{strings.tracks.newTrack}</span>
            </Button>
            {favorites.lists.length > 0 && (
              <Button variant="secondary" onClick={() => setIsFromListOpen(true)}>
                <ListPlus className="size-4 mr-1.5" />
                <span>{strings.tracks.createFromList}</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.map((track) => {
            const classCount = track.assignedClassIds?.length ?? 0;
            const studentCount = track.assignedStudentIds?.length ?? 0;

            return (
              <li
                key={track.id}
                className="flex flex-col justify-between rounded-2xl border border-border-subtle bg-elevated p-5 sm:p-6 space-y-4 hover:border-accent/40 transition-colors shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-xl font-medium text-fg">{track.name}</h3>
                        {track.level && (
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-fg-secondary uppercase tracking-wider border border-border-subtle">
                            {track.level}
                          </span>
                        )}
                      </div>
                      {track.description && (
                        <p className="text-xs text-fg-secondary line-clamp-2">{track.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted">
                    <span className="font-medium text-fg">
                      {strings.tracks.activitiesCount(track.activityIds.length)}
                    </span>
                    <span>·</span>
                    <span>{strings.tracks.assignedCount(classCount, studentCount)}</span>
                    {track.countClassActivities && (
                      <>
                        <span>·</span>
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          Class auto-check
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border-subtle">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="ghost"
                      onClick={() => setAssigningTrack(track)}
                      className="h-8 px-2.5 text-xs text-accent"
                      title={strings.tracks.assignTrack}
                    >
                      <UserPlus className="size-3.5 mr-1" />
                      <span>{strings.tracks.assignTrack}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => setMatrixTrack(track)}
                      className="h-8 px-2.5 text-xs"
                      title={strings.tracks.classMatrix}
                    >
                      <Grid className="size-3.5 mr-1" />
                      <span>{strings.tracks.classMatrix}</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingTrack(track);
                        setIsEditorOpen(true);
                      }}
                      className="size-8 p-0"
                      title={strings.tracks.editTrack}
                      aria-label={`${strings.tracks.editTrack} ${track.name}`}
                    >
                      <Pencil className="size-3.5 text-muted hover:text-fg" />
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteTrack(track)}
                      className="size-8 p-0 hover:text-error hover:bg-error/15"
                      title={strings.tracks.deleteTrack}
                      aria-label={`${strings.tracks.deleteTrack} ${track.name}`}
                    >
                      <Trash2 className="size-3.5 text-muted hover:text-error" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <TrackEditorModal
          initialTrack={editingTrack}
          catalogItems={catalogItems}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingTrack(null);
          }}
          onSave={handleSaveTrack}
        />
      )}

      {/* Create from list modal */}
      {isFromListOpen && (
        <CreateFromListModal
          lists={favorites.lists}
          favorites={Array.from(favorites.favorites.values())}
          isOpen={isFromListOpen}
          onClose={() => setIsFromListOpen(false)}
          onCreateFromList={handleCreateFromList}
        />
      )}

      {/* Assign modal */}
      {assigningTrack && (
        <AssignTrackModal
          track={assigningTrack}
          classes={classes}
          students={students}
          isOpen={Boolean(assigningTrack)}
          onClose={() => setAssigningTrack(null)}
          onAssign={handleAssignTrack}
        />
      )}

      {/* Class Matrix modal */}
      {matrixTrack && (
        <ClassMatrixModal
          track={matrixTrack}
          classes={classes}
          allStudents={students}
          catalogItems={catalogItems}
          isOpen={Boolean(matrixTrack)}
          onClose={() => setMatrixTrack(null)}
        />
      )}
    </section>
  );
}
