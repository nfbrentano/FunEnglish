export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday
export type LessonMode = "online" | "in-person";
export type LessonStatus = "scheduled" | "done" | "no-show" | "cancelled";
export type CancelReason = "by-student" | "by-teacher" | "holiday" | "other";

export interface ScheduleRule {
  id: string; // Document ID in students/{studentId}/schedule/{id}
  studentId: string; // the parent student
  weekday: Weekday;
  startTime: string; // HH:mm format
  durationMin: number;
  mode: LessonMode;
  validFrom?: Date;
  validUntil?: Date;
}

export interface Lesson {
  id: string; // e.g. ruleId_yyyy-MM-dd or extra_yyyy-MM-dd...
  studentId: string;
  studentName: string;
  ruleId?: string; // If undefined, it's an extra lesson
  originalStart?: Date; // If rescheduled, when was it originally?
  start: Date;
  durationMin: number;
  mode: LessonMode;
  status: LessonStatus;
  cancelReason?: CancelReason;
  sessionId?: string;
  extra: boolean;
}
