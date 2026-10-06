"use client";

import {
  BookMarked,
  Check,
  CheckCircle2,
  RotateCw,
  Search,
  Sparkles,
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
  getStudentVocabulary,
  setWordLearned,
} from "@/lib/vocabulary/repository";
import type { StudentWord } from "@/lib/vocabulary/types";

interface StudentVocabularyTabProps {
  studentId: string;
}

export function StudentVocabularyTab({ studentId }: StudentVocabularyTabProps) {
  const toast = useToast();
  const [words, setWords] = useState<StudentWord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "to-learn" | "learned">("all");
  const [sortMode, setSortMode] = useState<"recent" | "alpha">("recent");

  // Practice state (RF07, CA07)
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceCards, setPracticeCards] = useState<StudentWord[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [cardsKnewCount, setCardsKnewCount] = useState(0);

  useEffect(() => {
    let active = true;

    getStudentVocabulary(studentId)
      .then((data) => {
        if (!active) return;
        setWords(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading student vocabulary:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  const handleToggleLearned = async (word: StudentWord) => {
    const nextState = !word.learned;
    // Optimistic update
    setWords((prev) =>
      prev.map((w) => (w.id === word.id ? { ...w, learned: nextState } : w)),
    );

    try {
      await setWordLearned(studentId, word.id, nextState);
    } catch (err) {
      console.error("Error updating word learned state:", err);
      // Rollback
      setWords((prev) =>
        prev.map((w) => (w.id === word.id ? { ...w, learned: word.learned } : w)),
      );
      toast("Could not update status. Please try again.");
    }
  };

  // Filter & sort
  const filteredWords = words
    .filter((w) => {
      if (filterMode === "to-learn" && w.learned) return false;
      if (filterMode === "learned" && !w.learned) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          w.term.toLowerCase().includes(q) ||
          (w.meaning && w.meaning.toLowerCase().includes(q)) ||
          (w.example && w.example.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "alpha") {
        return a.term.localeCompare(b.term);
      }
      return new Date(b.lastAddedAt).getTime() - new Date(a.lastAddedAt).getTime();
    });

  const unlearnedWords = words.filter((w) => !w.learned);

  const startPractice = () => {
    if (unlearnedWords.length === 0) return;
    // RF07, CA07: Up to 20 unlearned words
    const selected = unlearnedWords.slice(0, 20);
    setPracticeCards(selected);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setPracticeFinished(false);
    setCardsKnewCount(0);
    setIsPracticing(true);
  };

  const handlePracticeRating = async (knew: boolean) => {
    const currentWord = practiceCards[currentCardIndex];
    if (knew && currentWord && !currentWord.learned) {
      setCardsKnewCount((prev) => prev + 1);
      // Mark as learned
      await handleToggleLearned(currentWord);
    }

    if (currentCardIndex + 1 < practiceCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
      setIsCardFlipped(false);
    } else {
      setPracticeFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action header: Title, practice CTA, counts */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-medium text-fg flex items-center gap-2">
            <BookMarked className="size-5 text-accent" />
            <span>{strings.portal.wordsTitle}</span>
            <span className="text-sm font-normal text-muted">({words.length})</span>
          </h2>
          <p className="text-xs text-fg-secondary">{strings.portal.wordsSubtitle}</p>
        </div>

        {/* Practice Button (RF07, CA07) */}
        <div>
          {unlearnedWords.length === 0 ? (
            <Button
              variant="secondary"
              disabled
              title={strings.portal.practiceTooltipEmpty}
              className="h-10 px-4 text-xs opacity-60 cursor-not-allowed"
            >
              <Sparkles className="size-4 mr-1.5" />
              <span>{strings.portal.practiceTooltipEmpty}</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={startPractice}
              className="h-10 px-5 text-xs font-semibold shadow-xs"
            >
              <Sparkles className="size-4 mr-1.5" />
              <span>{strings.portal.practiceButton} ({Math.min(unlearnedWords.length, 20)})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search, Filter Tabs and Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Search input (CA05) */}
        <div className="relative flex-1 min-w-50 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder={strings.portal.searchWordsPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border-strong bg-elevated pl-9 pr-3 py-2 text-xs text-fg outline-none focus:border-accent"
          />
        </div>

        {/* Filter buttons & sort selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter pills */}
          <div className="flex rounded-xl border border-border-subtle bg-elevated p-0.5">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filterMode === "all"
                  ? "bg-primary text-fg shadow-2xs font-semibold"
                  : "text-muted hover:text-fg"
              }`}
            >
              {strings.portal.filterAll}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("to-learn")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filterMode === "to-learn"
                  ? "bg-primary text-fg shadow-2xs font-semibold"
                  : "text-muted hover:text-fg"
              }`}
            >
              {strings.portal.filterToLearn} ({unlearnedWords.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("learned")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filterMode === "learned"
                  ? "bg-primary text-fg shadow-2xs font-semibold"
                  : "text-muted hover:text-fg"
              }`}
            >
              {strings.portal.filterLearned} ({words.length - unlearnedWords.length})
            </button>
          </div>

          {/* Sort selector */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as "recent" | "alpha")}
            className="rounded-xl border border-border-strong bg-elevated px-3 py-1.5 text-xs text-fg outline-none focus:border-accent"
          >
            <option value="recent">{strings.portal.sortRecent}</option>
            <option value="alpha">{strings.portal.sortAlphabetical}</option>
          </select>
        </div>
      </div>

      {/* Vocabulary Cards Grid */}
      {filteredWords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-elevated p-12 text-center text-sm text-fg-secondary space-y-2">
          <BookMarked className="mx-auto size-8 text-muted opacity-50" />
          <p>{searchQuery ? strings.portal.noWordsFound : strings.portal.tabs.words}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredWords.map((word) => (
            <div
              key={word.id}
              className={`flex flex-col justify-between rounded-2xl border bg-elevated p-5 space-y-4 transition-all ${
                word.learned
                  ? "border-border-subtle opacity-90"
                  : "border-border-subtle hover:border-border-strong"
              }`}
            >
              <div className="space-y-2.5">
                {/* Term & Audio Pronunciation */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-fg">
                      {word.term}
                    </h3>
                    {isSpeechSupported() && (
                      <button
                        type="button"
                        onClick={() => speak(word.term)}
                        title={strings.portal.listenPronunciation}
                        className="rounded-full p-1.5 text-muted hover:text-accent hover:bg-accent-muted transition-colors"
                      >
                        <Volume2 className="size-4" />
                      </button>
                    )}
                  </div>

                  {word.learned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                      <Check className="size-3" />
                      {strings.portal.learnedBadge}
                    </span>
                  )}
                </div>

                {/* Meaning / Translation */}
                {word.meaning && (
                  <p className="text-sm font-medium text-fg-secondary">
                    {word.meaning}
                  </p>
                )}

                {/* Context Example sentence */}
                {word.example && (
                  <p className="text-xs text-muted italic leading-relaxed">
                    “{word.example}”
                  </p>
                )}
              </div>

              {/* Bottom footer: Seen in classes & Learned toggle */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  {word.sessionIds.length > 0
                    ? strings.portal.seenInClasses(word.sessionIds.length)
                    : "Vocabulary bank"}
                </span>

                {/* "I know this" action button (RF06, CA06) */}
                <button
                  type="button"
                  onClick={() => handleToggleLearned(word)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    word.learned
                      ? "border border-border-subtle text-muted hover:text-fg hover:border-border-strong"
                      : "bg-accent-muted text-accent hover:bg-accent hover:text-primary font-semibold"
                  }`}
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>
                    {word.learned ? strings.portal.markToLearn : strings.portal.markLearned}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Practice Flashcards Modal (RF07, CA07) */}
      {isPracticing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border-strong bg-elevated p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  {strings.portal.practiceModalTitle}
                </span>
                <p className="text-xs text-muted">
                  {strings.portal.practiceCardOf(
                    Math.min(currentCardIndex + 1, practiceCards.length),
                    practiceCards.length,
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPracticing(false)}
                className="rounded-full p-1.5 text-muted hover:text-fg transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Practice Content */}
            {practiceFinished ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="font-display text-2xl font-medium text-fg">
                  Session Completed!
                </h3>
                <p className="text-sm text-fg-secondary">
                  You reviewed {practiceCards.length} {practiceCards.length === 1 ? "word" : "words"} and marked {cardsKnewCount} as learned!
                </p>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    onClick={() => setIsPracticing(false)}
                    className="h-10 px-6 text-xs font-semibold"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              practiceCards[currentCardIndex] && (
                <div className="space-y-6">
                  {/* Flashcard container */}
                  <div
                    onClick={() => setIsCardFlipped((prev) => !prev)}
                    className="relative cursor-pointer min-h-55 rounded-2xl border-2 border-border-subtle bg-primary p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all hover:border-accent shadow-xs select-none"
                  >
                    {!isCardFlipped ? (
                      /* FRONT: Term + Audio */
                      <div className="space-y-4">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                          Word / Expression
                        </span>
                        <div className="flex items-center justify-center gap-3">
                          <h2 className="font-display text-3xl sm:text-4xl font-bold text-fg">
                            {practiceCards[currentCardIndex].term}
                          </h2>
                          {isSpeechSupported() && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speak(practiceCards[currentCardIndex].term);
                              }}
                              className="rounded-full p-2 text-muted hover:text-accent hover:bg-accent-muted transition-colors"
                            >
                              <Volume2 className="size-5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted pt-2 flex items-center justify-center gap-1">
                          <RotateCw className="size-3" />
                          <span>Click to reveal meaning</span>
                        </p>
                      </div>
                    ) : (
                      /* BACK: Meaning + Example */
                      <div className="space-y-4">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-accent">
                          Meaning & Context
                        </span>
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-fg">
                          {practiceCards[currentCardIndex].meaning || practiceCards[currentCardIndex].term}
                        </h2>
                        {practiceCards[currentCardIndex].example && (
                          <p className="text-sm text-fg-secondary italic max-w-sm">
                            “{practiceCards[currentCardIndex].example}”
                          </p>
                        )}
                        <p className="text-xs text-muted pt-2 flex items-center justify-center gap-1">
                          <RotateCw className="size-3" />
                          <span>Click to flip back</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Rating / Navigation controls */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => handlePracticeRating(false)}
                      className="flex-1 h-11 text-xs font-semibold"
                    >
                      <span>Still learning</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handlePracticeRating(true)}
                      className="flex-1 h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <Check className="size-4 mr-1.5" />
                      <span>I know this!</span>
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
