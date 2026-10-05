"use client";

import {
  BookMarked,
  CheckCircle2,
  Edit2,
  Plus,
  Search,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { isSpeechSupported, speak } from "@/lib/player/speech";
import { strings } from "@/lib/strings";
import {
  addWordToStudent,
  deleteWord,
  getStudentVocabulary,
  updateWord,
} from "@/lib/vocabulary/repository";
import type { StudentWord } from "@/lib/vocabulary/types";

interface StudentVocabularySectionProps {
  studentId: string;
  studentName: string;
}

export function StudentVocabularySection({
  studentId,
}: StudentVocabularySectionProps) {
  const toast = useToast();
  const [words, setWords] = useState<StudentWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit modal state
  const [editingWord, setEditingWord] = useState<StudentWord | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const [editExample, setEditExample] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getStudentVocabulary(studentId)
      .then((data) => {
        if (!active) return;
        setWords(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading vocabulary:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  const handleOpenAdd = () => {
    setTerm("");
    setMeaning("");
    setExample("");
    setFormError(null);
    setIsAddOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      setFormError("Term is required");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const newWord = await addWordToStudent(studentId, {
        term: cleanTerm,
        meaning: meaning.trim() || undefined,
        example: example.trim() || undefined,
      });

      setWords((prev) => {
        const filtered = prev.filter((w) => w.id !== newWord.id);
        return [newWord, ...filtered];
      });

      toast(strings.vocabulary.wordAdded);
      setIsAddOpen(false);
      setTerm("");
      setMeaning("");
      setExample("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving word";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (word: StudentWord) => {
    setEditingWord(word);
    setEditTerm(word.term);
    setEditMeaning(word.meaning || "");
    setEditExample(word.example || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWord) return;
    const cleanTerm = editTerm.trim();
    if (!cleanTerm) return;

    setEditSaving(true);

    try {
      await updateWord(studentId, editingWord.id, {
        term: cleanTerm,
        meaning: editMeaning.trim() || undefined,
        example: editExample.trim() || undefined,
      });

      setWords((prev) =>
        prev.map((w) =>
          w.id === editingWord.id
            ? {
                ...w,
                term: cleanTerm,
                meaning: editMeaning.trim() || undefined,
                example: editExample.trim() || undefined,
                lastAddedAt: new Date().toISOString(),
              }
            : w,
        ),
      );

      toast(strings.vocabulary.wordUpdated);
      setEditingWord(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating word";
      toast(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (word: StudentWord) => {
    if (!window.confirm(strings.vocabulary.confirmDeleteWord(word.term))) {
      return;
    }

    setDeletingId(word.id);
    try {
      await deleteWord(studentId, word.id);
      setWords((prev) => prev.filter((w) => w.id !== word.id));
      toast(strings.vocabulary.wordDeleted);
    } catch (err) {
      console.error("Error deleting word:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredWords = words.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.term.toLowerCase().includes(q) ||
      (w.meaning && w.meaning.toLowerCase().includes(q)) ||
      (w.example && w.example.toLowerCase().includes(q))
    );
  });

  return (
    <section id="vocabulary" className="rounded-2xl border border-border-subtle bg-elevated p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="flex items-center gap-3 font-display text-2xl font-medium text-fg">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-muted text-accent">
              <BookMarked className="size-4" />
            </span>
            {strings.vocabulary.title}
            <span className="text-sm font-normal text-muted">({words.length})</span>
          </h3>
          <p className="text-xs text-fg-secondary">{strings.vocabulary.subtitle}</p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAdd}
          className="h-9 px-3 text-xs"
        >
          <Plus className="size-4 mr-1.5" />
          <span>{strings.vocabulary.addWord}</span>
        </Button>
      </div>

      {/* Search & stats bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder={strings.vocabulary.filterSearch}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border-strong bg-primary pl-9 pr-3 py-1.5 text-xs text-fg outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Words list */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-sm text-fg-secondary">
          {searchQuery ? strings.vocabulary.noWordsFound : strings.vocabulary.emptyList}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredWords.map((word) => (
            <div
              key={word.id}
              className="flex flex-col justify-between rounded-xl border border-border-subtle bg-primary p-4 space-y-3 transition-colors hover:border-border-strong"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-semibold text-fg">
                      {word.term}
                    </span>
                    {isSpeechSupported() && (
                      <button
                        type="button"
                        onClick={() => speak(word.term)}
                        title="Listen to pronunciation"
                        className="rounded-full p-1 text-muted hover:text-accent hover:bg-accent-muted transition-colors"
                      >
                        <Volume2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {word.learned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                        <CheckCircle2 className="size-3" />
                        {strings.vocabulary.learned}
                      </span>
                    ) : (
                      <span className="rounded-full bg-border-subtle px-2 py-0.5 text-[11px] font-medium text-muted">
                        {strings.vocabulary.learning}
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      onClick={() => handleOpenEdit(word)}
                      className="size-7 p-0 text-muted hover:text-fg"
                      title={strings.vocabulary.editWord}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(word)}
                      disabled={deletingId === word.id}
                      className="size-7 p-0 text-muted hover:text-red-500"
                      title={strings.vocabulary.deleteWord}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {word.meaning && (
                  <p className="text-xs text-fg-secondary font-medium">
                    {word.meaning}
                  </p>
                )}

                {word.example && (
                  <p className="text-xs text-muted italic">
                    “{word.example}”
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-muted">
                <span>
                  {word.sessionIds.length > 0
                    ? strings.vocabulary.seenInClasses(word.sessionIds.length)
                    : "Added directly"}
                </span>
                <span>
                  {new Date(word.lastAddedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Word Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border-strong bg-elevated p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-medium text-fg">
                {strings.vocabulary.addWord}
              </h4>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full p-1 text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-fg-secondary">
                  {strings.vocabulary.termLabel} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  placeholder={strings.vocabulary.termPlaceholder}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-fg-secondary">
                  {strings.vocabulary.meaningLabel}
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder={strings.vocabulary.meaningPlaceholder}
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-fg-secondary">
                  {strings.vocabulary.exampleLabel}
                </label>
                <textarea
                  maxLength={200}
                  rows={2}
                  placeholder={strings.vocabulary.examplePlaceholder}
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                  className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-sm text-fg outline-none focus:border-accent resize-none"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-500 font-medium">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddOpen(false)}
                  className="h-9 px-3 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving || !term.trim()}
                  className="h-9 px-4 text-xs"
                >
                  {saving ? "Saving…" : strings.vocabulary.saveWord}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Word Modal */}
      {editingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border-strong bg-elevated p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-medium text-fg">
                {strings.vocabulary.editWord}
              </h4>
              <button
                type="button"
                onClick={() => setEditingWord(null)}
                className="rounded-full p-1 text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-fg-secondary">
                  {strings.vocabulary.termLabel} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={editTerm}
                  onChange={(e) => setEditTerm(e.target.value)}
                  className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-fg-secondary">
                  {strings.vocabulary.meaningLabel}
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={editMeaning}
                  onChange={(e) => setEditMeaning(e.target.value)}
                  className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-fg-secondary">
                  {strings.vocabulary.exampleLabel}
                </label>
                <textarea
                  maxLength={200}
                  rows={2}
                  value={editExample}
                  onChange={(e) => setEditExample(e.target.value)}
                  className="w-full rounded-xl border border-border-strong bg-primary px-3 py-2 text-sm text-fg outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingWord(null)}
                  className="h-9 px-3 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={editSaving || !editTerm.trim()}
                  className="h-9 px-4 text-xs"
                >
                  {editSaving ? "Saving…" : strings.vocabulary.saveWord}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
