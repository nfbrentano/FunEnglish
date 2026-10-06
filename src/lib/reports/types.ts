import type { StudentGoal, StudentLevel } from "@/lib/classes/types";

export type ReportPeriodType = "last-month" | "last-3-months" | "custom";
export type ReportLanguage = "en" | "pt";

export type ReportSectionKey =
  | "lessons"
  | "summaries"
  | "activities"
  | "homework"
  | "vocabulary"
  | "notes"
  | "tracks"
  | "package";

export interface PeriodRange {
  type: ReportPeriodType;
  from: string; // ISO string
  to: string; // ISO string
  label: string;
}

export interface ReportLessonsMetrics {
  totalScheduled: number;
  done: number;
  noShow: number;
  cancelled: number;
  attendancePct: number;
  displayString: string;
  items?: Array<{
    date: string;
    status: string;
    mode?: string;
  }>;
}

export interface ReportHomeworkMetrics {
  totalAssigned: number;
  completedCount: number;
  averageScorePct: number;
  lateCount: number;
  displayString: string;
  items?: Array<{
    title: string;
    scorePct: number;
    completedAt: string;
    late: boolean;
  }>;
}

export interface ReportVocabularyMetrics {
  newWordsCount: number;
  masteredWordsCount: number;
  displayString: string;
  sampleWords?: string[];
}

export interface ReportNotesMetrics {
  sharedStrengths: Array<{ text: string }>;
  recurringErrorsResolved: Array<{ text: string; correction?: string }>;
  recurringErrorsOpen: Array<{ text: string; correction?: string }>;
}

export interface ReportLessonSummaryItem {
  date: string;
  summary: string;
  nextFocus?: string;
}

export interface ReportTrackItem {
  trackId: string;
  name: string;
  currentPct: number;
  completedActivities: number;
  totalActivities: number;
}

export interface ReportPackageMetrics {
  totalCredits?: number;
  usedCredits?: number;
  remainingCredits?: number;
}

export interface ProgressReportMetrics {
  lessons?: ReportLessonsMetrics;
  homework?: ReportHomeworkMetrics;
  vocabulary?: ReportVocabularyMetrics;
  notes?: ReportNotesMetrics;
  summaries?: ReportLessonSummaryItem[];
  tracks?: ReportTrackItem[];
  package?: ReportPackageMetrics;
}

export interface ProgressReportSnapshot {
  id: string;
  studentId: string;
  studentFirstName: string;
  teacherName: string;
  language: ReportLanguage;
  studentLevel?: StudentLevel;
  studentGoal?: StudentGoal;
  period: PeriodRange;
  enabledSections: Record<ReportSectionKey, boolean>;
  metrics: ProgressReportMetrics;
  teacherComment?: string;
  nextGoals?: string[];
  shareTokenHash?: string;
  shareToken?: string;
  revoked: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface PublicReportData {
  tokenHash: string;
  studentId: string;
  reportId: string;
  revoked: boolean;
  snapshot: ProgressReportSnapshot;
  createdAt: any;
  updatedAt: any;
}
