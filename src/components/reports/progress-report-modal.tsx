"use client";

import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Globe,
  Link as LinkIcon,
  Plus,
  Printer,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import type { Student } from "@/lib/classes/types";
import { getBillingPlan, getLedgerEntries } from "@/lib/billing/repository";
import type { BillingPlan, LedgerEntry } from "@/lib/billing/types";
import { getStudentHomeworkSubmissions } from "@/lib/homework/repository";
import type { StudentHomeworkRecord } from "@/lib/homework/types";
import { getStudentNotes } from "@/lib/notes/repository";
import type { StudentNote } from "@/lib/notes/types";
import {
  buildProgressReport,
  calculatePeriodRange,
} from "@/lib/reports/build-report";
import {
  generateShareToken,
  getStudentReports,
  revokeReportShare,
  saveProgressReport,
} from "@/lib/reports/repository";
import type {
  ProgressReportSnapshot,
  ReportLanguage,
  ReportPeriodType,
  ReportSectionKey,
} from "@/lib/reports/types";
import { getStudentLessons } from "@/lib/schedule/repository";
import type { Lesson } from "@/lib/schedule/types";
import { getPastSessions } from "@/lib/session/repository";
import type { ClassroomSession } from "@/lib/session/types";
import { getStudentTracks } from "@/lib/tracks/repository";
import type { StudentTrackProgress } from "@/lib/tracks/types";
import { getStudentVocabulary } from "@/lib/vocabulary/repository";
import type { StudentWord } from "@/lib/vocabulary/types";
import { PrintableReportView } from "./printable-report-view";

export interface ProgressReportModalProps {
  open: boolean;
  student: Student;
  onClose: () => void;
}

