import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type {
  Homework,
  HomeworkSubmission,
  PinLockoutInfo,
  StudentHomeworkRecord,
} from "./types";

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val.toDate === "function") return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return new Date();
}

export function mapHomeworkDoc(id: string, data: DocumentData): Homework {
  return {
    id,
    teacherUid: data.teacherUid,
    activityId: data.activityId,
    activitySlug: data.activitySlug || "",
    activityTitle: data.activityTitle || "",
    activityType: data.activityType || "quiz",
    targetType: data.targetType || "anyone",
    classId: data.classId || null,
    className: data.className || null,
    studentIds: Array.isArray(data.studentIds) ? data.studentIds : [],
    classRoster: Array.isArray(data.classRoster) ? data.classRoster : [],
    dueDate: data.dueDate || null,
    instruction: data.instruction || "",
    allowLate: Boolean(data.allowLate),
    open: Boolean(data.open ?? true),
    createdAt: toDate(data.createdAt),
  };
}

export function mapSubmissionDoc(id: string, data: DocumentData): HomeworkSubmission {
  return {
    id,
    homeworkId: data.homeworkId || "",
    studentId: data.studentId || null,
    studentName: data.studentName || "Anonymous",
    via: data.via || "token",
    portalUid: data.portalUid || null,
    correct: Number(data.correct || 0),
    total: Number(data.total || 0),
    seconds: Number(data.seconds || 0),
    answers: Array.isArray(data.answers) ? data.answers : [],
    completedAt: toDate(data.completedAt),
    late: Boolean(data.late),
  };
}

export function mapStudentRecordDoc(id: string, data: DocumentData): StudentHomeworkRecord {
  return {
    id,
    homeworkId: data.homeworkId,
    activityId: data.activityId,
    activityTitle: data.activityTitle,
    activityType: data.activityType,
    correct: Number(data.correct || 0),
    total: Number(data.total || 0),
    seconds: Number(data.seconds || 0),
    completedAt: toDate(data.completedAt),
    late: Boolean(data.late),
  };
}

/**
 * Loads all homework tasks created by the teacher (RF06, CA05).
 */
export async function getTeacherHomeworkList(teacherUid: string): Promise<Homework[]> {
  const db = getDb();
  const homeworkCol = collection(db, "homework");
  const q = query(
    homeworkCol,
    where("teacherUid", "==", teacherUid),
    orderBy("createdAt", "desc"),
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapHomeworkDoc(d.id, d.data()));
  } catch (err) {
    console.warn("Could not load homework list with orderBy, retrying without order:", err);
    try {
      const fallbackQ = query(homeworkCol, where("teacherUid", "==", teacherUid));
      const snap = await getDocs(fallbackQ);
      return snap.docs
        .map((d) => mapHomeworkDoc(d.id, d.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (fallbackErr) {
      console.warn("Could not load homework list:", fallbackErr);
      return [];
    }
  }
}

/**
 * Loads submissions for a given homework task (RF06, CA05).
 */
export async function getHomeworkSubmissions(homeworkId: string): Promise<HomeworkSubmission[]> {
  const db = getDb();
  const q = query(
    collection(db, `homework/${homeworkId}/submissions`),
    orderBy("completedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapSubmissionDoc(d.id, { ...d.data(), homeworkId }));
}

/**
 * Loads published activity content for question analysis (spec 14: RNF03).
 */
export async function getHomeworkActivityContent(activityId: string): Promise<any | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, "activities", activityId));
  if (!snap.exists()) return null;
  return snap.data()?.content ?? null;
}

/**
 * Toggles homework open/closed status manually (RF07).
 */
export async function toggleHomeworkOpen(homeworkId: string, open: boolean): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, `homework/${homeworkId}`), { open });
}

/**
 * Updates homework deadline and late submission policy (RF07).
 */
export async function updateHomeworkSettings(
  homeworkId: string,
  updates: { dueDate?: string | null; allowLate?: boolean },
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, `homework/${homeworkId}`), updates);
}

/**
 * Deletes a homework task.
 */
export async function deleteHomeworkTask(homeworkId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, `homework/${homeworkId}`));
}

/**
 * Loads homework submissions associated with a specific student (RF09, CA05).
 */
export async function getStudentHomeworkSubmissions(
  studentId: string,
): Promise<StudentHomeworkRecord[]> {
  const db = getDb();
  const q = query(
    collection(db, `students/${studentId}/homeworkSubmissions`),
    orderBy("completedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapStudentRecordDoc(d.id, d.data()));
}

/**
 * Loads any active PIN lockout warnings for the teacher (RNF09, CA13).
 */
export async function getTeacherPinLockouts(teacherUid: string): Promise<PinLockoutInfo[]> {
  const db = getDb();
  try {
    const q = query(collection(db, "pinAttempts"), where("teacherUid", "==", teacherUid));
    const snap = await getDocs(q);
    const now = Date.now();
    const lockouts: PinLockoutInfo[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      if (data.lockedUntil && now < data.lockedUntil) {
        lockouts.push({
          studentId: data.studentId || d.id,
          studentName: data.studentName || "Student",
          failedCount: data.failedCount || 5,
          lockedUntil: data.lockedUntil,
          lastAttemptAt: data.lastAttemptAt || now,
        });
      }
    }

    return lockouts;
  } catch (err) {
    console.warn("Could not query pin lockouts:", err);
    return [];
  }
}
