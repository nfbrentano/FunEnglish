"use client";

import { BookMarked, Plus, Trash2, Users, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { isSpeechSupported, speak } from "@/lib/player/speech";
import { strings } from "@/lib/strings";
import { normalizeWordId } from "@/lib/vocabulary/slug";
import { recordSessionVocabulary } from "@/lib/vocabulary/repository";
import type { SessionWordInput } from "@/lib/vocabulary/types";

export interface SessionPendingWord {
  id: string;
  term: string;
  meaning?: string;
  example?: string;
  targetStudentIds: string[];
}

interface SessionVocabularyManagerProps {
  presentStudents: Array<{ id: string; name: string }>;
  pendingWords: SessionPendingWord[];
  onPendingWordsChange: (words: SessionPendingWord[]) => void;
  sessionId?: string;
}

export function SessionVocabularyManager({
  presentStudents,
  pendingWords,
  onPendingWordsChange,
}: SessionVocabularyManagerProps) {
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [selectedStudentIds] = useState<string[]>(
    presentStudents.map((s) => s.id),
  );
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      setError("Word or phrase is required.");
      return;
    }

    const targetIds =
      selectedStudentIds.length > 0
        ? selectedStudentIds
        : presentStudents.map((s) => s.id);

    const wordId = normalizeWordId(cleanTerm);
    const newPending: SessionPendingWord = {
      id: wordId,
      term: cleanTerm,
      meaning: meaning.trim() || undefined,
      example: example.trim() || undefined,
      targetStudentIds: targetIds,
    };

    // If already in pendingWords, replace or update targets
    const existingIndex = pendingWords.findIndex((w) => w.id === wordId);
    if (existingIndex >= 0) {
      const updated = [...pendingWords];
      updated[existingIndex] = newPending;
      onPendingWordsChange(updated);
    } else {
      onPendingWordsChange([...pendingWords, newPending]);
    }

    setTerm("");
    setMeaning("");
    setExample("");
    setError(null);
  };

  const handleRemove = (id: string) => {
    onPendingWordsChange(pendingWords.filter((w) => w.id !== id));
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-elevated p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2.5 font-display text-lg font-medium text-fg">
          <BookMarked className="size-4 text-accent" />
          <span>{strings.vocabulary.title}</span>
          <span className="text-xs text-muted">({pendingWords.length} pending)</span>
        </h3>
        <span className="text-xs text-muted flex items-center gap-1">
          <Users className="size-3.5" />
          <span>{strings.vocabulary.studentsCount(presentStudents.length)} present</span>
        </span>
      </div>

      {/* Add word form (RF02, CA01) */}
      <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-border-strong bg-primary p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-fg-secondary">
              {strings.vocabulary.termLabel} *
            </label>
            <input
              type="text"
              required
              maxLength={80}
              placeholder={strings.vocabulary.termPlaceholder}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-xl border border-border-strong bg-elevated px-3 py-1.5 text-xs text-fg outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-fg-secondary">
              {strings.vocabulary.meaningLabel}
            </label>
            <input
              type="text"
              maxLength={200}
              placeholder={strings.vocabulary.meaningPlaceholder}
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full rounded-xl border border-border-strong bg-elevated px-3 py-1.5 text-xs text-fg outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-fg-secondary">
            {strings.vocabulary.exampleLabel}
          </label>
          <input
            type="text"
            maxLength={200}
            placeholder={strings.vocabulary.examplePlaceholder}
            value={example}
            onChange={(e) => setExample(e.target.value)}
            className="w-full rounded-xl border border-border-strong bg-elevated px-3 py-1.5 text-xs text-fg outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <div className="flex justify-between items-center pt-1">
          <span className="text-[11px] text-muted">
            Applies to: {selectedStudentIds.length === presentStudents.length ? "All present" : `${selectedStudentIds.length} students`}
          </span>

          <Button
            type="submit"
            variant="primary"
            disabled={!term.trim()}
            className="h-8 px-3 text-xs"
          >
            <Plus className="size-3.5 mr-1" />
            <span>{strings.vocabulary.addWord}</span>
          </Button>
        </div>
      </form>

      {/* Pending words list */}
      {pendingWords.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            Pending session vocabulary:
          </span>
          <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-primary overflow-hidden">
            {pendingWords.map((word) => (
              <div
                key={word.id}
                className="flex items-center justify-between p-3 gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-fg text-sm">{word.term}</span>
                    {isSpeechSupported() && (
                      <button
                        type="button"
                        onClick={() => speak(word.term)}
                        className="rounded-full p-1 text-muted hover:text-accent"
                      >
                        <Volume2 className="size-3" />
                      </button>
                    )}
                    {/* Student count indication (CA01) */}
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                      {strings.vocabulary.studentsCount(word.targetStudentIds.length)}
                    </span>
                  </div>
                  {word.meaning && (
                    <p className="text-fg-secondary">{word.meaning}</p>
                  )}
                  {word.example && (
                    <p className="text-muted italic">“{word.example}”</p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => handleRemove(word.id)}
                  className="size-7 p-0 text-muted hover:text-red-500"
                  title="Remove from session"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Commits all pending vocabulary words for students when closing a session (RF02, RNF04, CA02).
 */
export async function commitSessionPendingVocabulary(
  pendingWords: SessionPendingWord[],
  sessionId: string,
): Promise<void> {
  if (pendingWords.length === 0) return;

  // Group by student
  const studentMap = new Map<string, SessionWordInput[]>();

  for (const item of pendingWords) {
    for (const studentId of item.targetStudentIds) {
      const list = studentMap.get(studentId) || [];
      list.push({
        term: item.term,
        meaning: item.meaning,
        example: item.example,
      });
      studentMap.set(studentId, list);
    }
  }

  // Record for each student
  for (const [studentId, words] of studentMap.entries()) {
    await recordSessionVocabulary({
      studentIds: [studentId],
      words,
      sessionId,
    });
  }
}