export function ProgressReportModal({
  open,
  student,
  onClose,
}: ProgressReportModalProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [activeView, setActiveView] = useState<"configure" | "preview" | "past">("configure");

  // Config state
  const [periodType, setPeriodType] = useState<ReportPeriodType>("last-month");
  const [language, setLanguage] = useState<ReportLanguage>("en");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split("T")[0]);

  const [enabledSections, setEnabledSections] = useState<Record<ReportSectionKey, boolean>>({
    lessons: true,
    summaries: true,
    activities: true,
    homework: true,
    vocabulary: true,
    notes: true,
    tracks: true,
    package: false, // CA11: off by default
  });

  const [teacherComment, setTeacherComment] = useState("");
  const [nextGoals, setNextGoals] = useState<string[]>([]);
  const [newGoalInput, setNewGoalInput] = useState("");

  // Raw data fetched
  const [loadingData, setLoadingData] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [homeworks, setHomeworks] = useState<StudentHomeworkRecord[]>([]);
  const [vocabulary, setVocabulary] = useState<StudentWord[]>([]);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [tracks, setTracks] = useState<StudentTrackProgress[]>([]);
  const [billingPlan, setBillingPlan] = useState<BillingPlan | undefined>();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  // Past saved reports
  const [savedReports, setSavedReports] = useState<ProgressReportSnapshot[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSharedUrl, setLastSharedUrl] = useState<string | null>(null);

  // Load all student data
  useEffect(() => {
    if (!open || !user || !student.id) return;

    let active = true;
    setLoadingData(true);

    Promise.all([
      getStudentLessons(user.uid, student.id).catch(() => []),
      getPastSessions(user.uid, undefined, student.id).catch(() => []),
      getStudentHomeworkSubmissions(student.id).catch(() => []),
      getStudentVocabulary(student.id).catch(() => []),
      getStudentNotes(student.id).catch(() => []),
      getStudentTracks(student.id).catch(() => []),
      getBillingPlan(student.id).catch(() => undefined),
      getLedgerEntries(student.id).catch(() => []),
      getStudentReports(student.id).catch(() => []),
    ])
      .then(
        ([
          loadedLessons,
          loadedSessions,
          loadedHomeworks,
          loadedVocab,
          loadedNotes,
          loadedTracks,
          loadedBilling,
          loadedLedger,
          loadedReports,
        ]) => {
          if (!active) return;
          setLessons(loadedLessons);
          setSessions(loadedSessions);
          setHomeworks(loadedHomeworks);
          setVocabulary(loadedVocab);
          setNotes(loadedNotes);
          setTracks(loadedTracks);
          setBillingPlan(loadedBilling || undefined);
          setLedger(loadedLedger);
          setSavedReports(loadedReports);
        },
      )
      .catch((err) => {
        console.error("Error loading report source data:", err);
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [open, user, student.id]);

  // Compute live report snapshot
  const currentSnapshot = useMemo(() => {
    const customRange =
      periodType === "custom"
        ? { from: new Date(`${customFrom}T00:00:00`), to: new Date(`${customTo}T23:59:59`) }
        : undefined;

    return buildProgressReport({
      student: {
        id: student.id,
        name: student.name,
        level: student.level,
        goal: student.goal,
      },
      teacherName: user?.displayName || "Teacher",
      language,
      periodType,
      customRange,
      enabledSections,
      lessons,
      sessions,
      homeworkSubmissions: homeworks,
      vocabulary,
      notes,
      tracks,
      billingPlan,
      ledger,
      teacherComment,
      nextGoals,
    });
  }, [
    student,
    user?.displayName,
    language,
    periodType,
    customFrom,
    customTo,
    enabledSections,
    lessons,
    sessions,
    homeworks,
    vocabulary,
    notes,
    tracks,
    billingPlan,
    ledger,
    teacherComment,
    nextGoals,
  ]);

  if (!open) return null;

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const g = newGoalInput.trim();
    if (!g || nextGoals.length >= 3) return;
    setNextGoals((prev) => [...prev, g]);
    setNewGoalInput("");
  };

  const handleRemoveGoal = (index: number) => {
    setNextGoals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleSection = (key: ReportSectionKey) => {
    setEnabledSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveAndShare = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const token = generateShareToken();
      await saveProgressReport(student.id, currentSnapshot, token);

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/report/${token}`;
      setLastSharedUrl(shareUrl);
      await navigator.clipboard.writeText(shareUrl);

      toast("Report snapshot saved and share link copied to clipboard!");
      // Refresh saved list
      const updatedReports = await getStudentReports(student.id);
      setSavedReports(updatedReports);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error saving report");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (report: ProgressReportSnapshot) => {
    if (!window.confirm("Are you sure you want to revoke this shared link? Anyone with the link will no longer be able to view it.")) {
      return;
    }
    try {
      await revokeReportShare(student.id, report.id, report.shareTokenHash);
      toast("Report link revoked successfully.");
      const updatedReports = await getStudentReports(student.id);
      setSavedReports(updatedReports);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error revoking report");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-border-subtle bg-elevated shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle p-5 sm:p-6 bg-primary/40 no-print">
          <div>
            <h2 id="report-modal-title" className="font-display text-2xl font-medium text-fg">
              Progress Report · {student.name}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Generate monthly progress reviews, export clean A4 PDFs, or share read-only links.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 bg-primary/20 no-print">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveView("configure")}
              className={`py-3 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                activeView === "configure"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              Configure & Edit
            </button>
            <button
              type="button"
              onClick={() => setActiveView("preview")}
              className={`py-3 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                activeView === "preview"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              Preview & Print
            </button>
            <button
              type="button"
              onClick={() => setActiveView("past")}
              className={`py-3 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                activeView === "past"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              Past Snapshots ({savedReports.length})
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setActiveView("preview");
                setTimeout(() => window.print(), 100);
              }}
              className="text-xs gap-1.5 h-8"
            >
              <Printer className="size-3.5" />
              <span>Print / PDF</span>
            </Button>

            <Button
              size="sm"
              disabled={saving}
              onClick={handleSaveAndShare}
              className="text-xs gap-1.5 h-8 bg-accent text-primary hover:bg-accent/90"
            >
              <Share2 className="size-3.5" />
              <span>{saving ? "Saving…" : "Save & Share Link"}</span>
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeView === "configure" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Period & Language Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-fg">Period</label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as ReportPeriodType)}
                    className="w-full rounded-xl border border-border-subtle bg-primary px-3 py-2 text-xs font-medium text-fg focus:border-accent focus:outline-none"
                  >
                    <option value="last-month">Last Month</option>
                    <option value="last-3-months">Last 3 Months</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-fg">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as ReportLanguage)}
                    className="w-full rounded-xl border border-border-subtle bg-primary px-3 py-2 text-xs font-medium text-fg focus:border-accent focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
              </div>

              {/* Custom dates if selected */}
              {periodType === "custom" && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-primary/30 border border-border-subtle">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted">From</span>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full rounded-lg border border-border-subtle bg-primary p-2 text-xs text-fg"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted">To</span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full rounded-lg border border-border-subtle bg-primary p-2 text-xs text-fg"
                    />
                  </div>
                </div>
              )}

              {/* Sections to Include */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-fg block">Include Sections</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { key: "lessons", label: "Lessons & Attendance" },
                      { key: "summaries", label: "Shared Summaries" },
                      { key: "homework", label: "Homework" },
                      { key: "vocabulary", label: "Vocabulary" },
                      { key: "notes", label: "Feedback & Notes" },
                      { key: "tracks", label: "Tracks" },
                      { key: "package", label: "Package Balance" },
                    ] as const
                  ).map((sec) => (
                    <label
                      key={sec.key}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                        enabledSections[sec.key]
                          ? "border-accent/40 bg-accent/5 text-fg"
                          : "border-border-subtle bg-primary/20 text-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={enabledSections[sec.key]}
                        onChange={() => handleToggleSection(sec.key)}
                        className="rounded border-border-strong text-accent focus:ring-accent"
                      />
                      <span>{sec.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Teacher Comment (RF03, CA03) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-fg">
                    Teacher&apos;s Evaluation & Comments
                  </label>
                  <span className="text-[11px] text-muted">{teacherComment.length}/1000</span>
                </div>
                <textarea
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value.slice(0, 1000))}
                  rows={4}
                  maxLength={1000}
                  placeholder="Share highlights of the student's progress, strengths observed, areas of growth, and encouragement..."
                  className="w-full rounded-2xl border border-border-subtle bg-primary p-3.5 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              {/* Next Goals (RF03, CA03) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-fg">Next Goals (up to 3)</label>
                <div className="space-y-2">
                  {nextGoals.map((g, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-border-subtle bg-primary/40 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-full bg-accent/20 text-accent font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-fg font-medium">{g}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGoal(idx)}
                        className="text-muted hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}

                  {nextGoals.length < 3 && (
                    <form onSubmit={handleAddGoal} className="flex gap-2">
                      <input
                        type="text"
                        value={newGoalInput}
                        onChange={(e) => setNewGoalInput(e.target.value)}
                        placeholder="e.g. Master conditionals, expand business vocabulary..."
                        className="flex-1 rounded-xl border border-border-subtle bg-primary px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
                      />
                      <Button
                        type="submit"
                        disabled={!newGoalInput.trim()}
                        className="h-9 px-3 text-xs gap-1"
                      >
                        <Plus className="size-3.5" />
                        <span>Add</span>
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* View Preview Button */}
              <div className="pt-4 border-t border-border-subtle flex justify-end">
                <Button
                  onClick={() => setActiveView("preview")}
                  className="gap-2 bg-accent text-primary hover:bg-accent/90"
                >
                  <span>Preview Full Report</span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {activeView === "preview" && (
            <div className="space-y-6">
              {lastSharedUrl && (
                <div className="flex items-center justify-between rounded-2xl bg-success/10 border border-success/30 p-3.5 text-xs text-fg">
                  <span className="font-medium">Active shareable link: {lastSharedUrl}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(lastSharedUrl);
                      toast("Link copied!");
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </Button>
                </div>
              )}
              <PrintableReportView report={currentSnapshot} showPrintButton={false} />
            </div>
          )}

          {activeView === "past" && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <h3 className="text-sm font-semibold text-fg">Previously Generated Reports</h3>
              {savedReports.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted border border-dashed border-border-subtle rounded-2xl">
                  No snapshots saved yet. Generate one from the Configure tab.
                </div>
              ) : (
                <div className="space-y-3">
                  {savedReports.map((rep) => {
                    const dateStr = rep.createdAt
                      ? new Date(rep.createdAt).toLocaleDateString()
                      : "Recently";
                    const isRevoked = Boolean(rep.revoked);

                    return (
                      <div
                        key={rep.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-border-subtle bg-primary/20 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-fg">
                              {rep.period.label} ({rep.language.toUpperCase()})
                            </span>
                            {isRevoked ? (
                              <span className="rounded-full bg-destructive/15 text-destructive text-[10px] px-2 py-0.5 font-semibold">
                                Revoked
                              </span>
                            ) : (
                              <span className="rounded-full bg-success/15 text-success text-[10px] px-2 py-0.5 font-semibold">
                                Active Link
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted block">
                            Generated on {dateStr} · {rep.metrics.lessons?.displayString || "No lessons"}{" "}
                            · {rep.metrics.homework?.displayString || "No homework"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isRevoked && rep.shareToken && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const url = `${window.location.origin}/report/${rep.shareToken}`;
                                navigator.clipboard.writeText(url);
                                toast("Link copied!");
                              }}
                              className="h-8 text-xs gap-1"
                            >
                              <Copy className="size-3.5" />
                              <span>Copy Link</span>
                            </Button>
                          )}

                          {!isRevoked && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRevoke(rep)}
                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
