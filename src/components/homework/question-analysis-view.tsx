"use client";

import {
  AlertCircle,
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  aggregateByQuestion,
  batchAddSuggestedNotes,
  getStudentErrors,
  type QuestionAggregate,
  type StudentQuestionError,
} from "@/lib/homework/question-analysis";
import type { Homework, HomeworkSubmission } from "@/lib/homework/types";
import { createStudentNote, getStudentNotes } from "@/lib/notes/repository";
import type { StudentNote } from "@/lib/notes/types";
import { strings } from "@/lib/strings";

interface QuestionAnalysisViewProps {
  homework: Homework;
  submissions: HomeworkSubmission[];
  activityContent: any;
  activityCategory?: string;
  onNoteAdded?: () => void;
}

export function QuestionAnalysisView({
  homework,
  submissions,
  activityContent,
  activityCategory,
  onNoteAdded,
}: QuestionAnalysisViewProps) {
  const toast = useToast();

  // If homework was sent to a single student (RF01, CA10), default to student error view
  const isSingleStudentTarget =
    (homework.targetType === "students" && homework.studentIds?.length === 1) ||
    submissions.length === 1;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    if (isSingleStudentTarget && submissions[0]?.studentId) {
      return submissions[0].studentId;
    }
    return null;
  });

  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [addedNoteKeys, setAddedNoteKeys] = useState<Set<string>>(new Set());
  const [savingNoteKey, setSavingNoteKey] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Aggregated questions across all submissions (RF01, RF02, CA01, CA02)
  const questionAggregates = useMemo<QuestionAggregate[]>(() => {
    return aggregateByQuestion(activityContent, submissions, homework.activityType);
  }, [activityContent, submissions, homework.activityType]);

  // Selected student's submission (if in student view)
  const activeSubmission = useMemo(() => {
    if (!selectedStudentId) return null;
    return submissions.find((s) => s.studentId === selectedStudentId) || null;
  }, [selectedStudentId, submissions]);

  // Selected student's errors (RF03, RF04, CA03, CA04)
  const studentErrors = useMemo<StudentQuestionError[]>(() => {
    if (!activeSubmission) return [];
    return getStudentErrors(
      activeSubmission,
      activityContent,
      homework.activityType,
      activityCategory,
    );
  }, [activeSubmission, activityContent, homework.activityType, activityCategory]);

  const toggleQuestionExpand = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAddSingleNote = async (error: StudentQuestionError) => {
    if (!activeSubmission?.studentId) return;

    const noteKey = `${error.itemIndex}:${error.suggestedNote.text}`;
    setSavingNoteKey(noteKey);

    try {
      await createStudentNote(activeSubmission.studentId, {
        category: error.suggestedNote.category,
        text: error.suggestedNote.text,
        correction: error.suggestedNote.correction,
        visibility: "private",
        source: "homework",
        homeworkId: homework.id,
      });

      setAddedNoteKeys((prev) => new Set(prev).add(noteKey));
      toast(strings.homework.questionAnalysis.noteAdded);
      onNoteAdded?.();
    } catch (err) {
      console.error("Error creating student note from error:", err);
      toast(err instanceof Error ? err.message : "Error creating note");
    } finally {
      setSavingNoteKey(null);
    }
  };

  const handleAddAllNotes = async () => {
    if (!activeSubmission?.studentId || studentErrors.length === 0) return;

    setIsSavingBatch(true);
    try {
      const existingNotes: StudentNote[] = await getStudentNotes(
        activeSubmission.studentId,
      ).catch(() => []);

      const suggestions = studentErrors.map((err) => ({
        category: err.suggestedNote.category,
        text: err.suggestedNote.text,
        correction: err.suggestedNote.correction,
        visibility: "private" as const,
        source: "homework" as const,
        homeworkId: homework.id,
      }));

      const { added, duplicatesSkipped } = await batchAddSuggestedNotes(
        activeSubmission.studentId,
        suggestions,
        existingNotes,
      );

      // Mark all as added
      studentErrors.forEach((err) => {
        setAddedNoteKeys((prev) =>
          new Set(prev).add(`${err.itemIndex}:${err.suggestedNote.text}`),
        );
      });

      toast(
        strings.homework.questionAnalysis.notesAddedBatch(
          added.length,
          duplicatesSkipped,
        ),
      );
      onNoteAdded?.();
    } catch (err) {
      console.error("Error batch adding notes:", err);
      toast(err instanceof Error ? err.message : "Error batch adding notes");
    } finally {
      setIsSavingBatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Switch between Questions Overview and Student Errors */}
      {!isSingleStudentTarget && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={!selectedStudentId ? "primary" : "secondary"}
              onClick={() => setSelectedStudentId(null)}
              className="h-8 px-3 text-xs"
            >
              <BarChart2 className="size-3.5 mr-1.5" />
              <span>{strings.homework.questionAnalysis.title}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">View student errors:</span>
            <select
              value={selectedStudentId || ""}
              onChange={(e) => setSelectedStudentId(e.target.value || null)}
              className="rounded-xl border border-border-strong bg-primary px-3 py-1.5 text-xs text-fg outline-none focus:border-accent"
            >
              <option value="">All questions (aggregated)</option>
              {submissions.map((s) => (
                <option key={s.id} value={s.studentId || s.id}>
                  {s.studentName} ({s.correct}/{s.total})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 1. SINGLE STUDENT VIEW (RF03, RF04, CA03, CA04, CA10) */}
      {selectedStudentId && activeSubmission ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-primary p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-accent-muted text-accent font-semibold text-sm">
                {activeSubmission.studentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-fg">
                  {activeSubmission.studentName}
                </h4>
                <p className="text-xs text-muted">
                  Score: {activeSubmission.correct}/{activeSubmission.total} (
                  {activeSubmission.total - activeSubmission.correct} missed)
                </p>
              </div>
            </div>

            {studentErrors.length > 0 && activeSubmission.studentId && (
              <Button
                variant="primary"
                onClick={handleAddAllNotes}
                disabled={isSavingBatch}
                className="h-8 px-3 text-xs"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                <span>{strings.homework.questionAnalysis.addAllNotes}</span>
              </Button>
            )}
          </div>

          {studentErrors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-xs text-emerald-500 bg-emerald-500/5">
              <Check className="size-6 mx-auto mb-2 text-emerald-500" />
              <span>{strings.homework.questionAnalysis.noErrors}</span>
            </div>
          ) : (
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-fg uppercase tracking-wider">
                Missed Questions ({studentErrors.length})
              </h5>

              {studentErrors.map((err) => {
                const noteKey = `${err.itemIndex}:${err.suggestedNote.text}`;
                const isAdded = addedNoteKeys.has(noteKey);
                const isSaving = savingNoteKey === noteKey;

                return (
                  <div
                    key={err.itemIndex}
                    className="rounded-2xl border border-border-subtle bg-primary p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-muted">
                            Question {err.itemIndex + 1}
                          </span>
                          {err.isChanged && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                              {strings.homework.questionAnalysis.questionChanged}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-fg">
                          {err.prompt}
                        </p>
                      </div>
                    </div>

                    {/* Answers comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5">
                        <span className="text-[10px] uppercase font-semibold text-rose-500 block">
                          {strings.homework.questionAnalysis.givenAnswer}
                        </span>
                        <span className="font-medium text-fg">
                          {err.studentAnswer}
                        </span>
                      </div>

                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                        <span className="text-[10px] uppercase font-semibold text-emerald-500 block">
                          {strings.homework.questionAnalysis.correctAnswer}
                        </span>
                        <span className="font-medium text-fg">
                          {err.correctAnswer}
                        </span>
                      </div>
                    </div>

                    {/* Suggested Note Card (RF04, CA04) */}
                    <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                            Suggested note
                          </span>
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent capitalize">
                            {err.suggestedNote.category}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-fg">
                          {err.suggestedNote.text} →{" "}
                          <span className="text-emerald-500 font-semibold">
                            {err.suggestedNote.correction}
                          </span>
                        </p>
                      </div>

                      {activeSubmission.studentId && (
                        <Button
                          variant={isAdded ? "secondary" : "primary"}
                          onClick={() => handleAddSingleNote(err)}
                          disabled={isAdded || isSaving}
                          className="h-8 px-3 text-xs"
                        >
                          {isAdded ? (
                            <>
                              <Check className="size-3.5 mr-1.5 text-emerald-500" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="size-3.5 mr-1.5" />
                              <span>{strings.homework.questionAnalysis.addAsNote}</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 2. AGGREGATED QUESTIONS VIEW (RF01, RF02, CA01, CA02) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-fg">
              {strings.homework.questionAnalysis.mostMissedTitle} (
              {questionAggregates.length})
            </h4>
            <span className="text-xs text-muted">
              Sorted by highest error rate
            </span>
          </div>

          <div className="space-y-3">
            {questionAggregates.map((q) => {
              const isExpanded = expandedQuestions.has(q.itemIndex);

              // Color determination based on accuracy
              const accuracyColor =
                q.accuracyPercentage >= 80
                  ? "text-emerald-500 bg-emerald-500/10"
                  : q.accuracyPercentage >= 50
                    ? "text-amber-500 bg-amber-500/10"
                    : "text-rose-500 bg-rose-500/10";

              return (
                <div
                  key={q.itemIndex}
                  className="rounded-2xl border border-border-subtle bg-primary overflow-hidden transition-colors hover:border-border-strong"
                >
                  <div
                    onClick={() => toggleQuestionExpand(q.itemIndex)}
                    className="p-4 cursor-pointer flex flex-wrap items-center justify-between gap-3 select-none"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-50">
                      <span className="flex size-7 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-muted">
                        Q{q.itemIndex + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-fg truncate">
                            {q.prompt}
                          </p>
                          {q.isChanged && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500 shrink-0">
                              {strings.homework.questionAnalysis.questionChanged}
                            </span>
                          )}
                        </div>

                        {q.missedCount > 0 && (
                          <p className="text-[11px] text-muted truncate">
                            {strings.homework.questionAnalysis.missedBy(
                              q.missedByStudentNames.join(", "),
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${accuracyColor}`}
                        >
                          {strings.homework.questionAnalysis.accuracy(
                            q.accuracyPercentage,
                          )}
                        </span>
                        <div className="text-[10px] text-muted mt-0.5">
                          {q.missedCount} / {q.totalAnswers} missed
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted" />
                      ) : (
                        <ChevronDown className="size-4 text-muted" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Breakdown (RF02, CA02) */}
                  {isExpanded && (
                    <div className="border-t border-border-subtle bg-secondary/30 p-4 space-y-4 text-xs">
                      {/* Correct answer */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted">
                          {strings.homework.questionAnalysis.correctAnswer}:
                        </span>
                        <span className="font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {q.correctAnswer || "N/A"}
                        </span>
                      </div>

                      {/* Options distribution (Quiz) */}
                      {q.optionsDistribution && (
                        <div className="space-y-2">
                          <span className="font-semibold text-muted block text-[11px]">
                            Choice distribution:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.optionsDistribution.map((opt, oIdx) => {
                              const pct =
                                q.totalAnswers > 0
                                  ? Math.round(
                                      (opt.count / q.totalAnswers) * 100,
                                    )
                                  : 0;

                              return (
                                <div
                                  key={oIdx}
                                  className={`rounded-xl border p-2.5 flex items-center justify-between ${
                                    opt.isCorrect
                                      ? "border-emerald-500/30 bg-emerald-500/5"
                                      : "border-border-subtle bg-primary/60"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {opt.isCorrect && (
                                      <Check className="size-3.5 text-emerald-500 shrink-0" />
                                    )}
                                    <span
                                      className={`truncate ${
                                        opt.isCorrect
                                          ? "font-semibold text-fg"
                                          : "text-fg-secondary"
                                      }`}
                                    >
                                      {opt.text}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0 ml-2">
                                    <span className="font-semibold text-fg">
                                      {opt.count}
                                    </span>
                                    <span className="text-[10px] text-muted ml-1">
                                      ({pct}%)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Freeform frequent answers */}
                      {q.frequentAnswers && q.frequentAnswers.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-semibold text-muted block text-[11px]">
                            Student responses:
                          </span>
                          <div className="space-y-1">
                            {q.frequentAnswers.map((item, fIdx) => (
                              <div
                                key={fIdx}
                                className="flex items-center justify-between rounded-lg bg-primary px-3 py-1.5"
                              >
                                <span className="font-medium text-fg truncate">
                                  “{item.text}”
                                </span>
                                <span className="text-muted text-[11px]">
                                  {item.count} student
                                  {item.count === 1 ? "" : "s"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missed by names */}
                      {q.missedByStudentNames.length > 0 && (
                        <div className="pt-2 border-t border-border-subtle flex items-start gap-2 text-[11px] text-muted">
                          <User className="size-3.5 mt-0.5 text-muted shrink-0" />
                          <span>
                            {strings.homework.questionAnalysis.missedCount(
                              q.missedCount,
                            )}
                            :{" "}
                            <span className="text-fg font-medium">
                              {q.missedByStudentNames.join(", ")}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
