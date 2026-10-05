"use client";

import { Check, Users, User, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Student, TeacherClass } from "@/lib/classes/types";
import { strings } from "@/lib/strings";
import type { LearningTrack } from "@/lib/tracks/types";

interface AssignTrackModalProps {
  track: LearningTrack;
  classes: TeacherClass[];
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (track: LearningTrack, studentIds: string[], classIds: string[]) => Promise<void>;
}

export function AssignTrackModal({
  track,
  classes,
  students,
  isOpen,
  onClose,
  onAssign,
}: AssignTrackModalProps) {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    track.assignedClassIds || [],
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    track.assignedStudentIds || [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      const isSelected = prev.includes(classId);
      const targetClass = classes.find((c) => c.id === classId);
      const classStudents = targetClass ? targetClass.studentIds : [];

      if (isSelected) {
        // Deselect class
        return prev.filter((id) => id !== classId);
      } else {
        // Select class and add all its students to selectedStudentIds
        setSelectedStudentIds((currentStudents) =>
          Array.from(new Set([...currentStudents, ...classStudents])),
        );
        return [...prev, classId];
      }
    });
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleSave = async () => {
    // Gather all target student IDs: explicitly selected students + students in selected classes
    const allStudentIdsSet = new Set<string>(selectedStudentIds);
    for (const cId of selectedClassIds) {
      const c = classes.find((cl) => cl.id === cId);
      if (c) {
        c.studentIds.forEach((sId) => allStudentIdsSet.add(sId));
      }
    }

    const finalStudentIds = Array.from(allStudentIdsSet);
    if (finalStudentIds.length === 0) {
      setError("Please select at least one student or class to assign this track.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onAssign(track, finalStudentIds, selectedClassIds);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error assigning track");
    } finally {
      setSaving(false);
    }
  };

  const activeClasses = classes.filter((c) => !c.archived);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-track-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-7 shadow-xl space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle shrink-0">
          <h2 id="assign-track-title" className="font-display text-xl font-medium text-fg">
            {strings.tracks.assignTitle(track.name)}
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

        {error && (
          <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-xs text-error font-medium">
            {error}
          </div>
        )}

        <div className="space-y-6 overflow-y-auto flex-1 pr-1">
          {/* Section: Classes */}
          <div className="space-y-2.5">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-secondary">
              <Users className="size-3.5 text-accent" />
              <span>{strings.tracks.assignClassesHeading}</span>
            </h3>

            {activeClasses.length === 0 ? (
              <p className="text-xs text-muted">{strings.tracks.noClasses}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeClasses.map((c) => {
                  const isChecked = selectedClassIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleClass(c.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs text-left transition-colors ${
                        isChecked
                          ? "border-accent bg-accent/10 text-fg"
                          : "border-border-subtle bg-primary text-fg-secondary hover:border-accent/40"
                      }`}
                    >
                      <span className="font-medium text-fg truncate">{c.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[11px] text-muted">
                          {c.studentIds.length} {c.studentIds.length === 1 ? "student" : "students"}
                        </span>
                        {isChecked && (
                          <Check className="size-3.5 text-accent shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Individual Students */}
          <div className="space-y-2.5 pt-2 border-t border-border-subtle">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-secondary">
              <User className="size-3.5 text-accent" />
              <span>{strings.tracks.assignStudentsHeading}</span>
            </h3>

            {students.length === 0 ? (
              <p className="text-xs text-muted">{strings.tracks.noStudents}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {students.map((s) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStudent(s.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-colors ${
                        isChecked
                          ? "border-accent bg-accent/10 text-fg"
                          : "border-border-subtle bg-primary text-fg-secondary hover:border-accent/40"
                      }`}
                    >
                      <span className="font-medium text-fg truncate">{s.name}</span>
                      {isChecked && <Check className="size-3.5 text-accent shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {strings.dashboard.cancel}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : strings.tracks.saveAssignment}
          </Button>
        </div>
      </div>
    </div>
  );
}
