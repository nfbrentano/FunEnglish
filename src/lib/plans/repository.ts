import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type {
  CreatePlanInput,
  Plan,
  PlanItem,
  PlanStatus,
  PlanTargetType,
} from "./types";

interface FirestoreDateLike {
  toDate?: () => Date;
  seconds?: number;
}

function toDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (
    typeof val === "object" &&
    "toDate" in val &&
    typeof (val as FirestoreDateLike).toDate === "function"
  ) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (
    typeof val === "object" &&
    "seconds" in val &&
    typeof (val as FirestoreDateLike).seconds === "number"
  ) {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

/**
 * Maps a Firestore document to Plan, guaranteeing backwards compatibility for old plans (RNF06).
 */
export function mapPlanDoc(id: string, data: DocumentData): Plan {
  const targetType: PlanTargetType =
    (data.targetType as PlanTargetType) || (data.studentId ? "student" : "class");

  const items: PlanItem[] = Array.isArray(data.items)
    ? data.items.map((it: Record<string, unknown>) => ({
        kind: it.kind === "block" ? "block" : "activity",
        activityId: typeof it.activityId === "string" ? it.activityId : undefined,
        title: String(it.title || ""),
        minutes: Number(it.minutes) || 10,
      }))
    : [];

  return {
    id,
    targetType,
    classId: typeof data.classId === "string" ? data.classId : undefined,
    studentId: typeof data.studentId === "string" ? data.studentId : undefined,
    lessonId: typeof data.lessonId === "string" ? data.lessonId : undefined,
    title: String(data.title || ""),
    goal: typeof data.goal === "string" ? data.goal : undefined,
    scheduledFor: toDate(data.scheduledFor),
    durationMin: typeof data.durationMin === "number" ? data.durationMin : undefined,
    items,
    words: Array.isArray(data.words) ? data.words.map(String) : [],
    status: (data.status as PlanStatus) || "draft",
    sessionId: typeof data.sessionId === "string" ? data.sessionId : undefined,
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

/**
 * Creates a new lesson plan.
 */
export async function createPlan(
  teacherUid: string,
  input: CreatePlanInput,
): Promise<Plan> {
  const db = getDb();
  const plansCol = collection(db, `users/${teacherUid}/plans`);
  const planRef = doc(plansCol);
  const now = new Date();

  const data: Record<string, unknown> = {
    targetType: input.targetType,
    title: input.title.trim(),
    items: input.items,
    words: input.words || [],
    status: input.status || "draft",
    updatedAt: now,
  };

  if (input.targetType === "student" && input.studentId) {
    data.studentId = input.studentId;
  } else if (input.targetType === "class" && input.classId) {
    data.classId = input.classId;
  }

  if (input.lessonId) data.lessonId = input.lessonId;
  if (input.goal?.trim()) data.goal = input.goal.trim();
  if (input.scheduledFor) data.scheduledFor = input.scheduledFor;
  if (typeof input.durationMin === "number") data.durationMin = input.durationMin;
  if (input.sessionId) data.sessionId = input.sessionId;

  await setDoc(planRef, data);

  return mapPlanDoc(planRef.id, data);
}

/**
 * Updates an existing plan.
 */
export async function updatePlan(
  teacherUid: string,
  planId: string,
  updates: Partial<CreatePlanInput>,
): Promise<void> {
  const db = getDb();
  const planRef = doc(db, `users/${teacherUid}/plans`, planId);
  const payload: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.goal !== undefined) payload.goal = updates.goal?.trim() || null;
  if (updates.targetType !== undefined) payload.targetType = updates.targetType;
  if (updates.classId !== undefined) payload.classId = updates.classId || null;
  if (updates.studentId !== undefined) payload.studentId = updates.studentId || null;
  if (updates.lessonId !== undefined) payload.lessonId = updates.lessonId || null;
  if (updates.scheduledFor !== undefined) payload.scheduledFor = updates.scheduledFor || null;
  if (updates.durationMin !== undefined) payload.durationMin = updates.durationMin || null;
  if (updates.items !== undefined) payload.items = updates.items;
  if (updates.words !== undefined) payload.words = updates.words;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.sessionId !== undefined) payload.sessionId = updates.sessionId || null;

  await updateDoc(planRef, payload);
}

/**
 * Deletes a plan.
 */
export async function deletePlan(teacherUid: string, planId: string): Promise<void> {
  const db = getDb();
  const planRef = doc(db, `users/${teacherUid}/plans`, planId);
  await deleteDoc(planRef);
}

/**
 * Fetches a single plan.
 */
export async function getPlan(teacherUid: string, planId: string): Promise<Plan | null> {
  const db = getDb();
  const planRef = doc(db, `users/${teacherUid}/plans`, planId);
  const snap = await getDoc(planRef);
  if (!snap.exists()) return null;
  return mapPlanDoc(snap.id, snap.data());
}

/**
 * Fetches all plans for a specific class.
 */
export async function getPlansByClass(teacherUid: string, classId: string): Promise<Plan[]> {
  const db = getDb();
  const plansCol = collection(db, `users/${teacherUid}/plans`);
  const q = query(plansCol, where("classId", "==", classId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapPlanDoc(d.id, d.data()));
}

/**
 * Fetches all plans for a specific student.
 */
export async function getPlansByStudent(teacherUid: string, studentId: string): Promise<Plan[]> {
  const db = getDb();
  const plansCol = collection(db, `users/${teacherUid}/plans`);
  const q = query(plansCol, where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapPlanDoc(d.id, d.data()));
}

/**
 * Returns upcoming (draft) plans for a class, ordered by scheduledFor or updatedAt (RF08, CA07).
 */
export async function getUpcomingPlansForClass(
  teacherUid: string,
  classId: string,
): Promise<Plan[]> {
  const all = await getPlansByClass(teacherUid, classId);
  return all
    .filter((p) => p.status === "draft")
    .sort((a, b) => {
      const timeA = a.scheduledFor ? a.scheduledFor.getTime() : a.updatedAt.getTime();
      const timeB = b.scheduledFor ? b.scheduledFor.getTime() : b.updatedAt.getTime();
      return timeA - timeB;
    });
}

/**
 * Returns upcoming (draft) plans for a student, ordered by scheduledFor or updatedAt (RF08, CA07).
 */
export async function getUpcomingPlansForStudent(
  teacherUid: string,
  studentId: string,
): Promise<Plan[]> {
  const all = await getPlansByStudent(teacherUid, studentId);
  return all
    .filter((p) => p.status === "draft")
    .sort((a, b) => {
      const timeA = a.scheduledFor ? a.scheduledFor.getTime() : a.updatedAt.getTime();
      const timeB = b.scheduledFor ? b.scheduledFor.getTime() : b.updatedAt.getTime();
      return timeA - timeB;
    });
}

/**
 * Marks a plan as used by a session.
 */
export async function markPlanUsed(
  teacherUid: string,
  planId: string,
  sessionId: string,
): Promise<void> {
  const db = getDb();
  const planRef = doc(db, `users/${teacherUid}/plans`, planId);
  await updateDoc(planRef, {
    status: "used",
    sessionId,
    updatedAt: new Date(),
  });
}

/**
 * Duplicates a plan for another student or class (RF07).
 */
export async function duplicatePlan(
  teacherUid: string,
  plan: Plan,
  target: { targetType: PlanTargetType; classId?: string; studentId?: string },
): Promise<Plan> {
  return createPlan(teacherUid, {
    targetType: target.targetType,
    classId: target.classId,
    studentId: target.studentId,
    title: `${plan.title} (Copy)`,
    goal: plan.goal,
    durationMin: plan.durationMin,
    items: plan.items.map((it) => ({ ...it })),
    words: [...plan.words],
    status: "draft",
  });
}

/**
 * Creates a plan from a learning track in the exact same order (RF07, CA06).
 */
export async function createPlanFromTrack(
  teacherUid: string,
  track: { name: string; activityIds: string[] },
  target: { targetType: PlanTargetType; classId?: string; studentId?: string },
  getCatalogTitle?: (activityId: string) => string,
): Promise<Plan> {
  const items: PlanItem[] = track.activityIds.slice(0, 15).map((actId) => ({
    kind: "activity",
    activityId: actId,
    title: getCatalogTitle ? getCatalogTitle(actId) : actId,
    minutes: 10,
  }));

  return createPlan(teacherUid, {
    targetType: target.targetType,
    classId: target.classId,
    studentId: target.studentId,
    title: `Plan: ${track.name}`,
    goal: `Follow track: ${track.name}`,
    items,
    words: [],
    status: "draft",
  });
}

/**
 * Creates a plan from a list of favorite activities (RF07).
 */
export async function createPlanFromFavorites(
  teacherUid: string,
  title: string,
  activityIds: string[],
  target: { targetType: PlanTargetType; classId?: string; studentId?: string },
  getCatalogTitle?: (activityId: string) => string,
): Promise<Plan> {
  const items: PlanItem[] = activityIds.slice(0, 15).map((actId) => ({
    kind: "activity",
    activityId: actId,
    title: getCatalogTitle ? getCatalogTitle(actId) : actId,
    minutes: 10,
  }));

  return createPlan(teacherUid, {
    targetType: target.targetType,
    classId: target.classId,
    studentId: target.studentId,
    title,
    items,
    words: [],
    status: "draft",
  });
}
