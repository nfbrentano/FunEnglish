import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  where,
  getFirestore,
} from "firebase/firestore";
import { ScheduleRule, Lesson, AvailabilitySettings, AvailabilityBlock } from "./types";
import { getDb } from "../firebase";

export async function getStudentScheduleRules(studentId: string): Promise<ScheduleRule[]> {
  const db = getDb();
  const rulesRef = collection(db, `students/${studentId}/schedule`);
  const q = query(rulesRef);
  const snap = await getDocs(q);
  
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId,
      weekday: data.weekday,
      startTime: data.startTime,
      durationMin: data.durationMin,
      mode: data.mode,
      validFrom: data.validFrom?.toDate(),
      validUntil: data.validUntil?.toDate(),
    } as ScheduleRule;
  });
}

export async function saveScheduleRule(rule: ScheduleRule): Promise<void> {
  const db = getDb();
  const ruleRef = doc(db, `students/${rule.studentId}/schedule/${rule.id}`);
  await setDoc(ruleRef, {
    weekday: rule.weekday,
    startTime: rule.startTime,
    durationMin: rule.durationMin,
    mode: rule.mode,
    validFrom: rule.validFrom || null,
    validUntil: rule.validUntil || null,
  });
}

export async function deleteScheduleRule(studentId: string, ruleId: string): Promise<void> {
  const db = getDb();
  const ruleRef = doc(db, `students/${studentId}/schedule/${ruleId}`);
  await deleteDoc(ruleRef);
}

export async function getTeacherLessons(
  teacherUid: string,
  start: Date,
  end: Date
): Promise<Lesson[]> {
  const db = getDb();
  const lessonsRef = collection(db, `users/${teacherUid}/lessons`);
  const q = query(
    lessonsRef,
    where("start", ">=", start),
    where("start", "<=", end)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: data.studentName,
      ruleId: data.ruleId,
      originalStart: data.originalStart?.toDate(),
      start: data.start.toDate(),
      durationMin: data.durationMin,
      mode: data.mode,
      status: data.status,
      cancelReason: data.cancelReason,
      sessionId: data.sessionId,
      extra: data.extra || false,
      bookedBy: data.bookedBy,
      confirmation: data.confirmation,
      confirmedAt: data.confirmedAt?.toDate(),
      confirmedVia: data.confirmedVia,
      joinedAt: data.joinedAt?.toDate(),
    } as Lesson;
  });
}

export async function getStudentLessonsForPortal(
  teacherUid: string,
  studentId: string
): Promise<Lesson[]> {
  const db = getDb();
  const lessonsRef = collection(db, `users/${teacherUid}/lessons`);
  const q = query(lessonsRef, where("studentId", "==", studentId));
  
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: data.studentName,
      ruleId: data.ruleId,
      originalStart: data.originalStart?.toDate(),
      start: data.start.toDate(),
      durationMin: data.durationMin,
      mode: data.mode,
      status: data.status,
      cancelReason: data.cancelReason,
      sessionId: data.sessionId,
      extra: data.extra || false,
      bookedBy: data.bookedBy,
      confirmation: data.confirmation,
      confirmedAt: data.confirmedAt?.toDate(),
      confirmedVia: data.confirmedVia,
      joinedAt: data.joinedAt?.toDate(),
    } as Lesson;
  });
}

export async function saveLesson(teacherUid: string, lesson: Lesson): Promise<void> {
  const db = getDb();
  const lessonRef = doc(db, `users/${teacherUid}/lessons/${lesson.id}`);
  await setDoc(lessonRef, {
    studentId: lesson.studentId,
    studentName: lesson.studentName,
    ruleId: lesson.ruleId || null,
    originalStart: lesson.originalStart || null,
    start: lesson.start,
    durationMin: lesson.durationMin,
    mode: lesson.mode,
    status: lesson.status,
    cancelReason: lesson.cancelReason || null,
    sessionId: lesson.sessionId || null,
    extra: lesson.extra,
    bookedBy: lesson.bookedBy || null,
    confirmation: lesson.confirmation || null,
    confirmedAt: lesson.confirmedAt || null,
    confirmedVia: lesson.confirmedVia || null,
    joinedAt: lesson.joinedAt || null,
  });
}

export async function deleteLesson(teacherUid: string, lessonId: string): Promise<void> {
  const db = getDb();
  const lessonRef = doc(db, `users/${teacherUid}/lessons/${lessonId}`);
  await deleteDoc(lessonRef);
}

export async function getAvailabilitySettings(teacherUid: string): Promise<AvailabilitySettings | null> {
  const db = getDb();
  const docRef = doc(db, `users/${teacherUid}/availability/settings`);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    windows: data.windows || [],
    blocks: (data.blocks || []).map((b: any) => ({
      from: b.from.toDate(),
      to: b.to.toDate(),
      reason: b.reason,
    })),
    bufferMin: data.bufferMin ?? 0,
    minNoticeHours: data.minNoticeHours ?? 12,
    horizonDays: data.horizonDays ?? 30,
    timezone: data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export async function saveAvailabilitySettings(teacherUid: string, settings: AvailabilitySettings): Promise<void> {
  const db = getDb();
  const docRef = doc(db, `users/${teacherUid}/availability/settings`);
  await setDoc(docRef, {
    windows: settings.windows,
    blocks: settings.blocks,
    bufferMin: settings.bufferMin,
    minNoticeHours: settings.minNoticeHours,
    horizonDays: settings.horizonDays,
    timezone: settings.timezone,
  });
}

