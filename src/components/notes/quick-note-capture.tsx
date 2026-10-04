"use client";

import { Eye, EyeOff, Plus, Send, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  createBatchNotes,
  createStudentNote,
  resolveDefaultVisibility,
  validateCorrection,
  validateNoteText,
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

export interface StudentOption {
  id: string;
  name: string;
}

interface QuickNoteCaptureProps {
  students: StudentOption[];
  initialStudentId?: string;
  sessionId?: string;
  onNoteCreated?: (note: StudentNote) => void;
  onBatchCreated?: (count: number) => void;
  className?: string;
}

export function QuickNoteCapture({
  students,
  initialStudentId,
  sessionId,
  onNoteCreated,
  onBatchCreated,
  className = "",
}: QuickNoteCaptureProps) {
  const toast = useToast();

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() => {
    if (initialStudentId) return [initialStudentId];
    if (students.length === 1) return [students[0].id];
    return [];
  });

  const [category, setCategory] = useState<NoteCategory>("pronunciation");
  const [visibility, setVisibility] = useState<NoteVisibility>(() =>
    resolveDefaultVisibility("pronunciation"),
  );
  const [text, setText] = useState("");
  const [correction, setCorrection] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update visibility default when category changes (RF08)
  const handleCategoryChange = (newCat: NoteCategory) => {
    setCategory(newCat);
    setVisibility(resolveDefaultVisibility(newCat));
  };

  const [prevInitialId, setPrevInitialId] = useState(initialStudentId);
  if (initialStudentId !== prevInitialId) {
    setPrevInitialId(initialStudentId);
    if (initialStudentId) {
      setSelectedStudentIds([initialStudentId]);
    }
  }

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    // Validation (CA09)
    try {
      validateNoteText(text);
      if (correction) validateCorrection(correction);
    } catch (err) {
      const msg = err instanceof Error ? err.message : strings.notes.validationEmpty;
      setValidationError(msg);
      return;
    }

    if (selectedStudentIds.length === 0) {
      setValidationError("Please select at least one student.");
      return;
    }

    try {
      setSubmitting(true);

      if (selectedStudentIds.length === 1) {
        const studentId = selectedStudentIds[0];
        const newNote = await createStudentNote(studentId, {
          category,
          text,
          correction: correction.trim() ? correction.trim() : undefined,
          visibility,
          sessionId,
        });

        toast(strings.notes.noteSaved);
        if (onNoteCreated) onNoteCreated(newNote);
      } else {
        // Multi-student / whole group (CA02)
        const result = await createBatchNotes(selectedStudentIds, {
          category,
          text,
          correction: correction.trim() ? correction.trim() : undefined,
          visibility,
          sessionId,
        });

        toast(strings.notes.notesBatchSaved(result.count));
        if (onBatchCreated) onBatchCreated(result.count);
      }

      // Clear input fields while keeping students selected (CA01)
      setText("");
      setCorrection("");
      setShowCorrection(false);
      setValidationError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error saving note";
      setValidationError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div
      className={`rounded-2xl border border-border-subtle bg-elevated p-4 sm:p-6 space-y-4 shadow-xs ${className}`}
      data-testid="quick-note-capture"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div>
          <h4 className="flex items-center gap-2 text-base font-semibold text-fg">
            <Sparkles className="size-4 text-accent" />
            {strings.notes.quickCaptureTitle}
          </h4>
          <p className="text-xs text-muted">{strings.notes.quickCaptureDesc}</p>
        </div>

        {/* Visibility toggle button */}
        <button
          type="button"
          onClick={() => setVisibility((v) => (v === "private" ? "shared" : "private"))}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            visibility === "shared"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              : "bg-muted/15 text-muted hover:text-fg border border-border-subtle"
          }`}
          title="Toggle note visibility"
        >
          {visibility === "shared" ? (
            <>
              <Eye className="size-3.5" />
              <span>{strings.notes.visibilities.shared}</span>
            </>
          ) : (
            <>
              <EyeOff className="size-3.5" />
              <span>{strings.notes.visibilities.private}</span>
            </>
          )}
        </button>
      </div>

      {/* Multi-student selection chips if more than 1 student available */}
      {students.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-fg-secondary">
              <Users className="size-3.5 text-accent" />
              {strings.notes.selectStudents} ({selectedStudentIds.length}/{students.length})
            </span>
            <button
              type="button"
              onClick={selectAllStudents}
              className="text-xs font-medium text-accent hover:underline"
            >
              {selectedStudentIds.length === students.length
                ? "Deselect all"
                : strings.notes.wholeGroup}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {students.map((st) => {
              const isSelected = selectedStudentIds.includes(st.id);
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => toggleStudent(st.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-accent text-primary shadow-xs ring-1 ring-accent"
                      : "bg-primary border border-border-subtle text-fg-secondary hover:text-fg hover:border-border-strong"
                  }`}
                >
                  {st.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category selection chips */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fg-secondary">
          {strings.notes.filterCategory}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {NOTE_CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-accent text-primary shadow-xs"
                    : "bg-primary border border-border-subtle text-fg-secondary hover:text-fg"
                }`}
              >
                {strings.notes.categories[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Note input & enter action */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <div className="relative">
            <input
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              maxLength={MAX_NOTE_TEXT_LENGTH}
              placeholder={strings.notes.placeholderText}
              className="w-full rounded-xl border border-border-strong bg-primary px-3.5 py-2.5 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              autoComplete="off"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Press Enter to save quickly</span>
            <span>
              {text.length}/{MAX_NOTE_TEXT_LENGTH}
            </span>
          </div>
        </div>

        {/* Optional correction field */}
        {showCorrection ? (
          <div className="space-y-1 animate-in fade-in duration-150">
            <input
              type="text"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_CORRECTION_TEXT_LENGTH}
              placeholder={strings.notes.placeholderCorrection}
              className="w-full rounded-xl border border-border-subtle bg-primary px-3.5 py-2 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCorrection(true)}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent font-medium"
          >
            <Plus className="size-3" />
            <span>Add correction (e.g. said X → should be Y)</span>
          </button>
        )}

        {validationError && (
          <div
            className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs text-red-600 dark:text-red-400"
            role="alert"
          >
            {validationError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="submit"
            disabled={submitting || !text.trim()}
            className="min-h-9 px-4 text-xs font-medium"
          >
            <Send className="size-3.5 mr-1.5" />
            <span>{submitting ? "Saving..." : strings.notes.saveNote}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
