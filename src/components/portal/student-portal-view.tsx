"use client";

import {
  BookMarked,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  Flame,
  ArrowLeft,
  FileText,
  GraduationCap,
  LogOut,
  Milestone,
  Share2,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import type { Student } from "@/lib/classes/types";
import type { StudentNote } from "@/lib/notes/types";
import { consolidatePortalNotes } from "@/lib/portal/consolidate";
import {
  formatClassSummaryForWhatsApp,
  getSharedStudentNotes,
  getStudentClassHistory,
  getStudentRecordsForPortal,
} from "@/lib/portal/repository";
import type {
  StudentClassHistoryItem,
} from "@/lib/portal/types";
import { StudentVocabularyTab } from "@/components/portal/student-vocabulary-tab";
import { StudentTracksTab } from "@/components/portal/student-tracks-tab";
import { StudentScheduleTab } from "@/components/portal/student-schedule-tab";
import { DailyReviewModal } from "@/components/portal/daily-review-modal";
import { PrintableReportView } from "@/components/reports/printable-report-view";
import { getStudentReports } from "@/lib/reports/repository";
import type { ProgressReportSnapshot } from "@/lib/reports/types";
import { getStudentVocabulary } from "@/lib/vocabulary/repository";
import {
  calculateStreak,
  getTodayDateString,
  isWordDue,
} from "@/lib/vocabulary/srs";
import type { StudentWord } from "@/lib/vocabulary/types";
import { strings } from "@/lib/strings";

export function StudentPortalView() {
  const { user, signOut } = useAuth();
  const toast = useToast();

  const [studentRecords, setStudentRecords] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [classHistory, setClassHistory] = useState<StudentClassHistoryItem[]>([]);
  const [vocabulary, setVocabulary] = useState<StudentWord[]>([]);
  const [reports, setReports] = useState<ProgressReportSnapshot[]>([]);
  const [selectedReport, setSelectedReport] = useState<ProgressReportSnapshot | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "schedule" | "tracks" | "words" | "history" | "reports"
  >("overview");
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  // 1. Load all student documents linked to this portalUid
  useEffect(() => {
    if (!user) return;

    let active = true;

    getStudentRecordsForPortal(user.uid)
      .then((records) => {
        if (!active) return;
        setStudentRecords(records);
        if (records.length > 0) {
          setSelectedStudentId((prev) =>
            prev && records.some((r) => r.id === prev) ? prev : records[0]!.id,
          );
        } else {
          setSelectedStudentId(null);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading student portal records:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  // 2. Load shared notes and class history for selected student
  useEffect(() => {
    let active = true;

    if (!selectedStudentId) {
      Promise.resolve().then(() => {
        if (active) {
          setNotes([]);
          setClassHistory([]);
          setVocabulary([]);
          setReports([]);
          setSelectedReport(null);
        }
      });
      return () => {
        active = false;
      };
    }

    Promise.all([
      getSharedStudentNotes(selectedStudentId),
      getStudentClassHistory(selectedStudentId),
      getStudentVocabulary(selectedStudentId).catch(() => []),
      getStudentReports(selectedStudentId).catch(() => []),
    ])
      .then(([loadedNotes, loadedClasses, loadedVocab, loadedReports]) => {
        if (!active) return;
        setNotes(loadedNotes);
        setClassHistory(loadedClasses);
        setVocabulary(loadedVocab);
        setReports(loadedReports.filter((r) => !r.revoked));
      })
      .catch((err) => {
        if (!active) return;
        console.warn("Error loading student notes/history/vocab:", err);
        setNotes([]);
        setClassHistory([]);
        setVocabulary([]);
      });

    return () => {
      active = false;
    };
  }, [selectedStudentId]);

  const selectedStudent =
    studentRecords.find((r) => r.id === selectedStudentId) || studentRecords[0] || null;

  const todayStr = useMemo(() => getTodayDateString(), []);
  const dueWords = useMemo(
    () => vocabulary.filter((w) => isWordDue(w, todayStr)),
    [vocabulary, todayStr],
  );
  const streak = useMemo(() => {
    const dates = vocabulary
      .map((w) => w.lastReviewedAt?.slice(0, 10))
      .filter((d): d is string => Boolean(d));
    return calculateStreak(dates, todayStr);
  }, [vocabulary, todayStr]);

  const { strengths, toReview, mastered } = consolidatePortalNotes(notes);

  const toggleClassExpand = (id: string) => {
    setExpandedClasses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyClassSummary = async (item: StudentClassHistoryItem) => {
    if (!selectedStudent) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const portalUrl = `${origin}/student`;
    const text = formatClassSummaryForWhatsApp({
      studentName: selectedStudent.name,
      date: item.date,
      durationMinutes: item.durationMinutes,
      activities: item.activities,
      words: item.words,
      boardText: item.boardText,
      notes: notes.filter((n) => n.sessionId === item.sessionId),
      portalUrl,
    });

    try {
      await navigator.clipboard.writeText(text);
      toast(strings.portal.summaryCopied);
    } catch {
      // Fallback
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-225 space-y-8 px-4 py-12">
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  // Not connected to a teacher yet (RF08, CA07)
  if (!selectedStudent || studentRecords.length === 0) {
    return (
      <div className="mx-auto w-full max-w-162.5 px-4 py-16 text-center">
        <div className="rounded-3xl border border-dashed border-border-strong bg-elevated p-8 sm:p-12 space-y-5 shadow-xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent-muted text-accent">
            <GraduationCap className="size-7" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-fg">
            {strings.portal.notConnectedTitle}
          </h1>
          <p className="text-sm text-fg-secondary leading-relaxed max-w-md mx-auto">
            {strings.portal.notConnectedDesc}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/activities"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-primary hover:opacity-90"
            >
              <span>{strings.portal.practiceCatalog}</span>
            </Link>
            <Button variant="ghost" onClick={() => void signOut()} className="min-h-11 px-4 text-xs">
              <LogOut className="size-4 mr-1.5" />
              <span>Log out</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-225 space-y-8 px-4 py-8 sm:py-10">
      {/* Top navigation & greeting banner */}
      <header className="rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              <GraduationCap className="size-4" />
              {strings.portal.title}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-medium text-fg">
              {strings.portal.welcome(selectedStudent.name)}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/activities"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-subtle bg-primary px-4 text-xs font-medium text-fg hover:border-accent"
            >
              <span>{strings.portal.practiceCatalog}</span>
              <ExternalLink className="size-3 text-muted" />
            </Link>
            <Button
              variant="ghost"
              onClick={() => void signOut()}
              className="h-10 px-3 text-xs text-muted hover:text-fg"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        {/* Teacher selector (RF03, CA08: when student has multiple teachers) */}
        {studentRecords.length > 1 && (
          <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center gap-3">
            <label
              htmlFor="teacher-selector"
              className="text-xs font-semibold text-fg-secondary uppercase tracking-wider"
            >
              {strings.portal.teacherSelector}:
            </label>
            <select
              id="teacher-selector"
              value={selectedStudentId || ""}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="rounded-xl border border-border-strong bg-primary px-3 py-1.5 text-xs font-medium text-fg outline-none focus:border-accent"
            >
              {studentRecords.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  Teacher {idx + 1} ({s.name})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-border-subtle pt-2 gap-6">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "overview"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <Compass className="size-4" />
            <span>{strings.portal.tabs.overview}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "schedule"}
            onClick={() => setActiveTab("schedule")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "schedule"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <Calendar className="size-4" />
            <span>Schedule</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "tracks"}
            onClick={() => setActiveTab("tracks")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "tracks"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <Milestone className="size-4" />
            <span>{strings.portal.tabs.tracks}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "words"}
            onClick={() => setActiveTab("words")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "words"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <BookMarked className="size-4" />
            <span>{strings.portal.tabs.words}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "history"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <Calendar className="size-4" />
            <span>
              {strings.portal.tabs.history} ({classHistory.length})
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "reports"}
            onClick={() => setActiveTab("reports")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "reports"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <FileText className="size-4" />
            <span>
              Reports ({reports.length})
            </span>
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Daily Review Card (RF01, CA01) */}
          <section className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-r from-accent/15 via-primary to-accent/10 p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-accent text-primary">
                    <Zap className="size-4 fill-current" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Daily Spaced Review
                  </span>
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-500">
                      <Flame className="size-3.5 fill-current" />
                      {streak}-day streak
                    </span>
                  )}
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-fg">
                  {dueWords.length > 0
                    ? `${dueWords.length} words to review today`
                    : "All words reviewed for today!"}
                </h2>
                <p className="text-xs text-muted max-w-md">
                  {dueWords.length > 0
                    ? "Keep your vocabulary fresh with 2 minutes of spaced repetition flashcards."
                    : "Great job keeping up with your studies! Come back tomorrow for new reviews."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => setIsReviewOpen(true)}
                  disabled={dueWords.length === 0}
                  className="font-semibold gap-2 shadow-md min-h-[44px]"
                >
                  <Sparkles className="size-4" />
                  Start review
                </Button>
              </div>
            </div>
          </section>

          {/* Block 1: Strengths (RF04, CA03) */}
          <section className="rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-7 space-y-4 shadow-xs">
            <h2 className="flex items-center gap-2.5 font-display text-xl sm:text-2xl font-medium text-fg">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent-muted text-accent">
                <Trophy className="size-4" />
              </span>
              {strings.portal.strengthsTitle}
              {strengths.length > 0 && (
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                  {strengths.length}
                </span>
              )}
            </h2>

            {strengths.length === 0 ? (
              <p className="text-sm text-fg-secondary italic py-2">
                {strings.portal.strengthsEmpty}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {strengths.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-primary p-4"
                  >
                    <Sparkles className="size-4 text-accent shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-fg">{note.text}</p>
                      {note.correction && (
                        <p className="text-xs text-muted">{note.correction}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Block 2: To Review & Mastered (RF04, RF06, CA03, CA05) */}
          <section className="rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-7 space-y-5 shadow-xs">
            <h2 className="flex items-center gap-2.5 font-display text-xl sm:text-2xl font-medium text-fg">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent-muted text-accent">
                <Compass className="size-4" />
              </span>
              {strings.portal.toReviewTitle}
              {toReview.length > 0 && (
                <span className="rounded-full bg-error/15 px-2.5 py-0.5 text-xs font-semibold text-error">
                  {toReview.length}
                </span>
              )}
            </h2>

            {toReview.length === 0 ? (
              <p className="text-sm text-fg-secondary italic py-2">
                {strings.portal.toReviewEmpty}
              </p>
            ) : (
              <div className="space-y-3">
                {toReview.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-primary p-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium capitalize text-fg-secondary border border-border-subtle">
                          {item.category}
                        </span>
                        {/* Recurring badge (RF06, CA05: "seen in 3 classes") */}
                        {item.count > 1 && (
                          <span className="rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold">
                            {strings.portal.seenInClasses(item.count)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-fg">
                        {item.correction || item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mastered Section (RF06, CA05) */}
            {mastered.length > 0 && (
              <div className="pt-4 border-t border-border-subtle space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-success uppercase tracking-wider">
                  <CheckCircle2 className="size-4" />
                  {strings.portal.masteredTitle} ({mastered.length})
                </h3>
                <div className="space-y-2">
                  {mastered.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-2.5 text-xs"
                    >
                      <span className="font-medium text-fg line-through opacity-80">
                        {item.correction || item.text}
                      </span>
                      <span className="text-[11px] text-success font-medium shrink-0">
                        {strings.portal.seenInClasses(item.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Block 3: Homework (RF04) */}
          <section className="rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-7 space-y-3 shadow-xs">
            <h2 className="flex items-center gap-2.5 font-display text-xl font-medium text-fg">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent-muted text-accent">
                <BookOpen className="size-3.5" />
              </span>
              {strings.portal.homeworkTitle}
            </h2>
            <div className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-xs text-muted">
              {strings.portal.homeworkEmpty}
            </div>
          </section>

          {/* Block 4: My progress (RF04) */}
          {selectedStudent && (
            <StudentTracksTab studentId={selectedStudent.id} />
          )}
        </div>
      )}

      {activeTab === "schedule" && selectedStudent && (
        <StudentScheduleTab teacherUid={selectedStudent.teacherUid} studentId={selectedStudent.id} />
      )}

      {activeTab === "tracks" && selectedStudent && (
        <StudentTracksTab studentId={selectedStudent.id} />
      )}

      {activeTab === "words" && selectedStudent && (
        <StudentVocabularyTab studentId={selectedStudent.id} />
      )}

      {activeTab === "history" && (
        /* Tab 3: Class History (RF05, CA04) */
        <section className="space-y-4">
          {classHistory.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border-strong bg-elevated p-12 text-center text-sm text-fg-secondary">
              {strings.portal.classHistoryEmpty}
            </div>
          ) : (
            <div className="space-y-4">
              {classHistory.map((item) => {
                const isExpanded = expandedClasses[item.id] ?? true;
                const dateStr = item.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const sessionNotes = notes.filter((n) => n.sessionId === item.sessionId);

                return (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-border-subtle bg-elevated p-5 sm:p-6 space-y-4 shadow-xs"
                  >
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-accent border border-border-subtle">
                          <Calendar className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-medium text-fg">
                            {dateStr}
                          </h3>
                          {item.durationMinutes && (
                            <span className="flex items-center gap-1 text-xs text-muted">
                              <Clock className="size-3" />
                              {strings.portal.duration(item.durationMinutes)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleCopyClassSummary(item)}
                          className="h-8 px-2.5 text-xs text-muted hover:text-fg"
                          title="Copy summary for WhatsApp (RF09)"
                        >
                          <Share2 className="size-3.5 mr-1 text-accent" />
                          <span>{strings.portal.copySummaryButton}</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => toggleClassExpand(item.id)}
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                          className="flex size-8 items-center justify-center rounded-full text-muted hover:text-fg"
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detailed session content (RF05, CA04) */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-border-subtle space-y-4 text-xs">
                        {/* Activities */}
                        {item.activities && item.activities.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-semibold uppercase tracking-wider text-muted text-[10px]">
                              {strings.portal.activitiesPracticed}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {item.activities.map((act) => (
                                <Link
                                  key={act.id}
                                  href={act.slug ? `/play/${act.slug}` : "/activities"}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-primary px-3 py-1 text-fg hover:border-accent"
                                >
                                  <span>{act.title}</span>
                                  <ExternalLink className="size-2.5 text-muted" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Words */}
                        {item.words && item.words.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-semibold uppercase tracking-wider text-muted text-[10px]">
                              {strings.portal.wordsLearned}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.words.map((w, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-md bg-secondary px-2 py-0.5 text-fg font-medium"
                                >
                                  {w}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Whiteboard notes */}
                        {item.boardText && item.boardText.trim() && (
                          <div className="space-y-1.5">
                            <span className="font-semibold uppercase tracking-wider text-muted text-[10px]">
                              {strings.portal.whiteboardNotes}
                            </span>
                            <div className="rounded-xl bg-primary p-3 font-mono text-[11px] text-fg whitespace-pre-wrap border border-border-subtle">
                              {item.boardText}
                            </div>
                          </div>
                        )}

                        {/* Individual shared notes for this student */}
                        {sessionNotes.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-semibold uppercase tracking-wider text-muted text-[10px]">
                              {strings.portal.individualNotes}
                            </span>
                            <div className="space-y-1.5">
                              {sessionNotes.map((n) => (
                                <div
                                  key={n.id}
                                  className="flex items-start gap-2 rounded-xl bg-primary p-2.5 border border-border-subtle"
                                >
                                  <Sparkles className="size-3.5 text-accent shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-medium text-fg">{n.text}</span>
                                    {n.correction && (
                                      <span className="text-muted ml-2">→ {n.correction}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Reports Tab Content (RF07, CA08) */}
      {activeTab === "reports" && (
        <section className="space-y-6">
          {selectedReport ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedReport(null)}
                className="gap-2 text-xs no-print text-muted hover:text-fg"
              >
                <ArrowLeft className="size-4" />
                <span>Back to reports list</span>
              </Button>
              <PrintableReportView
                report={selectedReport}
                onPrint={() => window.print()}
                showPrintButton={true}
              />
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border-subtle p-12 text-center text-xs text-muted">
              No progress reports have been shared with you yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="rounded-3xl border border-border-subtle bg-elevated p-6 space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs uppercase font-bold text-accent tracking-wider">
                        Progress Report
                      </span>
                      <h3 className="font-display text-xl font-semibold text-fg mt-0.5">
                        {rep.period.label}
                      </h3>
                      <span className="text-xs text-muted block mt-1">
                        Teacher: {rep.teacherName}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setSelectedReport(rep)}
                      className="gap-1.5 text-xs bg-accent text-primary hover:bg-accent/90"
                    >
                      <FileText className="size-3.5" />
                      <span>View Report</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle text-xs">
                    {rep.metrics.lessons && (
                      <div className="rounded-xl bg-primary/40 p-2.5">
                        <span className="text-muted block text-[11px]">Lessons</span>
                        <span className="font-semibold text-fg">{rep.metrics.lessons.displayString}</span>
                      </div>
                    )}
                    {rep.metrics.homework && (
                      <div className="rounded-xl bg-primary/40 p-2.5">
                        <span className="text-muted block text-[11px]">Homework</span>
                        <span className="font-semibold text-fg">{rep.metrics.homework.displayString}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Daily Spaced Repetition Review Modal (RF02, RF03, CA02, CA03) */}
      {selectedStudentId && (
        <DailyReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          studentId={selectedStudentId}
          words={vocabulary}
          onFinished={() => {
            if (selectedStudentId) {
              getStudentVocabulary(selectedStudentId)
                .then(setVocabulary)
                .catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
