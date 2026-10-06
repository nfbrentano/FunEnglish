import type { StudentNote } from "@/lib/notes/types";

export type SessionStatus = "active" | "ended" | "draft";

export type SessionTab = "timer" | "board" | "picker" | "notes" | "students" | "live";

export interface SessionActivity {
  id: string;
  title: string;
  timestamp: number;
}

export interface SessionWord {
  term: string;
  meaning?: string;
  example?: string;
}

export interface SessionLiveResult {
  studentName: string;
  studentId?: string;
  correctCount: number;
  totalQuestions: number;
  score: number;
}

export type SessionKind = "class" | "one-to-one";
export type SessionMode = "online" | "in-person";

export interface ClassroomSession {
  id: string;
  teacherUid: string;
  kind?: SessionKind; // optional for backwards compatibility, defaults to "class"
  classId?: string;
  className?: string;
  studentId?: string;
  studentName?: string;
  mode?: SessionMode;
  summary?: string;
  nextFocus?: string;
  summaryShared?: boolean;
  startedAt: Date;
  endedAt?: Date;
  status: SessionStatus;
  attendance: Record<string, boolean>; // studentId -> isPresent
  activitiesPlayed: SessionActivity[];
  newWords: SessionWord[];
  notes: StudentNote[];
  boardText?: string;
  durationMinutes?: number;
  classNotes?: string;
  lastActivityAt?: Date;
  liveRoomCode?: string;
  liveResults?: Record<string, SessionLiveResult>;
}

export interface SessionEndReviewData {
  attendance: Record<string, boolean>;
  activities: SessionActivity[];
  words: SessionWord[];
  notes: StudentNote[];
  boardText?: string;
  classNotes?: string;
  durationMinutes: number;
  liveResults?: Record<string, SessionLiveResult>;
}

export const SESSION_LOCAL_STORAGE_PREFIX = "fun-english-active-session";
