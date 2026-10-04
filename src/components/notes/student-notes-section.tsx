"use client";

import {
  Calendar,
  CheckCircle2,
  Circle,
  Eye,
  History,
  Lock,
  Pencil,
  Projector,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { findRecurringIssues } from "@/lib/notes/recurring";
import {
  deleteStudentNote,
  getStudentNotes,
  groupNotesByClassDate,
  updateStudentNote,
} from "@/lib/notes/repository";
import {
  MAX_CORRECTION_TEXT_LENGTH,
  MAX_NOTE_TEXT_LENGTH,
  NOTE_CATEGORIES,
  type NoteCategory,
  type NoteVisibility,
  type StudentNote,
} from "@/lib/notes/types";
import { strings } from "@/lib/strings";
import { QuickNoteCapture, type StudentOption } from "./quick-note-capture";

interface StudentNotesSectionProps {
  studentId: string;
  studentName: string;
  allStudents?: StudentOption[];
}

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  pronunciation: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  grammar: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  vocabulary: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  fluency: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  strength: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  general: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20",
};

export function StudentNotesSection({
  studentId,
  studentName,
  allStudents,
}: StudentNotesSectionProps) {
  const toast = useToast();

  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectionMode, setProjectionMode] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<NoteCategory | "all">("all");
  const [filterVisibility, setFilterVisibility] = useState<NoteVisibility | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"open" | "resolved" | "all">("open");

  // Editing modal state
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null);
  const [editText, setEditText] = useState("");
  const [editCorrection, setEditCorrection] = useState("");
  const [editCategory, setEditCategory] = useState<NoteCategory>("pronunciation");
  const [editVisibility, setEditVisibility] = useState<NoteVisibility>("private");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [prevStudentId, setPrevStudentId] = useState(studentId);
  if (studentId !== prevStudentId) {
    setPrevStudentId(studentId);
    setLoading(true);
  }

  // Load notes
  useEffect(() => {
    let active = true;

    getStudentNotes(studentId, { status: "all" })
      .then((data) => {
        if (active) setNotes(data);
      })
      .catch((err) => {
        console.error("Error fetching notes:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  // Compute recurring issues across ALL notes (RF06, CA05)
  const recurringIssues = useMemo(() => findRecurringIssues(notes), [notes]);

  // Filter notes for timeline display (RF04, CA03, CA04)
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (filterCategory !== "all" && n.category !== filterCategory) return false;
      if (filterVisibility !== "all" && n.visibility !== filterVisibility) return false;
      if (filterStatus === "open" && n.resolved) return false;
      if (filterStatus === "resolved" && !n.resolved) return false;
      return true;
    });
  }, [notes, filterCategory, filterVisibility, filterStatus]);

  // Group filtered notes by class/session date (CA03)
  const groupedTimeline = useMemo(() => groupNotesByClassDate(filteredNotes), [filteredNotes]);

  const handleNoteCreated = (newNote: StudentNote) => {
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleToggleResolved = async (note: StudentNote) => {
    const nextState = !note.resolved;
    try {
      // Optimistic update
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, resolved: nextState } : n)));
      await updateStudentNote(studentId, note.id, { resolved: nextState });
      toast(nextState ? "Note marked as resolved" : "Note reopened");
    } catch (err) {
      // Rollback
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, resolved: !nextState } : n)));
      toast(err instanceof Error ? err.message : "Error updating note");
    }
  };

  const handleToggleVisibility = async (note: StudentNote) => {
    const nextVisibility: NoteVisibility = note.visibility === "private" ? "shared" : "private";
    try {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, visibility: nextVisibility } : n)),
      );
      await updateStudentNote(studentId, note.id, { visibility: nextVisibility });
      toast(
        nextVisibility === "shared" ? "Note is now shared with student" : "Note is now private",
      );
    } catch (err) {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, visibility: note.visibility } : n)),
      );
      toast(err instanceof Error ? err.message : "Error updating visibility");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm(strings.notes.confirmDelete)) return;
    try {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      await deleteStudentNote(studentId, noteId);
      toast("Note deleted");
    } catch (err) {
      console.error("Failed to delete note:", err);
      toast("Error deleting note");
    }
  };

  const startEditNote = (note: StudentNote) => {
    setEditingNote(note);
    setEditText(note.text);
    setEditCorrection(note.correction ?? "");
    setEditCategory(note.category);
    setEditVisibility(note.visibility);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    if (!editText.trim()) {
      setEditError(strings.notes.validationEmpty);
      return;
    }
    if (editText.trim().length > MAX_NOTE_TEXT_LENGTH) {
      setEditError(strings.notes.validationTooLong);
      return;
    }

    try {
      setEditSubmitting(true);
      await updateStudentNote(studentId, editingNote.id, {
        text: editText.trim(),
        correction: editCorrection.trim() || null,
        category: editCategory,
        visibility: editVisibility,
      });

      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                text: editText.trim(),
                correction: editCorrection.trim() || undefined,
                category: editCategory,
                visibility: editVisibility,
                updatedAt: new Date(),
              }
            : n,
        ),
      );

      toast("Note updated");
      setEditingNote(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error updating note");
    } finally {
      setEditSubmitting(false);
    }
  };

  const availableStudents: StudentOption[] =
    allStudents && allStudents.length > 0 ? allStudents : [{ id: studentId, name: studentName }];

  return (
    <section id="notes" className="space-y-6">
      {/* Top section header & Projection Mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-medium text-fg">{strings.notes.title}</h3>
          <p className="text-sm text-fg-secondary">{strings.notes.subtitle}</p>
        </div>

        {/* Projection mode toggle (CA08, CT08) */}
        <button
          type="button"
          onClick={() => setProjectionMode((p) => !p)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            projectionMode
              ? "bg-accent text-primary shadow-xs ring-2 ring-accent"
              : "border border-border-subtle bg-elevated text-fg-secondary hover:text-fg"
          }`}
          title="Projection mode hides past notes from being projected to class"
        >
          <Projector className="size-4" />
          <span>{strings.notes.projectionMode}</span>
          {projectionMode && (
            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] uppercase font-bold">
              Active
            </span>
          )}
        </button>
      </div>

      {/* Quick capture form - always available, even in projection mode (CA08) */}
      <QuickNoteCapture
        students={availableStudents}
        initialStudentId={studentId}
        onNoteCreated={handleNoteCreated}
        onBatchCreated={() => {
          // Refresh notes if batch note affects this student
          getStudentNotes(studentId, { status: "all" }).then(setNotes);
        }}
      />

      {/* When in Projection Mode, hide notes list completely (RNF03, CA08) */}
      {projectionMode ? (
        <div
          className="rounded-2xl border border-dashed border-accent/40 bg-accent-muted/20 p-8 text-center space-y-2 animate-in fade-in"
          data-testid="projection-mode-notice"
        >
          <Projector className="mx-auto size-8 text-accent" />
          <h4 className="text-base font-semibold text-fg">{strings.notes.projectionMode}</h4>
          <p className="mx-auto max-w-md text-xs text-fg-secondary">
            {strings.notes.projectionModeNotice}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Recurring Issues Section (RF06, CA05, CT05) */}
          {recurringIssues.length > 0 && (
            <div
              className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3"
              data-testid="recurring-issues-section"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <History className="size-4" />
                  {strings.notes.recurringTitle}
                </span>
                <span className="text-xs text-muted">{strings.notes.recurringDesc}</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {recurringIssues.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col justify-between rounded-xl border border-amber-500/20 bg-primary p-3 space-y-2 text-xs shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                            CATEGORY_COLORS[item.category]
                          }`}
                        >
                          {strings.notes.categories[item.category]}
                        </span>
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          {strings.notes.classesCount(item.count)}
                        </span>
                      </div>
                      <p className="font-medium text-fg break-words">{item.sampleText}</p>
                      {item.sampleCorrection && (
                        <p className="text-[11px] text-muted italic break-words">
                          Correction: {item.sampleCorrection}
                        </p>
                      )}
                    </div>
                    <div className="text-[10px] text-muted flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>{item.classDates.join(" · ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters Bar (RF04, CA03) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-elevated p-3 sm:px-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as NoteCategory | "all")}
                className="rounded-lg border border-border-strong bg-primary px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                aria-label="Filter by category"
              >
                <option value="all">{strings.notes.allCategories}</option>
                {NOTE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {strings.notes.categories[cat]}
                  </option>
                ))}
              </select>

              {/* Visibility Filter */}
              <select
                value={filterVisibility}
                onChange={(e) => setFilterVisibility(e.target.value as NoteVisibility | "all")}
                className="rounded-lg border border-border-strong bg-primary px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                aria-label="Filter by visibility"
              >
                <option value="all">{strings.notes.allVisibilities}</option>
                <option value="private">{strings.notes.visibilities.private}</option>
                <option value="shared">{strings.notes.visibilities.shared}</option>
              </select>
            </div>

            {/* Status Tabs (Open / Resolved / All) (CA04) */}
            <div className="flex rounded-lg border border-border-subtle bg-primary p-0.5">
              {(["open", "resolved", "all"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    filterStatus === st
                      ? "bg-accent text-primary shadow-xs"
                      : "text-fg-secondary hover:text-fg"
                  }`}
                >
                  {strings.notes.statuses[st]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes Timeline List */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-sm text-fg-secondary">
              {strings.notes.emptyNotes}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-sm text-fg-secondary">
              {strings.notes.emptyFiltered}
            </div>
          ) : (
            <div className="space-y-6" data-testid="notes-timeline">
              {groupedTimeline.map((group) => (
                <div key={group.dateLabel} className="space-y-3">
                  {/* Date Group Header (CA03) */}
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent-muted text-accent">
                      <Calendar className="size-3.5" />
                    </span>
                    <h5 className="text-xs font-semibold text-fg-secondary">{group.dateLabel}</h5>
                    <span className="text-[11px] text-muted">({group.notes.length})</span>
                  </div>

                  {/* Notes in this date group */}
                  <div className="space-y-2.5 pl-3 sm:pl-4 border-l-2 border-border-subtle">
                    {group.notes.map((note) => {
                      const isResolved = note.resolved;
                      return (
                        <div
                          key={note.id}
                          className={`group relative rounded-xl border border-border-subtle bg-elevated p-4 transition-all hover:border-border-strong ${
                            isResolved ? "opacity-60 bg-primary/40" : ""
                          }`}
                          data-testid={`note-card-${note.id}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Category badge */}
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-medium border ${
                                  CATEGORY_COLORS[note.category]
                                }`}
                              >
                                {strings.notes.categories[note.category]}
                              </span>

                              {/* Visibility badge with toggle action (CA06) */}
                              <button
                                type="button"
                                onClick={() => handleToggleVisibility(note)}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                                  note.visibility === "shared"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                    : "bg-muted/15 text-muted hover:text-fg border-border-subtle"
                                }`}
                                title="Click to toggle visibility (shared with portal / private)"
                              >
                                {note.visibility === "shared" ? (
                                  <>
                                    <Eye className="size-3" />
                                    <span>{strings.notes.sharedBadge}</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="size-3" />
                                    <span>{strings.notes.privateBadge}</span>
                                  </>
                                )}
                              </button>

                              {/* Resolved indicator badge */}
                              {isResolved && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="size-3" />
                                  <span>{strings.notes.resolvedBadge}</span>
                                </span>
                              )}
                            </div>

                            {/* Actions: Resolve / Edit / Delete */}
                            <div className="flex items-center gap-1">
                              {/* Mark as resolved toggle (RF05, CA04) */}
                              <button
                                type="button"
                                onClick={() => handleToggleResolved(note)}
                                className={`rounded-lg p-1.5 transition-colors ${
                                  isResolved
                                    ? "text-emerald-500 hover:text-emerald-600"
                                    : "text-muted hover:text-emerald-500"
                                }`}
                                title={isResolved ? strings.notes.unresolve : strings.notes.resolve}
                              >
                                {isResolved ? (
                                  <CheckCircle2 className="size-4" />
                                ) : (
                                  <Circle className="size-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => startEditNote(note)}
                                className="rounded-lg p-1.5 text-muted hover:text-fg transition-colors"
                                title={strings.notes.edit}
                              >
                                <Pencil className="size-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note.id)}
                                className="rounded-lg p-1.5 text-muted hover:text-red-500 transition-colors"
                                title={strings.notes.delete}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Note text */}
                          <div className="pt-2">
                            <p
                              className={`text-sm text-fg break-words ${
                                isResolved ? "line-through text-muted" : ""
                              }`}
                            >
                              {note.text}
                            </p>
                          </div>

                          {/* Correction highlight if available */}
                          {note.correction && (
                            <div className="mt-2 rounded-lg bg-primary/70 border border-border-subtle px-3 py-1.5 text-xs text-muted flex items-baseline gap-2">
                              <span className="font-semibold text-accent">Correction:</span>
                              <span className="text-fg-secondary italic break-words">
                                {note.correction}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit note modal */}
      {editingNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border-subtle bg-elevated p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h4 className="text-base font-semibold text-fg">{strings.notes.edit}</h4>
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                className="rounded-lg p-1 text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-fg-secondary">
                  {strings.notes.filterCategory}
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as NoteCategory)}
                  className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {NOTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {strings.notes.categories[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Text */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-fg-secondary">Note text</label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={MAX_NOTE_TEXT_LENGTH}
                  rows={3}
                  className="w-full rounded-xl border border-border-strong bg-primary p-3 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <div className="text-right text-[10px] text-muted">
                  {editText.length}/{MAX_NOTE_TEXT_LENGTH}
                </div>
              </div>

              {/* Correction */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-fg-secondary">
                  Correction (optional)
                </label>
                <input
                  type="text"
                  value={editCorrection}
                  onChange={(e) => setEditCorrection(e.target.value)}
                  maxLength={MAX_CORRECTION_TEXT_LENGTH}
                  placeholder="e.g. said X → should be Y"
                  className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Visibility */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-fg-secondary">
                  {strings.notes.filterVisibility}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditVisibility("private")}
                    className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-colors ${
                      editVisibility === "private"
                        ? "border-accent bg-accent text-primary"
                        : "border-border-subtle bg-primary text-fg-secondary"
                    }`}
                  >
                    {strings.notes.visibilities.private}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditVisibility("shared")}
                    className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-colors ${
                      editVisibility === "shared"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border-subtle bg-primary text-fg-secondary"
                    }`}
                  >
                    {strings.notes.visibilities.shared}
                  </button>
                </div>
              </div>

              {editError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-500">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingNote(null)}
                  className="text-xs"
                >
                  {strings.notes.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={editSubmitting || !editText.trim()}
                  className="text-xs"
                >
                  {editSubmitting ? "Saving..." : strings.notes.saveNote}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
