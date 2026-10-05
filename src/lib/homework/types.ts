export type HomeworkTargetType = "class" | "students" | "anyone";

export interface HomeworkRosterItem {
  studentId: string;
  firstName: string;
}

export interface Homework {
  id: string;
  teacherUid: string;
  activityId: string;
  activitySlug: string;
  activityTitle: string;
  activityType: string;
  targetType: HomeworkTargetType;
  classId?: string | null;
  className?: string | null;
  studentIds?: string[];
  classRoster?: HomeworkRosterItem[];
  dueDate?: string | null;
  instruction?: string;
  allowLate: boolean;
  open: boolean;
  createdAt: Date;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId?: string | null;
  studentName: string;
  via: "token" | "pin" | "portal" | "anonymous";
  portalUid?: string | null;
  correct: number;
  total: number;
  seconds: number;
  answers?: unknown[];
  completedAt: Date;
  late: boolean;
}

export interface StudentHomeworkRecord {
  id: string;
  homeworkId: string;
  activityId: string;
  activityTitle: string;
  activityType?: string;
  correct: number;
  total: number;
  seconds: number;
  completedAt: Date;
  late: boolean;
}

export interface PinLockoutInfo {
  studentId: string;
  studentName: string;
  failedCount: number;
  lockedUntil: number;
  lastAttemptAt: number;
}
