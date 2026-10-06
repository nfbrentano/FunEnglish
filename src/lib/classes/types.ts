export const MAX_CLASSES_PER_TEACHER = 100;
export const MAX_STUDENTS_PER_TEACHER = 500;
export const MAX_STUDENTS_PER_CLASS = 60;
export const MAX_CLASS_NAME_LENGTH = 60;

export interface TeacherClass {
  id: string;
  name: string;
  studentIds: string[];
  archived: boolean;
  createdAt: Date;
}

export type StudentLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type StudentGoal = "Travel" | "Work" | "Exam" | "Conversation" | "School" | "Other";
export type StudentStatus = "Active" | "Paused" | "Former";
export type SessionMode = "online" | "in-person";

export interface Student {
  id: string;
  teacherUid: string;
  name: string;
  email?: string;
  classIds: string[];
  portalUid?: string;
  homeworkPin: string; // SHA-256 hex hash
  createdAt: Date;
  
  // Spec 17 fields for 1:1 and profile
  level?: StudentLevel;
  goal?: StudentGoal;
  goalNote?: string;
  interests?: string[];
  defaultMode?: SessionMode;
  status?: StudentStatus;
  startedAt?: Date;
  lastLessonAt?: Date;
}

export interface CreatedStudentResult {
  student: Student;
  rawPin: string;
}

export interface StudentPrivateProfile {
  phone?: string;
  meetingUrl?: string;
  address?: string;
  privateNotes?: string;
}
