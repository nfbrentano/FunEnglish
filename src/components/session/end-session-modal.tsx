"use client";

import { Check, Clock, Copy, Plus, Radio, Trash2, Users, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useClasses } from "@/lib/classes/use-classes";
import { useLiveRoom } from "@/lib/live/live-context";
import type { StudentNote } from "@/lib/notes/types";
import { formatClassSummaryForWhatsApp } from "@/lib/portal/repository";
import type {
  ClassroomSession,
  SessionActivity,
  SessionEndReviewData,
  SessionLiveResult,
  SessionWord,
} from "@/lib/session/types";
import { useSessionContext } from "@/lib/session/session-context";
import { strings } from "@/lib/strings";

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function EndSessionModal() {
  const session = useSessionContext();
  const toast = useToast();
  const { students } = useClasses();

  if (!session || !session.reviewModalOpen || !session.activeSession) {
    return null;
  }

  const active = session.activeSession;

  // Calculate elapsed minutes
  const initialDurationMinutes = Math.max(
    1,
    Math.round((Date.now() - active.startedAt.getTime()) / 60000),
  );

  return (
    <EndSessionModalInner
      active={active}
      initialDuration={initialDurationMinutes}
      students={students}
      onClose={session.closeReviewModal}
      onConfirm={session.confirmEndClass}
    />
  );
}

