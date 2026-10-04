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

export interface Student {
  id: string;
  teacherUid: string;
  name: string;
  email?: string;
  classIds: string[];
  portalUid?: string;
  homeworkPin: string; // SHA-256 hex hash
  createdAt: Date;
}

export interface CreatedStudentResult {
  student: Student;
  rawPin: string;
}
