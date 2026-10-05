import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type {
  LearningTrack,
  StudentTrackProgress,
  TrackStepCompletion,
  TrackStepSource,
} from "./types";

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof (val as { toDate?: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return new Date();
}

export function mapTrackDoc(id: string, data: DocumentData): LearningTrack {
  return {
    id,
    name: data.name || "Untitled Track",
    description: data.description || undefined,
    level: data.level || undefined,
    activityIds: Array.isArray(data.activityIds) ? data.activityIds : [],
    countClassActivities: Boolean(data.countClassActivities),
    assignedStudentIds: Array.isArray(data.assignedStudentIds) ? data.assignedStudentIds : [],
    assignedClassIds: Array.isArray(data.assignedClassIds) ? data.assignedClassIds : [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function mapStudentTrackProgressDoc(
  id: string,
  data: DocumentData,
): StudentTrackProgress {
  const rawCompleted = data.completed && typeof data.completed === "object" ? data.completed : {};
  const completed: Record<string, TrackStepCompletion> = {};

  for (const [actId, item] of Object.entries(rawCompleted)) {
    if (item && typeof item === "object") {
      const entry = item as Record<string, unknown>;
      completed[actId] = {
        at: entry.at
          ? typeof entry.at === "string"
            ? entry.at
            : toDate(entry.at).toISOString()
          : new Date().toISOString(),
        source: entry.source === "homework" || entry.source === "class" ? entry.source : "manual",
      };
    }
  }

  return {
    trackId: id,
    trackName: data.trackName || "Untitled Track",
    activityIds: Array.isArray(data.activityIds) ? data.activityIds : [],
    countClassActivities: Boolean(data.countClassActivities),
    completed,
    assignedAt: toDate(data.assignedAt),
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
  };
}

/**
 * Gets all learning tracks created by a teacher.
 */
export async function getTeacherTracks(teacherUid: string): Promise<LearningTrack[]> {
  const db = getDb();
  const tracksRef = collection(db, `users/${teacherUid}/tracks`);
  const snap = await getDocs(tracksRef);
  const tracks = snap.docs.map((d) => mapTrackDoc(d.id, d.data()));
  return tracks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Gets a single track by ID.
 */
export async function getTrack(
  teacherUid: string,
  trackId: string,
): Promise<LearningTrack | null> {
  const db = getDb();
  const trackRef = doc(db, `users/${teacherUid}/tracks`, trackId);
  const snap = await getDoc(trackRef);
  if (!snap.exists()) return null;
  return mapTrackDoc(snap.id, snap.data());
}

export interface CreateTrackInput {
  name: string;
  description?: string;
  level?: string;
  activityIds: string[];
  countClassActivities?: boolean;
}

/**
 * Creates a new learning track for a teacher (RF01).
 */
export async function createTrack(
  teacherUid: string,
  input: CreateTrackInput,
): Promise<LearningTrack> {
  const db = getDb();
  const tracksCol = collection(db, `users/${teacherUid}/tracks`);
  const newRef = doc(tracksCol);
  const now = new Date();

  const payload: Record<string, unknown> = {
    name: input.name.trim().slice(0, 60),
    activityIds: input.activityIds.slice(0, 30),
    countClassActivities: Boolean(input.countClassActivities),
    assignedStudentIds: [],
    assignedClassIds: [],
    createdAt: now,
    updatedAt: now,
  };

  if (input.description?.trim()) {
    payload.description = input.description.trim().slice(0, 300);
  }
  if (input.level?.trim()) {
    payload.level = input.level.trim();
  }

  await setDoc(newRef, payload);

  return {
    id: newRef.id,
    name: payload.name as string,
    description: payload.description as string | undefined,
    level: payload.level as string | undefined,
    activityIds: payload.activityIds as string[],
    countClassActivities: Boolean(payload.countClassActivities),
    assignedStudentIds: [],
    assignedClassIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a track from an existing favorite list (RF02, CA01).
 */
export async function createTrackFromList(
  teacherUid: string,
  list: { id: string; name: string },
  activityIds: string[],
): Promise<LearningTrack> {
  return createTrack(teacherUid, {
    name: list.name.slice(0, 60),
    activityIds: activityIds.slice(0, 30),
    countClassActivities: false,
  });
}

/**
 * Updates a learning track and syncs changes to all assigned students (RF08, RNF02, CA02, CA07).
 */
export async function updateTrack(
  teacherUid: string,
  trackId: string,
  updates: Partial<LearningTrack>,
): Promise<void> {
  const db = getDb();
  const trackRef = doc(db, `users/${teacherUid}/tracks`, trackId);
  const now = new Date();

  const docUpdates: Record<string, unknown> = {
    updatedAt: now,
  };

  if (updates.name !== undefined) {
    docUpdates.name = updates.name.trim().slice(0, 60);
  }
  if (updates.description !== undefined) {
    docUpdates.description = updates.description.trim().slice(0, 300) || "";
  }
  if (updates.level !== undefined) {
    docUpdates.level = updates.level.trim();
  }
  if (updates.activityIds !== undefined) {
    docUpdates.activityIds = updates.activityIds.slice(0, 30);
  }
  if (updates.countClassActivities !== undefined) {
    docUpdates.countClassActivities = Boolean(updates.countClassActivities);
  }
  if (updates.assignedStudentIds !== undefined) {
    docUpdates.assignedStudentIds = updates.assignedStudentIds;
  }
  if (updates.assignedClassIds !== undefined) {
    docUpdates.assignedClassIds = updates.assignedClassIds;
  }

  await updateDoc(trackRef, docUpdates);

  // Sync to assigned students if activityIds or name or countClassActivities changed
  const needStudentSync =
    updates.activityIds !== undefined ||
    updates.name !== undefined ||
    updates.countClassActivities !== undefined;

  if (needStudentSync) {
    const trackSnap = await getDoc(trackRef);
    if (!trackSnap.exists()) return;
    const trackData = trackSnap.data();
    const assignedIds: string[] = Array.isArray(trackData.assignedStudentIds)
      ? trackData.assignedStudentIds
      : [];

    if (assignedIds.length > 0) {
      const studentPayload: Record<string, unknown> = {
        updatedAt: now,
      };
      if (updates.name !== undefined) studentPayload.trackName = docUpdates.name;
      if (updates.activityIds !== undefined) studentPayload.activityIds = docUpdates.activityIds;
      if (updates.countClassActivities !== undefined)
        studentPayload.countClassActivities = docUpdates.countClassActivities;

      // Batch in groups of 450 (under 500 limit, RNF02)
      const BATCH_SIZE = 450;
      for (let i = 0; i < assignedIds.length; i += BATCH_SIZE) {
        const chunk = assignedIds.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        for (const sId of chunk) {
          const sTrackRef = doc(db, `students/${sId}/tracks`, trackId);
          batch.update(sTrackRef, studentPayload);
        }
        await batch.commit();
      }
    }
  }
}

/**
 * Deletes a learning track and removes it from assigned students.
 */
export async function deleteTrack(teacherUid: string, trackId: string): Promise<void> {
  const db = getDb();
  const trackRef = doc(db, `users/${teacherUid}/tracks`, trackId);
  const trackSnap = await getDoc(trackRef);

  if (trackSnap.exists()) {
    const data = trackSnap.data();
    const assignedStudentIds: string[] = Array.isArray(data.assignedStudentIds)
      ? data.assignedStudentIds
      : [];

    if (assignedStudentIds.length > 0) {
      const BATCH_SIZE = 450;
      for (let i = 0; i < assignedStudentIds.length; i += BATCH_SIZE) {
        const chunk = assignedStudentIds.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        for (const sId of chunk) {
          const sTrackRef = doc(db, `students/${sId}/tracks`, trackId);
          batch.delete(sTrackRef);
        }
        await batch.commit();
      }
    }
  }

  await deleteDoc(trackRef);
}

/**
 * Assigns a track to students and/or whole classes (RF03, CA03).
 */
export async function assignTrackToStudents(
  teacherUid: string,
  track: LearningTrack,
  targetStudentIds: string[],
  targetClassIds: string[] = [],
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const uniqueStudents = Array.from(new Set(targetStudentIds));
  if (uniqueStudents.length === 0) return;

  const BATCH_SIZE = 450;
  for (let i = 0; i < uniqueStudents.length; i += BATCH_SIZE) {
    const chunk = uniqueStudents.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const sId of chunk) {
      const sTrackRef = doc(db, `students/${sId}/tracks`, track.id);
      batch.set(
        sTrackRef,
        {
          trackId: track.id,
          trackName: track.name,
          activityIds: track.activityIds,
          countClassActivities: Boolean(track.countClassActivities),
          completed: {},
          assignedAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
    }
    await batch.commit();
  }

  // Update track document's assigned lists
  const currentAssignedStudents = new Set(track.assignedStudentIds || []);
  uniqueStudents.forEach((id) => currentAssignedStudents.add(id));

  const currentAssignedClasses = new Set(track.assignedClassIds || []);
  targetClassIds.forEach((id) => currentAssignedClasses.add(id));

  const trackRef = doc(db, `users/${teacherUid}/tracks`, track.id);
  await updateDoc(trackRef, {
    assignedStudentIds: Array.from(currentAssignedStudents),
    assignedClassIds: Array.from(currentAssignedClasses),
    updatedAt: now,
  });
}

/**
 * Unassigns a track from a student.
 */
export async function unassignTrackFromStudent(
  teacherUid: string,
  trackId: string,
  studentId: string,
): Promise<void> {
  const db = getDb();
  const sTrackRef = doc(db, `students/${studentId}/tracks`, trackId);
  await deleteDoc(sTrackRef);

  const trackRef = doc(db, `users/${teacherUid}/tracks`, trackId);
  const trackSnap = await getDoc(trackRef);
  if (trackSnap.exists()) {
    const data = trackSnap.data();
    const assignedStudentIds = (Array.isArray(data.assignedStudentIds)
      ? data.assignedStudentIds
      : []
    ).filter((id: string) => id !== studentId);

    await updateDoc(trackRef, {
      assignedStudentIds,
      updatedAt: new Date(),
    });
  }
}

/**
 * Gets all assigned tracks for a specific student.
 */
export async function getStudentTracks(studentId: string): Promise<StudentTrackProgress[]> {
  const db = getDb();
  const tracksRef = collection(db, `students/${studentId}/tracks`);
  const snap = await getDocs(tracksRef);
  return snap.docs.map((d) => mapStudentTrackProgressDoc(d.id, d.data()));
}

/**
 * Gets a specific track progress doc for a student.
 */
export async function getStudentTrack(
  studentId: string,
  trackId: string,
): Promise<StudentTrackProgress | null> {
  const db = getDb();
  const sTrackRef = doc(db, `students/${studentId}/tracks`, trackId);
  const snap = await getDoc(sTrackRef);
  if (!snap.exists()) return null;
  return mapStudentTrackProgressDoc(snap.id, snap.data());
}

/**
 * Toggles or sets step completion for a student (RF05, CA04).
 * When completed: true, sets source (manual, homework, class) and timestamp.
 * When completed: false, removes the step from completed.
 */
export async function setStepCompletion(
  studentId: string,
  trackId: string,
  activityId: string,
  completed: boolean,
  source: TrackStepSource = "manual",
): Promise<void> {
  const db = getDb();
  const sTrackRef = doc(db, `students/${studentId}/tracks`, trackId);
  const now = new Date();

  if (completed) {
    await updateDoc(sTrackRef, {
      [`completed.${activityId}`]: {
        at: now.toISOString(),
        source,
      },
      updatedAt: now,
    });
  } else {
    await updateDoc(sTrackRef, {
      [`completed.${activityId}`]: deleteField(),
      updatedAt: now,
    });
  }
}

export interface StudentTrackMatrixRow {
  studentId: string;
  progress: StudentTrackProgress | null;
}

/**
 * Fetches progress for a list of students on a specific track (RF07, CA06).
 */
export async function getTrackClassMatrix(
  trackId: string,
  studentIds: string[],
): Promise<StudentTrackMatrixRow[]> {
  const db = getDb();
  const results = await Promise.all(
    studentIds.map(async (studentId) => {
      const sTrackRef = doc(db, `students/${studentId}/tracks`, trackId);
      const snap = await getDoc(sTrackRef);
      return {
        studentId,
        progress: snap.exists() ? mapStudentTrackProgressDoc(snap.id, snap.data()) : null,
      };
    }),
  );
  return results;
}
