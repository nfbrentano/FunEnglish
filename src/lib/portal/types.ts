import type { NoteCategory, StudentNote } from "@/lib/notes/types";

export interface StudentClassActivityItem {
  id: string;
  title: string;
  slug?: string;
}

export interface StudentClassHistoryItem {
  id: string;
  sessionId: string;
  className?: string;
  date: Date;
  durationMinutes?: number;
  activities: StudentClassActivityItem[];
  words?: string[];
  boardText?: string;
  classNotes?: string;
  studentNotes?: StudentNote[];
}

export interface ConsolidatedError {
  key: string;
  text: string;
  correction?: string;
  category: NoteCategory;
  count: number;
  classDates: string[];
  resolved: boolean;
  notes: StudentNote[];
}

export interface ConsolidatedPortalFeedback {
  strengths: StudentNote[];
  toReview: ConsolidatedError[];
  mastered: ConsolidatedError[];
}
