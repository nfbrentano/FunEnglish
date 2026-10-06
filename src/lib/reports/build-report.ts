import type { StudentGoal, StudentLevel } from "@/lib/classes/types";
import type { Homework, StudentHomeworkRecord } from "@/lib/homework/types";
import { normalizeNoteKey } from "@/lib/notes/recurring";
import type { StudentNote } from "@/lib/notes/types";
import type { Lesson } from "@/lib/schedule/types";
import type { ClassroomSession } from "@/lib/session/types";
import type { StudentTrackProgress } from "@/lib/tracks/types";
import type { StudentWord } from "@/lib/vocabulary/types";
import type { BillingPlan, LedgerEntry } from "@/lib/billing/types";
import type {
  PeriodRange,
  ProgressReportMetrics,
  ProgressReportSnapshot,
  ReportHomeworkMetrics,
  ReportLanguage,
  ReportLessonsMetrics,
  ReportLessonSummaryItem,
  ReportNotesMetrics,
  ReportPackageMetrics,
  ReportPeriodType,
  ReportSectionKey,
  ReportTrackItem,
  ReportVocabularyMetrics,
} from "./types";

export interface BuildProgressReportInput {
  id?: string;
  student: {
    id: string;
    name: string;
    level?: StudentLevel;
    goal?: StudentGoal;
  };
  teacherName: string;
  language?: ReportLanguage;
  periodType: ReportPeriodType;
  customRange?: { from: Date; to: Date };
  referenceDate?: Date; // For mocking or testing
  enabledSections?: Partial<Record<ReportSectionKey, boolean>>;
  lessons?: Lesson[];
  sessions?: ClassroomSession[];
  homeworkSubmissions?: StudentHomeworkRecord[];
  assignedHomeworks?: Homework[];
  vocabulary?: StudentWord[];
  notes?: StudentNote[];
  tracks?: StudentTrackProgress[];
  billingPlan?: BillingPlan;
  ledger?: LedgerEntry[];
  teacherComment?: string;
  nextGoals?: string[];
  shareTokenHash?: string;
  shareToken?: string;
  revoked?: boolean;
}

/**
 * Calculates start and end Date for a given period type.
 */
