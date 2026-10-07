"use client";

import {
  ArrowLeft,
  Check,
  Flame,
  HelpCircle,
  RefreshCw,
  RotateCw,
  Sparkles,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isSpeechSupported, speak } from "@/lib/player/speech";
import { recordWordReviews } from "@/lib/vocabulary/repository";
import {
  calculateNextReview,
  calculateStreak,
  getTodayDateString,
  type ReviewRating,
  type SrsResult,
} from "@/lib/vocabulary/srs";
import type { StudentWord } from "@/lib/vocabulary/types";

interface DailyReviewModalProps {
  studentId: string;
  words: StudentWord[];
  isOpen: boolean;
  onClose: () => void;
  onFinished?: (updatedCount: number) => void;
  onReviewComplete?: () => void;
  initialStreak?: number;
  dailyLimit?: number;
}

interface ReviewQueueItem {
  word: StudentWord;
  hasLapsed: boolean;
}

export function DailyReviewModal({
  studentId,
  words,
  isOpen,
  onClose,
  onFinished,
  onReviewComplete,
  initialStreak,
  dailyLimit = 20,
}: DailyReviewModalProps) {
  const todayStr = useMemo(() => getTodayDateString(), []);

  // Filter due words for review, capped at dailyLimit (RF01, RF04, CA01, CA04, CA08)
  const initialDueWords = useMemo(() => {
    const due = words.filter((w) => !w.learned && (!w.dueAt || w.dueAt <= todayStr));
    due.sort((a, b) => {
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
      if (a.dueAt && !b.dueAt) return -1;
      if (!a.dueAt && b.dueAt) return 1;
      return a.term.localeCompare(b.term);
    });
    return due.slice(0, dailyLimit);
  }, [words, todayStr, dailyLimit]);

  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reverseMode, setReverseMode] = useState(false); // RF05, CA05
  const [completedReviews, setCompletedReviews] = useState<
    Map<string, { word: StudentWord; result: SrsResult; hasLapsed: boolean }>
  >(new Map());
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize queue when modal opens
  useEffect(() => {
    if (isOpen) {
      setQueue(initialDueWords.map((w) => ({ word: w, hasLapsed: false })));
      setCurrentIndex(0);
      setIsFlipped(false);
      setCompletedReviews(new Map());
      setIsCompleted(false);
    }
  }, [isOpen, initialDueWords]);

  const currentItem = queue[currentIndex];
  const currentWord = currentItem?.word;

  // Next intervals previews for current word
  const previews = useMemo(() => {
    if (!currentWord) return null;
    return {
      again: calculateNextReview(currentWord, "again", todayStr),
      hard: calculateNextReview(currentWord, "hard", todayStr),
      good: calculateNextReview(currentWord, "good", todayStr),
      easy: calculateNextReview(currentWord, "easy", todayStr),
    };
  }, [currentWord, todayStr]);

  const handleSpeak = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentWord?.term) {
      speak(currentWord.term);
    }
  }, [currentWord]);

  // Flip card
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Rate current word (RF02, RF03, CA02, CA03)
  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!currentWord || isSaving) return;

      const result = calculateNextReview(currentWord, rating, todayStr);

      if (rating === "again") {
        // "Again" adds word to the end of current session queue (RF03, CA03)
        setCompletedReviews((prev) => {
          const next = new Map(prev);
          next.set(currentWord.id, {
            word: currentWord,
            result,
            hasLapsed: true,
          });
          return next;
        });

        // Re-append to queue
        setQueue((prev) => [...prev, { word: currentWord, hasLapsed: true }]);
      } else {
        // Successful review (Hard, Good, Easy)
        setCompletedReviews((prev) => {
          const next = new Map(prev);
          const wasLapsed = prev.get(currentWord.id)?.hasLapsed || currentItem.hasLapsed;
          next.set(currentWord.id, {
            word: currentWord,
            result,
            hasLapsed: wasLapsed,
          });
          return next;
        });
      }

      // Move to next card
      if (currentIndex + 1 < queue.length || rating === "again") {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        // Finished all cards in queue!
        setIsSaving(true);
        try {
          // Commit all completed reviews in batch (RNF03)
          const allReviews = Array.from(completedReviews.values()).map((c) => ({
            wordId: c.word.id,
            dueAt: c.result.dueAt,
            intervalDays: c.result.intervalDays,
            ease: c.result.ease,
            reps: c.result.reps,
            lapses: c.result.lapses,
          }));

          // Add the last one if not yet in state map
          if (!completedReviews.has(currentWord.id)) {
            allReviews.push({
              wordId: currentWord.id,
              dueAt: result.dueAt,
              intervalDays: result.intervalDays,
              ease: result.ease,
              reps: result.reps,
              lapses: result.lapses,
            });
          }

          await recordWordReviews(studentId, allReviews);
          setIsCompleted(true);
          onFinished?.(allReviews.length);
          onReviewComplete?.();
        } catch (err) {
          console.error("Error saving daily reviews:", err);
          setIsCompleted(true);
        } finally {
          setIsSaving(false);
        }
      }
    },
    [
      currentWord,
      isSaving,
      todayStr,
      currentIndex,
      queue.length,
      studentId,
      completedReviews,
      currentItem?.hasLapsed,
      onFinished,
    ],
  );

  // Keyboard navigation: Space to flip, 1-4 for ratings (RF02, CA02)
  useEffect(() => {
    if (!isOpen || isCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate("again");
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate("hard");
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate("good");
        } else if (e.key === "4") {
          e.preventDefault();
          handleRate("easy");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isCompleted, isFlipped, handleFlip, handleRate]);

  // Compute final statistics & streak (RF06, CA06)
  const stats = useMemo(() => {
    const reviewedCount = completedReviews.size;
    const lapsedCount = Array.from(completedReviews.values()).filter((c) => c.hasLapsed).length;

    // Gather existing review dates from words plus today for streak
    const existingDates = words
      .map((w) => w.lastReviewedAt?.slice(0, 10))
      .filter((d): d is string => Boolean(d));
    if (reviewedCount > 0) {
      existingDates.push(todayStr);
    }
    const streak = calculateStreak(existingDates, todayStr);

    return { reviewedCount, lapsedCount, streak };
  }, [completedReviews, words, todayStr]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative flex w-full max-w-xl flex-col rounded-3xl border border-border-subtle bg-surface shadow-2xl overflow-hidden min-h-120">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 bg-primary/30">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-muted text-accent font-bold text-xs">
              SRS
            </span>
            <div>
              <h2 id="review-modal-title" className="font-display text-base font-semibold text-fg">
                Daily Review
              </h2>
              <p className="text-xs text-muted">
                {isCompleted
                  ? "Session Completed"
                  : `Card ${currentIndex + 1} of ${queue.length}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted && (
              <button
                type="button"
                onClick={() => setReverseMode((r) => !r)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors border ${
                  reverseMode
                    ? "bg-accent/15 border-accent text-accent"
                    : "border-border-subtle text-muted hover:text-fg"
                }`}
                title="Toggle Reverse Mode (meaning → term)"
              >
                <RefreshCw className="size-3 inline mr-1" />
                {reverseMode ? "Inverse On" : "Inverse"}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted hover:bg-elevated hover:text-fg transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center">
          {queue.length === 0 ? (
            /* No cards due */
            <div className="text-center py-12 space-y-3">
              <Sparkles className="size-10 text-accent mx-auto" />
              <h3 className="font-display text-xl font-semibold text-fg">All caught up!</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                No words due for review right now. Come back tomorrow or add new words in class!
              </p>
              <Button onClick={onClose} variant="secondary" className="mt-4">
                Close
              </Button>
            </div>
          ) : isCompleted ? (
            /* Completion summary screen (RF06, CA04, CA06) */
            <div className="text-center py-8 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="size-16 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto">
                <Check className="size-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-2xl font-bold text-fg">Daily goal reached!</h3>
                <p className="text-xs text-muted">
                  {stats.reviewedCount} reviewed · {stats.lapsedCount} to repeat
                </p>
              </div>

              {/* Streak badge */}
              <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-5 py-2.5 text-amber-500 font-bold text-sm shadow-xs">
                <Flame className="size-5 fill-current" />
                <span>{stats.streak}-day streak</span>
              </div>

              <div>
                <Button onClick={onClose} className="min-w-36 font-semibold">
                  Done
                </Button>
              </div>
            </div>
          ) : currentWord ? (
            /* Flashcard active (RF02, CA02, CA03, CA05) */
            <div className="flex flex-col flex-1 justify-between gap-5">
              {/* Card surface */}
              <div
                onClick={handleFlip}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleFlip();
                }}
                className="relative flex flex-col justify-center items-center min-h-55 rounded-3xl border border-border-strong bg-elevated/70 p-6 text-center shadow-md cursor-pointer hover:border-accent/40 transition-all select-none"
              >
                {/* Mode Indicator */}
                <span className="absolute top-3 left-4 text-[10px] text-muted uppercase tracking-wider font-semibold">
                  {reverseMode ? "Prompt: Meaning" : "Prompt: Term"}
                </span>

                {/* Speaker button */}
                <button
                  type="button"
                  onClick={handleSpeak}
                  className="absolute top-3 right-3 rounded-full p-2 text-muted hover:text-accent hover:bg-surface transition-colors"
                  title="Listen pronunciation"
                  aria-label="Listen pronunciation"
                >
                  <Volume2 className="size-4" />
                </button>

                {!isFlipped ? (
                  /* Front side */
                  <div className="space-y-3">
                    <h3 className="font-display text-3xl sm:text-4xl font-bold text-fg tracking-tight">
                      {reverseMode ? currentWord.meaning || currentWord.term : currentWord.term}
                    </h3>
                    <p className="text-xs text-muted flex items-center justify-center gap-1">
                      <HelpCircle className="size-3" />
                      <span>Tap card or press Space to reveal</span>
                    </p>
                  </div>
                ) : (
                  /* Back side (revealed) */
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-fg">
                      {reverseMode ? currentWord.term : currentWord.term}
                    </h3>

                    {currentWord.meaning && (
                      <p className="text-base font-semibold text-accent">
                        {currentWord.meaning}
                      </p>
                    )}

                    {currentWord.example && (
                      <p className="text-xs text-muted italic max-w-md">
                        &quot;{currentWord.example}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: 4 ratings when flipped, or flip button when unrevealed */}
              {!isFlipped ? (
                <Button
                  size="lg"
                  onClick={handleFlip}
                  className="w-full font-semibold min-h-12"
                >
                  Reveal Answer (Space)
                </Button>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {/* Again (1) */}
                  <button
                    type="button"
                    onClick={() => handleRate("again")}
                    disabled={isSaving}
                    className="flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-red-500 font-semibold hover:bg-red-500/20 active:scale-95 transition-all min-h-13"
                  >
                    <span className="text-xs">Again</span>
                    <span className="text-[10px] text-muted font-normal">
                      1d (1)
                    </span>
                  </button>

                  {/* Hard (2) */}
                  <button
                    type="button"
                    onClick={() => handleRate("hard")}
                    disabled={isSaving}
                    className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-500 font-semibold hover:bg-amber-500/20 active:scale-95 transition-all min-h-13"
                  >
                    <span className="text-xs">Hard</span>
                    <span className="text-[10px] text-muted font-normal">
                      +{previews?.hard.intervalDays}d (2)
                    </span>
                  </button>

                  {/* Good (3) */}
                  <button
                    type="button"
                    onClick={() => handleRate("good")}
                    disabled={isSaving}
                    className="flex flex-col items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-500 font-semibold hover:bg-blue-500/20 active:scale-95 transition-all min-h-13"
                  >
                    <span className="text-xs">Good</span>
                    <span className="text-[10px] text-muted font-normal">
                      +{previews?.good.intervalDays}d (3)
                    </span>
                  </button>

                  {/* Easy (4) */}
                  <button
                    type="button"
                    onClick={() => handleRate("easy")}
                    disabled={isSaving}
                    className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-500 font-semibold hover:bg-emerald-500/20 active:scale-95 transition-all min-h-13"
                  >
                    <span className="text-xs">Easy</span>
                    <span className="text-[10px] text-muted font-normal">
                      +{previews?.easy.intervalDays}d (4)
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