function EndSessionModalInner({
  active,
  initialDuration,
  students,
  onClose,
  onConfirm,
}: {
  active: ClassroomSession;
  initialDuration: number;
  students: Array<{ id: string; name: string }>;
  onClose: () => void;
  onConfirm: (data: SessionEndReviewData) => Promise<void>;
}) {
  const toast = useToast();
  const [durationMinutes, setDurationMinutes] = useState(initialDuration);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({
    ...active.attendance,
  });
  const [activities, setActivities] = useState<SessionActivity[]>([...active.activitiesPlayed]);
  const [words, setWords] = useState<SessionWord[]>([...active.newWords]);
  const [newWordInput, setNewWordInput] = useState("");
  const [boardText, setBoardText] = useState(active.boardText || "");
  const [classNotes, setClassNotes] = useState(active.classNotes || "");
  const [notes, setNotes] = useState<StudentNote[]>([...active.notes]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const live = useLiveRoom();

  // Compute Live Room results per participant (RF12, CA11)
  const liveResults = useMemo(() => {
    if (!live?.liveRoom) return undefined;
    const room = live.liveRoom;
    const results: Record<string, SessionLiveResult> = {};
    for (const [uid, p] of Object.entries(room.participants || {})) {
      let correctCount = 0;
      let totalQuestions = 0;
      for (const itemAns of Object.values(room.answers || {})) {
        if (itemAns[uid]) {
          totalQuestions++;
          if (itemAns[uid].correct) correctCount++;
        }
      }
      results[uid] = {
        studentName: p.name,
        studentId: p.studentId,
        correctCount,
        totalQuestions,
        score: p.score || 0,
      };
    }
    return results;
  }, [live?.liveRoom]);

  // Present students list
  const presentStudents = useMemo(() => {
    return students.filter((s) => attendance[s.id] === true);
  }, [students, attendance]);

  const handleRemoveActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    const term = newWordInput.trim();
    if (!term) return;
    if (words.some((w) => w.term.toLowerCase() === term.toLowerCase())) {
      setNewWordInput("");
      return;
    }
    setWords((prev) => [...prev, { term }]);
    setNewWordInput("");
  };

  const handleRemoveWord = (term: string) => {
    setWords((prev) => prev.filter((w) => w.term.toLowerCase() !== term.toLowerCase()));
  };

  const handleRemoveNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleToggleNoteVisibility = (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, visibility: n.visibility === "shared" ? "private" : "shared" }
          : n,
      ),
    );
  };

  const handleCopyWhatsApp = () => {
    const text = formatClassSummaryForWhatsApp({
      studentName: active.className,
      date: active.startedAt,
      durationMinutes,
      activities: activities.map((a) => ({ title: a.title })),
      words: words.map((w) => w.term),
      boardText,
      notes: notes.filter((n) => n.visibility === "shared"),
      portalUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/join`,
    });
    navigator.clipboard.writeText(text);
    toast(strings.session.review.copiedWhatsApp);
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm({
        attendance,
        activities,
        words,
        notes,
        boardText,
        classNotes,
        durationMinutes,
        liveResults,
      });
      if (live?.isLiveActive) {
        await live.closeRoom();
      }
      toast(strings.session.review.savedSuccess);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error saving summary");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-border-subtle bg-elevated shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle p-5 sm:p-6 bg-primary/40">
          <div>
            <h2 id="review-modal-title" className="font-display text-2xl font-medium text-fg">
              {strings.session.review.title} · {active.className}
            </h2>
            <p className="text-xs text-muted mt-1">{strings.session.review.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {/* Duration & Attendees overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 flex items-center gap-3">
              <Clock className="size-5 text-accent" />
              <div className="flex-1">
                <span className="text-xs text-muted block">{strings.session.review.duration}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 rounded-lg border border-border-subtle bg-primary px-2 py-1 text-sm font-semibold text-fg"
                  />
                  <span className="text-sm text-fg-secondary">minutes</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3">
              <Users className="size-5 text-accent" />
              <div className="flex-1">
                <span className="text-xs text-muted block">
                  {strings.session.review.attendanceHeading}
                </span>
                <span className="text-sm font-semibold text-fg">
                  {presentStudents.length} present
                </span>
              </div>
            </Card>
          </div>

          {/* Activities played (CA04) */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg flex items-center justify-between">
              <span>{strings.session.review.activitiesHeading}</span>
              <span className="text-xs text-muted font-normal">
                {activities.length} activity{activities.length === 1 ? "" : "ies"}
              </span>
            </h3>
            {activities.length === 0 ? (
              <p className="text-xs text-muted italic">{strings.session.review.noActivities}</p>
            ) : (
              <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-primary/20">
                {activities.map((act, index) => (
                  <li
                    key={act.id}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent">
                        {index + 1}
                      </span>
                      <span className="font-medium text-fg">{act.title}</span>
                      <span className="text-xs text-muted">
                        {formatTimestamp(act.timestamp)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => handleRemoveActivity(act.id)}
                      className="min-h-8 px-2"
                      aria-label={`Remove ${act.title}`}
                    >
                      <Trash2 className="size-4 text-muted hover:text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Live Quiz Results (RF12, CA11) */}
          {liveResults && Object.keys(liveResults).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
                <Radio className="size-4 text-accent" />
                <span>Live Room Quiz Results</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(liveResults).map(([uid, res]) => (
                  <div
                    key={uid}
                    className="flex items-center justify-between rounded-2xl border border-border-subtle bg-primary/20 p-3 text-xs"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-fg truncate">
                        {res.studentName}
                      </span>
                      <span className="text-[11px] text-muted">
                        {res.correctCount}/{res.totalQuestions} correct
                      </span>
                    </div>
                    <Badge variant="outline" className="font-mono text-accent">
                      {res.score} pts
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vocabulary & Key words */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">
              {strings.session.review.wordsHeading}
            </h3>
            <div className="flex flex-wrap gap-2">
              {words.map((w) => (
                <span
                  key={w.term}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-muted/40 px-3 py-1 text-xs font-medium text-accent"
                >
                  {w.term}
                  <button
                    type="button"
                    onClick={() => handleRemoveWord(w.term)}
                    className="text-accent/70 hover:text-accent"
                    aria-label={`Remove word ${w.term}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            <form onSubmit={handleAddWord} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                placeholder={strings.session.review.addWordPlaceholder}
                className="flex-1 rounded-full border border-border-subtle bg-primary px-3.5 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
              />
              <Button type="submit" disabled={!newWordInput.trim()} className="min-h-8 px-3 text-xs">
                <Plus className="size-3.5" />
                <span>Add</span>
              </Button>
            </form>
          </div>

          {/* Whiteboard content */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">
              {strings.session.review.boardHeading}
            </h3>
            <textarea
              value={boardText}
              onChange={(e) => setBoardText(e.target.value)}
              rows={3}
              placeholder="Whiteboard text summary…"
              className="w-full rounded-2xl border border-border-subtle bg-primary p-3 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          {/* Whole class notes */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">
              {strings.session.review.classNotesHeading}
            </h3>
            <textarea
              value={classNotes}
              onChange={(e) => setClassNotes(e.target.value)}
              rows={2}
              placeholder={strings.session.review.classNotesPlaceholder}
              className="w-full rounded-2xl border border-border-subtle bg-primary p-3 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          {/* Student feedback and notes (CA06: edit or remove before confirm) */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">
              {strings.session.review.notesHeading}
            </h3>
            {notes.length === 0 ? (
              <p className="text-xs text-muted italic">{strings.session.review.noNotes}</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((note) => {
                  const student = students.find((s) => s.id === note.studentId);
                  return (
                    <li
                      key={note.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border-subtle bg-primary/20 p-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-fg">
                            {student?.name || "Student"}
                          </span>
                          <span className="rounded border border-border-strong px-1.5 py-0.5 text-[10px] font-semibold uppercase text-fg-secondary">
                            {note.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleNoteVisibility(note.id)}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                              note.visibility === "shared"
                                ? "bg-success/20 text-success"
                                : "bg-muted/30 text-fg-secondary"
                            }`}
                          >
                            {note.visibility === "shared" ? "Shared" : "Private"}
                          </button>
                        </div>
                        <p className="text-fg">{note.text}</p>
                        {note.correction && (
                          <p className="text-accent">→ {note.correction}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => handleRemoveNote(note.id)}
                        className="min-h-8 p-1"
                        aria-label="Remove note"
                      >
                        <Trash2 className="size-3.5 text-muted hover:text-red-500" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle p-5 sm:p-6 bg-primary/40">
          <Button variant="ghost" onClick={handleCopyWhatsApp} className="min-h-8 px-3 text-xs">
            <Copy className="size-4" />
            <span>{strings.session.review.copyWhatsApp}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="min-h-8 px-3 text-xs">
              {strings.classes.cancel}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="min-h-8 px-3.5 text-xs bg-accent text-primary hover:bg-accent/90"
            >
              <Check className="size-4" />
              <span>{isSubmitting ? strings.session.review.saving : strings.session.review.confirmEnd}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
