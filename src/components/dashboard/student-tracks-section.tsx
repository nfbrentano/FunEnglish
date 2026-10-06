"use client";

import {
  Check,
  Circle,
  Milestone,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import { useCatalogIndex } from "@/lib/catalog/use-catalog-index";
import { strings } from "@/lib/strings";
import { calculateTrackProgress } from "@/lib/tracks/progress";
import {
  assignTrackToStudents,
  getStudentTracks,
  getTeacherTracks,
  setStepCompletion,
  unassignTrackFromStudent,
} from "@/lib/tracks/repository";
import type { LearningTrack, StudentTrackProgress } from "@/lib/tracks/types";

interface StudentTracksSectionProps {
  studentId: string;
  studentName: string;
}

export function StudentTracksSection({ studentId, studentName }: StudentTracksSectionProps) {
  const { user } = useAuth();
  const { index } = useCatalogIndex();
  const toast = useToast();

  const [studentTracks, setStudentTracks] = useState<StudentTrackProgress[]>([]);
  const [teacherTracks, setTeacherTracks] = useState<LearningTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTrackIdToAssign, setSelectedTrackIdToAssign] = useState<string>("");

  const catalogMap = new Map(index.items.map((item) => [item.id, item]));

  const loadData = async () => {
    if (!studentId || !user) return;
    try {
      setLoading(true);
      const [tracksForStudent, allTeacherTracks] = await Promise.all([
        getStudentTracks(studentId),
        getTeacherTracks(user.uid),
      ]);
      setStudentTracks(tracksForStudent);
      setTeacherTracks(allTeacherTracks);
    } catch (err) {
      console.warn("Could not load student tracks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, user]);

  const handleToggleStep = async (
    trackId: string,
    activityId: string,
    currentlyCompleted: boolean,
  ) => {
    try {
      // Optimistic update
      setStudentTracks((prev) =>
        prev.map((t) => {
          if (t.trackId !== trackId) return t;
          const newCompleted = { ...t.completed };
          if (currentlyCompleted) {
            delete newCompleted[activityId];
          } else {
            newCompleted[activityId] = {
              at: new Date().toISOString(),
              source: "manual",
            };
          }
          return { ...t, completed: newCompleted };
        }),
      );

      await setStepCompletion(studentId, trackId, activityId, !currentlyCompleted, "manual");
    } catch (err) {
      toast("Error updating step completion");
      console.warn("handleToggleStep err:", err);
      loadData();
    }
  };

  const handleUnassignTrack = async (track: StudentTrackProgress) => {
    if (!user) return;
    if (!window.confirm(strings.tracks.confirmUnassign(track.trackName))) return;

    try {
      await unassignTrackFromStudent(user.uid, track.trackId, studentId);
      toast("Track unassigned");
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error unassigning track");
    }
  };

  const handleAssignNewTrack = async () => {
    if (!user || !selectedTrackIdToAssign) return;
    const targetTrack = teacherTracks.find((t) => t.id === selectedTrackIdToAssign);
    if (!targetTrack) return;

    try {
      await assignTrackToStudents(user.uid, targetTrack, [studentId]);
      toast(strings.tracks.assignSuccess);
      setIsAssigning(false);
      setSelectedTrackIdToAssign("");
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error assigning track");
    }
  };

  const unassignedTeacherTracks = teacherTracks.filter(
    (tt) => !studentTracks.some((st) => st.trackId === tt.id),
  );

  return (
    <section id="progress" className="rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-8 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <h3 className="flex items-center gap-3 font-display text-2xl font-medium text-fg">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent-muted text-accent">
            <Milestone className="size-4" />
          </span>
          {strings.student.progressSectionTitle}
        </h3>

        {!isAssigning && unassignedTeacherTracks.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setIsAssigning(true)}
            className="h-9 px-3 text-xs text-accent"
          >
            <Plus className="size-3.5 mr-1" />
            <span>Assign track</span>
          </Button>
        )}
      </div>

      {/* Quick assign widget */}
      {isAssigning && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex-1 min-w-48">
            <label htmlFor="select-track-to-assign" className="sr-only">
              Select track
            </label>
            <select
              id="select-track-to-assign"
              value={selectedTrackIdToAssign}
              onChange={(e) => setSelectedTrackIdToAssign(e.target.value)}
              className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-xs font-medium text-fg outline-none focus:border-accent"
            >
              <option value="">-- Choose a learning track to assign --</option>
              {unassignedTeacherTracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.activityIds.length} activities)
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleAssignNewTrack}
              disabled={!selectedTrackIdToAssign}
              className="h-8 px-3 text-xs"
            >
              Assign
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAssigning(false);
                setSelectedTrackIdToAssign("");
              }}
              className="h-8 px-3 text-xs"
            >
              {strings.dashboard.cancel}
            </Button>
          </div>
        </div>
      )}

      {/* Tracks List */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : studentTracks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center space-y-3">
          <p className="text-sm text-fg-secondary">{strings.student.progressSectionEmpty}</p>
          {teacherTracks.length > 0 ? (
            <Button variant="secondary" onClick={() => setIsAssigning(true)} className="text-xs">
              <Plus className="size-3.5 mr-1" />
              <span>Assign a learning track to {studentName}</span>
            </Button>
          ) : (
            <p className="text-xs text-muted">
              Create learning tracks on your dashboard to assign them here.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {studentTracks.map((track) => {
            const calculated = calculateTrackProgress(
              track.activityIds,
              track.completed,
              catalogMap,
            );

            return (
              <div
                key={track.trackId}
                className="rounded-2xl border border-border-subtle bg-primary p-5 sm:p-6 space-y-5"
              >
                {/* Track header & progress bar */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="font-display text-xl font-medium text-fg">
                        {track.trackName}
                      </h4>
                      <p className="text-xs text-muted">
                        {strings.tracks.stepsCompleted(calculated.completedCount, calculated.total)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-display text-2xl font-bold text-accent">
                        {calculated.percent}%
                      </span>
                      <Button
                        variant="ghost"
                        onClick={() => handleUnassignTrack(track)}
                        className="size-8 p-0 text-muted hover:text-error hover:bg-error/10"
                        title={strings.tracks.unassign}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${calculated.percent}%` }}
                    />
                  </div>
                </div>

                {/* Steps List */}
                <div className="space-y-2 pt-2 border-t border-border-subtle">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Roadmap Steps
                  </span>

                  <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-elevated">
                    {calculated.steps.map((step) => {
                      const item = catalogMap.get(step.activityId);
                      const isCompleted = step.status === "completed";
                      const isUnavailable = step.status === "unavailable";
                      const isCurrent = step.status === "current";
                      const source = step.completion?.source;

                      return (
                        <li
                          key={step.activityId}
                          className="flex items-center justify-between gap-3 p-3.5 text-xs transition-colors hover:bg-primary/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Order indicator */}
                            <span
                              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                isCompleted
                                  ? "bg-success/20 text-success"
                                  : isCurrent
                                    ? "bg-accent text-primary"
                                    : "bg-secondary text-muted"
                              }`}
                            >
                              {step.order}
                            </span>

                            {/* Activity info */}
                            <div className="min-w-0">
                              <p className={`font-medium truncate ${isUnavailable ? "text-muted line-through" : "text-fg"}`}>
                                {item?.title ?? `Activity (${step.activityId})`}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-muted">
                                {item && <span className="capitalize">{item.category}</span>}
                                {isUnavailable && (
                                  <span className="text-amber-500 font-semibold">
                                    · {strings.tracks.statusUnavailable}
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                    {strings.tracks.statusCurrent}
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success capitalize">
                                    Completed ({source ?? "manual"})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Manual completion toggle (RF05, CA04) */}
                          {!isUnavailable && (
                            <button
                              type="button"
                              onClick={() => handleToggleStep(track.trackId, step.activityId, isCompleted)}
                              title={isCompleted ? strings.tracks.markPending : strings.tracks.markCompleted}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                isCompleted
                                  ? "bg-success/15 text-success hover:bg-success/25"
                                  : "border border-border-strong bg-secondary text-fg-secondary hover:border-accent hover:text-fg"
                              }`}
                            >
                              {isCompleted ? (
                                <>
                                  <Check className="size-3.5 stroke-[2.5]" />
                                  <span>{strings.tracks.statusCompleted}</span>
                                </>
                              ) : (
                                <>
                                  <Circle className="size-3 text-muted" />
                                  <span>{strings.tracks.markCompleted}</span>
                                </>
                              )}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
