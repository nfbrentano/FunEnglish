export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday
export type LessonMode = "online" | "in-person";
export type LessonStatus = "scheduled" | "done" | "no-show" | "cancelled";
export type CancelReason = "by-student" | "by-teacher" | "holiday" | "other";

export type BookedBy = "student" | "teacher";
export type ConfirmationStatus = "pending-student" | "pending-teacher" | "confirmed" | "declined" | "expired";
export type ConfirmedVia = "booking" | "accept" | "join" | "teacher-in-person";

export interface AvailabilityWindow {
  weekday: Weekday;
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface AvailabilityBlock {
  from: Date;
  to: Date;
  reason?: string;
}

export interface AvailabilitySettings {
  windows: AvailabilityWindow[];
  blocks: AvailabilityBlock[];
  bufferMin: number;
  minNoticeHours: number;
  horizonDays: number;
  timezone: string;
}

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

  bookedBy?: BookedBy;
  confirmation?: ConfirmationStatus;
  confirmedAt?: Date;
  confirmedVia?: ConfirmedVia;
  joinedAt?: Date;
}