export function calculatePeriodRange(
  periodType: ReportPeriodType,
  customRange?: { from: Date; to: Date },
  referenceDate?: Date,
): { from: Date; to: Date; label: { en: string; pt: string } } {
  const ref = referenceDate ? new Date(referenceDate) : new Date();

  if (periodType === "custom" && customRange) {
    const from = new Date(customRange.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(customRange.to);
    to.setHours(23, 59, 59, 999);

    const fStr = from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const tStr = to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return {
      from,
      to,
      label: {
        en: `${fStr} – ${tStr}`,
        pt: `${from.toLocaleDateString("pt-BR")} – ${to.toLocaleDateString("pt-BR")}`,
      },
    };
  }

  if (periodType === "last-3-months") {
    // 3 months prior to ref
    const from = new Date(ref.getFullYear(), ref.getMonth() - 3, 1, 0, 0, 0, 0);
    // Until end of last month or today
    const to = new Date(ref.getFullYear(), ref.getMonth(), 0, 23, 59, 59, 999);

    const monthNameFrom = from.toLocaleDateString("en-US", { month: "long" });
    const monthNameTo = to.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return {
      from,
      to,
      label: {
        en: `${monthNameFrom} – ${monthNameTo}`,
        pt: `${from.toLocaleDateString("pt-BR", { month: "long" })} – ${to.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
      },
    };
  }

  // "last-month" default: Full previous calendar month
  const prevMonthIndex = ref.getMonth() - 1;
  const year = prevMonthIndex < 0 ? ref.getFullYear() - 1 : ref.getFullYear();
  const month = (prevMonthIndex + 12) % 12;

  const from = new Date(year, month, 1, 0, 0, 0, 0);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const monthEn = from.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthPt = from.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return {
    from,
    to,
    label: {
      en: monthEn,
      pt: monthPt.charAt(0).toUpperCase() + monthPt.slice(1),
    },
  };
}

/**
 * Extracts student first name safely without returning full name or sensitive private data.
 */
export function extractFirstName(fullName: string): string {
  if (!fullName) return "Student";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
}

/**
 * Pure function that computes progress report metrics and snapshot (RNF01, CA01-CA11).
 */
export function buildProgressReport(input: BuildProgressReportInput): ProgressReportSnapshot {
  const language = input.language || "en";
  const { from, to, label } = calculatePeriodRange(
    input.periodType,
    input.customRange,
    input.referenceDate,
  );

  const fromMs = from.getTime();
  const toMs = to.getTime();

  const enabledSections: Record<ReportSectionKey, boolean> = {
    lessons: input.enabledSections?.lessons ?? true,
    summaries: input.enabledSections?.summaries ?? true,
    activities: input.enabledSections?.activities ?? true,
    homework: input.enabledSections?.homework ?? true,
    vocabulary: input.enabledSections?.vocabulary ?? true,
    notes: input.enabledSections?.notes ?? true,
    tracks: input.enabledSections?.tracks ?? true,
    package: input.enabledSections?.package ?? false, // CA11: off by default
  };

  const metrics: ProgressReportMetrics = {};

  // 1. Lessons & Attendance (RF02, CA01, CA02, CA10)
  if (enabledSections.lessons) {
    if (input.lessons && input.lessons.length > 0) {
      // 1:1 student lessons from schedule
      const periodLessons = input.lessons.filter((l) => {
        const time = l.start instanceof Date ? l.start.getTime() : new Date(l.start).getTime();
        return time >= fromMs && time <= toMs;
      });

      let done = 0;
      let noShow = 0;
      let cancelled = 0;

      for (const l of periodLessons) {
        if (l.status === "done") done++;
        else if (l.status === "no-show") noShow++;
        else if (l.status === "cancelled") cancelled++;
      }

      // Total scheduled consider completed + no-show + cancelled (or done + noShow)
      const scheduledAttended = done + noShow;
      const totalScheduled = scheduledAttended > 0 ? scheduledAttended : periodLessons.length;
      const attendancePct = totalScheduled > 0 ? Math.round((done / totalScheduled) * 100) : 100;

      const displayString =
        language === "pt"
          ? `${done}/${totalScheduled} aulas`
          : `${done}/${totalScheduled} lessons`;

      metrics.lessons = {
        totalScheduled,
        done,
        noShow,
        cancelled,
        attendancePct,
        displayString,
        items: periodLessons.map((l) => ({
          date: new Date(l.start).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US"),
          status: l.status,
          mode: l.mode,
        })),
      };
    } else if (input.sessions && input.sessions.length > 0) {
      // Class student sessions attendance
      const periodSessions = input.sessions.filter((s) => {
        const time = s.startedAt instanceof Date ? s.startedAt.getTime() : new Date(s.startedAt).getTime();
        return time >= fromMs && time <= toMs;
      });

      let done = 0;
      let noShow = 0;

      for (const s of periodSessions) {
        if (s.attendance && s.attendance[input.student.id] === true) {
          done++;
        } else if (s.attendance && s.attendance[input.student.id] === false) {
          noShow++;
        }
      }

      const totalScheduled = done + noShow > 0 ? done + noShow : periodSessions.length;
      const attendancePct = totalScheduled > 0 ? Math.round((done / totalScheduled) * 100) : 100;

      const displayString =
        language === "pt"
          ? `${done}/${totalScheduled} aulas`
          : `${done}/${totalScheduled} lessons`;

      metrics.lessons = {
        totalScheduled,
        done,
        noShow,
        cancelled: 0,
        attendancePct,
        displayString,
      };
    } else {
      metrics.lessons = {
        totalScheduled: 0,
        done: 0,
        noShow: 0,
        cancelled: 0,
        attendancePct: 100,
        displayString: language === "pt" ? "0/0 aulas" : "0/0 lessons",
      };
    }
  }

  // 2. Shared Lesson Summaries (RF02, CA10)
  if (enabledSections.summaries && input.sessions && input.sessions.length > 0) {
    const periodSessions = input.sessions.filter((s) => {
      const time = s.startedAt instanceof Date ? s.startedAt.getTime() : new Date(s.startedAt).getTime();
      return time >= fromMs && time <= toMs;
    });

    // CA10: Only summaries with summaryShared === true!
    const sharedSummaries: ReportLessonSummaryItem[] = periodSessions
      .filter((s) => s.summaryShared === true && Boolean(s.summary?.trim()))
      .map((s) => ({
        date: new Date(s.startedAt).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US"),
        summary: s.summary?.trim() || "",
        nextFocus: s.nextFocus?.trim() || undefined,
      }));

    metrics.summaries = sharedSummaries;
  }

  // 3. Homework (RF02, CA01, CA02)
  if (enabledSections.homework) {
    const submissions = (input.homeworkSubmissions || []).filter((sub) => {
      const time = sub.completedAt instanceof Date ? sub.completedAt.getTime() : new Date(sub.completedAt).getTime();
      return time >= fromMs && time <= toMs;
    });

    const assigned = (input.assignedHomeworks || []).filter((hw) => {
      const time = hw.createdAt instanceof Date ? hw.createdAt.getTime() : new Date(hw.createdAt).getTime();
      return time >= fromMs && time <= toMs;
    });

    const completedCount = submissions.length;
    const totalAssigned = Math.max(assigned.length, completedCount);

    let totalScoreSum = 0;
    let lateCount = 0;

    for (const sub of submissions) {
      if (sub.late) lateCount++;
      if (sub.total > 0) {
        totalScoreSum += (sub.correct / sub.total) * 100;
      }
    }

    const averageScorePct = completedCount > 0 ? Math.round(totalScoreSum / completedCount) : 0;

    const displayString =
      language === "pt"
        ? `${completedCount}/${totalAssigned} tarefas · ${averageScorePct}% de média`
        : `${completedCount}/${totalAssigned} homework · ${averageScorePct}% average`;

    metrics.homework = {
      totalAssigned,
      completedCount,
      averageScorePct,
      lateCount,
      displayString,
      items: submissions.map((sub) => ({
        title: sub.activityTitle,
        scorePct: sub.total > 0 ? Math.round((sub.correct / sub.total) * 100) : 0,
        completedAt: new Date(sub.completedAt).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US"),
        late: sub.late,
      })),
    };
  }

  // 4. Vocabulary (RF02, CA02)
  if (enabledSections.vocabulary && input.vocabulary) {
    const periodWords = input.vocabulary.filter((w) => {
      const addedTime = new Date(w.firstAddedAt).getTime();
      return addedTime >= fromMs && addedTime <= toMs;
    });

    const newWordsCount = periodWords.length;
    const masteredWordsCount = periodWords.filter(
      (w) => w.learned || (w.intervalDays && w.intervalDays >= 21),
    ).length;

    const displayString =
      language === "pt"
        ? `${newWordsCount} novas palavras`
        : `${newWordsCount} new words`;

    metrics.vocabulary = {
      newWordsCount,
      masteredWordsCount,
      displayString,
      sampleWords: periodWords.slice(0, 10).map((w) => w.term),
    };
  }

  // 5. Notes (Strengths & Recurring Errors) (RF02, CA04)
  if (enabledSections.notes && input.notes) {
    // CA04: NEVER include notes with visibility === "private"
    const allowedNotes = input.notes.filter((n) => n.visibility === "shared");

    // Shared strengths
    const sharedStrengths = allowedNotes
      .filter((n) => n.category === "strength")
      .map((n) => ({ text: n.text }));

    // Recurring errors in period or active
    const errorNotes = allowedNotes.filter((n) => n.category !== "strength");

    // Deduplicate recurring errors by normalized key
    const resolvedMap = new Map<string, { text: string; correction?: string }>();
    const openMap = new Map<string, { text: string; correction?: string }>();

    for (const n of errorNotes) {
      const key = normalizeNoteKey(n.text, n.correction);
      if (n.resolved) {
        if (!resolvedMap.has(key)) {
          resolvedMap.set(key, { text: n.text, correction: n.correction });
        }
      } else {
        if (!openMap.has(key)) {
          openMap.set(key, { text: n.text, correction: n.correction });
        }
      }
    }

    metrics.notes = {
      sharedStrengths,
      recurringErrorsResolved: Array.from(resolvedMap.values()),
      recurringErrorsOpen: Array.from(openMap.values()),
    };
  }

  // 6. Tracks (RF02)
  if (enabledSections.tracks && input.tracks) {
    const trackItems: ReportTrackItem[] = input.tracks.map((t) => {
      const totalActivities = t.activityIds?.length || 0;
      const completedActivities = Object.keys(t.completed || {}).length;
      const currentPct = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
      return {
        trackId: t.trackId,
        name: t.trackName,
        currentPct,
        completedActivities,
        totalActivities,
      };
    });
    metrics.tracks = trackItems;
  }

  // 7. Package (RF10, CA11)
  if (enabledSections.package && input.billingPlan) {
    let usedCredits = 0;
    if (input.ledger) {
      for (const entry of input.ledger) {
        const time = entry.at instanceof Date ? entry.at.getTime() : new Date(entry.at).getTime();
        if (time >= fromMs && time <= toMs && entry.type === "lesson") {
          usedCredits += Math.abs(entry.credits || 1);
        }
      }
    }

    metrics.package = {
      totalCredits: (input.billingPlan.creditsBalance || 0) + usedCredits,
      usedCredits,
      remainingCredits: input.billingPlan.creditsBalance || 0,
    };
  }

  const period: PeriodRange = {
    type: input.periodType,
    from: from.toISOString(),
    to: to.toISOString(),
    label: language === "pt" ? label.pt : label.en,
  };

  const now = new Date().toISOString();

  // Validate teacherComment up to 1000 chars, nextGoals up to 3 items (RF03, CA03)
  const teacherComment = input.teacherComment?.trim()
    ? input.teacherComment.trim().slice(0, 1000)
    : undefined;

  const nextGoals = (input.nextGoals || [])
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    id: input.id || `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    studentId: input.student.id,
    studentFirstName: extractFirstName(input.student.name),
    teacherName: input.teacherName,
    language,
    studentLevel: input.student.level,
    studentGoal: input.student.goal,
    period,
    enabledSections,
    metrics,
    teacherComment,
    nextGoals: nextGoals.length > 0 ? nextGoals : undefined,
    shareTokenHash: input.shareTokenHash,
    shareToken: input.shareToken,
    revoked: Boolean(input.revoked),
    createdAt: now,
    updatedAt: now,
  };
}
