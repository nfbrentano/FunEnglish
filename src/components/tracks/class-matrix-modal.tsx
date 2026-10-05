"use client";

import { Check, Circle, Minus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogItem } from "@/lib/catalog/schema";
import type { Student, TeacherClass } from "@/lib/classes/types";
import { strings } from "@/lib/strings";
import { calculateTrackProgress } from "@/lib/tracks/progress";
import {
  getTrackClassMatrix,
  setStepCompletion,
  type StudentTrackMatrixRow,
} from "@/lib/tracks/repository";
import type { LearningTrack } from "@/lib/tracks/types";

interface ClassMatrixModalProps {
  track: LearningTrack;
  classes: TeacherClass[];
  allStudents: Student[];
  catalogItems: CatalogItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function ClassMatrixModal({
  track,
  classes,
  allStudents,
  catalogItems,
  isOpen,
  onClose,
}: ClassMatrixModalProps) {
  // Determine relevant classes (classes assigned or active classes)
  const assignedClasses = classes.filter(
    (c) => track.assignedClassIds?.includes(c.id) || !c.archived,
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    assignedClasses[0]?.id ?? classes[0]?.id ?? "",
  );

  const [matrixData, setMatrixData] = useState<StudentTrackMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);

  const catalogMap = new Map(catalogItems.map((item) => [item.id, item]));
  const currentClass = classes.find((c) => c.id === selectedClassId);
  const classStudents = currentClass
    ? allStudents.filter((s) => currentClass.studentIds.includes(s.id))
    : [];

  const loadMatrix = async (classId: string) => {
    const targetClass = classes.find((c) => c.id === classId);
    if (!targetClass) {
      setMatrixData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const rows = await getTrackClassMatrix(track.id, targetClass.studentIds);
      setMatrixData(rows);
    } catch (err) {
      console.warn("Could not load class matrix:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !selectedClassId) return;
    loadMatrix(selectedClassId);
  }, [isOpen, selectedClassId, track.id]);

  const handleToggleStep = async (
    studentId: string,
    activityId: string,
    currentlyCompleted: boolean,
  ) => {
    try {
      // Optimistic update
      setMatrixData((prev) =>
        prev.map((row) => {
          if (row.studentId !== studentId || !row.progress) return row;
          const newCompleted = { ...row.progress.completed };
          if (currentlyCompleted) {
            delete newCompleted[activityId];
          } else {
            newCompleted[activityId] = {
              at: new Date().toISOString(),
              source: "manual",
            };
          }
          return {
            ...row,
            progress: {
              ...row.progress,
              completed: newCompleted,
            },
          };
        }),
      );

      await setStepCompletion(
        studentId,
        track.id,
        activityId,
        !currentlyCompleted,
        "manual",
      );
    } catch (err) {
      console.warn("Error toggling step completion in matrix:", err);
      if (selectedClassId) loadMatrix(selectedClassId);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="class-matrix-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-8 shadow-xl space-y-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border-subtle shrink-0">
          <div className="space-y-1">
            <h2 id="class-matrix-title" className="font-display text-2xl font-medium text-fg">
              {strings.tracks.matrixTitle(track.name)}
            </h2>
            <p className="text-xs text-muted">
              {strings.tracks.activitiesCount(track.activityIds.length)} · Click any step to toggle completion
            </p>
          </div>

          <div className="flex items-center gap-3">
            {classes.length > 1 && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="rounded-xl border border-border-strong bg-primary px-3 py-1.5 text-xs font-medium text-fg outline-none focus:border-accent"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.studentIds.length} students)
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-muted hover:bg-primary hover:text-fg"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Matrix Content */}
        <div className="flex-1 overflow-auto rounded-2xl border border-border-subtle bg-primary">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          ) : classStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              {strings.tracks.noStudentsInClass}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-elevated/70">
                  <th className="p-3.5 font-semibold text-fg-secondary sticky left-0 bg-elevated/95 z-10 min-w-36">
                    {strings.tracks.studentColumn}
                  </th>
                  <th className="p-3.5 font-semibold text-fg-secondary min-w-28">
                    {strings.tracks.progressColumn}
                  </th>
                  {track.activityIds.map((actId, idx) => {
                    const item = catalogMap.get(actId);
                    return (
                      <th
                        key={actId}
                        className="p-3 font-semibold text-fg-secondary text-center min-w-20"
                        title={item?.title ?? actId}
                      >
                        <div className="truncate max-w-24">
                          <span className="block text-[11px] text-accent font-bold">
                            #{idx + 1}
                          </span>
                          <span className="block truncate text-[10px] text-muted">
                            {item?.title ?? actId}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {classStudents.map((student) => {
                  const studentRow = matrixData.find((r) => r.studentId === student.id);
                  const progress = studentRow?.progress;
                  const calculated = calculateTrackProgress(
                    track.activityIds,
                    progress?.completed,
                    catalogMap,
                  );

                  return (
                    <tr key={student.id} className="hover:bg-elevated/40 transition-colors">
                      {/* Student Name */}
                      <td className="p-3.5 font-medium text-fg sticky left-0 bg-primary z-10 border-r border-border-subtle">
                        <span className="truncate block max-w-44">{student.name}</span>
                      </td>

                      {/* Progress Bar & Percentage (RF07, CA06) */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <span className="font-semibold text-fg text-xs">
                            {calculated.percent}%
                          </span>
                          <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-accent transition-all duration-300"
                              style={{ width: `${calculated.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Steps checkmarks */}
                      {track.activityIds.map((actId) => {
                        const stepView = calculated.steps.find((s) => s.activityId === actId);
                        const isCompleted = stepView?.status === "completed";
                        const isUnavailable = stepView?.status === "unavailable";
                        const source = stepView?.completion?.source;

                        return (
                          <td key={actId} className="p-2 text-center">
                            {isUnavailable ? (
                              <span
                                title={strings.tracks.statusUnavailable}
                                className="inline-flex size-6 items-center justify-center rounded-md bg-secondary text-muted"
                              >
                                <Minus className="size-3" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStep(student.id, actId, isCompleted)}
                                title={
                                  isCompleted
                                    ? `${strings.tracks.statusCompleted} (${source ?? "manual"}) - click to unmark`
                                    : `${strings.tracks.statusPending} - click to mark completed`
                                }
                                className={`inline-flex size-7 items-center justify-center rounded-lg transition-transform hover:scale-110 ${
                                  isCompleted
                                    ? source === "homework"
                                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                                      : source === "class"
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                        : "bg-success/20 text-success border border-success/40"
                                    : "bg-secondary/60 text-muted hover:bg-secondary hover:text-fg border border-transparent"
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="size-3.5 stroke-[2.5]" />
                                ) : (
                                  <Circle className="size-3 text-muted/60" />
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-muted pt-2 border-t border-border-subtle shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-success inline-block" />
              <span>Manual completed</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-purple-400 inline-block" />
              <span>Homework completed</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-blue-400 inline-block" />
              <span>Class completed</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-secondary inline-block border border-border-subtle" />
              <span>Pending</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-fg hover:bg-elevated"
          >
            {strings.dashboard.close}
          </button>
        </div>
      </div>
    </div>
  );
}
