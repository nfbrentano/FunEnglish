import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { recordSessionVocabulary } from "@/lib/vocabulary/repository";
import type { StudentNote } from "@/lib/notes/types";
import type {
  ClassroomSession,
  SessionEndReviewData,
  SessionStatus,
} from "./types";

interface FirestoreDateLike {
  toDate?: () => Date;
  seconds?: number;
}

function toDate(val: unknown): Date {
  if (val instanceof Date) return val;
  if (
    val &&
    typeof val === "object" &&
    "toDate" in val &&
    typeof (val as FirestoreDateLike).toDate === "function"
  ) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (
    val &&
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
  return new Date();
}

function mapSessionDoc(id: string, data: DocumentData): ClassroomSession {
  return {
    id,
    teacherUid: data.teacherUid,
    classId: data.classId,
    className: data.className || "Class",
    startedAt: toDate(data.startedAt),
    endedAt: data.endedAt ? toDate(data.endedAt) : undefined,
    status: (data.status as SessionStatus) || "active",
    attendance: (data.attendance as Record<string, boolean>) || {},
    activitiesPlayed: Array.isArray(data.activitiesPlayed) ? data.activitiesPlayed : [],
    newWords: Array.isArray(data.newWords) ? data.newWords : [],
    notes: Array.isArray(data.notes)
      ? (data.notes as unknown[]).map((n) => {
          const noteObj = (n && typeof n === "object" ? n : {}) as Record<string, unknown>;
          return {
            ...noteObj,
            createdAt: toDate(noteObj.createdAt),
            updatedAt: toDate(noteObj.updatedAt),
          } as unknown as StudentNote;
        })
      : [],
    boardText: data.boardText || "",
    durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : undefined,
    classNotes: data.classNotes || "",
    lastActivityAt: data.lastActivityAt ? toDate(data.lastActivityAt) : undefined,
  };
}

/**
 * Creates and starts a new classroom session for a class (RF01, CA01).
 * All class students start as present in attendance.
 */
export async function createSession(
  teacherUid: string,
  classId: string,
  className: string,
  studentIds: string[],
): Promise<ClassroomSession> {
  const db = getDb();
  const sessionsCol = collection(db, `users/${teacherUid}/sessions`);
  const sessionRef = doc(sessionsCol);
  const now = new Date();

  const attendance: Record<string, boolean> = {};
  for (const sId of studentIds) {
    attendance[sId] = true;
  }

  const sessionData = {
    teacherUid,
    classId,
    className,
    startedAt: now,
    status: "active",
    attendance,
    activitiesPlayed: [],
    newWords: [],
    notes: [],
    boardText: "",
    classNotes: "",
    lastActivityAt: now,
  };

  await setDoc(sessionRef, sessionData);

  return {
    id: sessionRef.id,
    teacherUid,
    classId,
    className,
    startedAt: now,
    status: "active",
    attendance,
    activitiesPlayed: [],
    newWords: [],
    notes: [],
    boardText: "",
    classNotes: "",
    lastActivityAt: now,
  };
}

/**
 * Gets the current active session for the teacher, if any.
 */
export async function getActiveSession(teacherUid: string): Promise<ClassroomSession | null> {
  const db = getDb();
  const sessionsCol = collection(db, `users/${teacherUid}/sessions`);
  const q = query(
    sessionsCol,
    where("status", "==", "active"),
    orderBy("startedAt", "desc"),
    limit(1),
  );

  try {
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return mapSessionDoc(docSnap.id, docSnap.data());
  } catch (err) {
    console.warn("Could not query active session with orderBy, retrying without order:", err);
    const fallbackQ = query(sessionsCol, where("status", "==", "active"), limit(5));
    const snap = await getDocs(fallbackQ);
    if (snap.empty) return null;
    const sorted = snap.docs
      .map((d) => mapSessionDoc(d.id, d.data()))
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    return sorted[0] || null;
  }
}

/**
 * Updates an active session with debounced partial changes.
 */
export async function updateSession(
  teacherUid: string,
  sessionId: string,
  updates: Partial<ClassroomSession>,
): Promise<void> {
  const db = getDb();
  const sessionRef = doc(db, `users/${teacherUid}/sessions`, sessionId);

  const payload: Record<string, unknown> = {
    lastActivityAt: new Date(),
  };

  if (updates.attendance !== undefined) payload.attendance = updates.attendance;
  if (updates.activitiesPlayed !== undefined) payload.activitiesPlayed = updates.activitiesPlayed;
  if (updates.newWords !== undefined) payload.newWords = updates.newWords;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.boardText !== undefined) payload.boardText = updates.boardText;
  if (updates.classNotes !== undefined) payload.classNotes = updates.classNotes;
  if (updates.durationMinutes !== undefined) payload.durationMinutes = updates.durationMinutes;

  await updateDoc(sessionRef, payload);
}

/**
 * Discards an active session (marks status "draft").
 */
export async function discardSession(teacherUid: string, sessionId: string): Promise<void> {
  const db = getDb();
  const sessionRef = doc(db, `users/${teacherUid}/sessions`, sessionId);
  await updateDoc(sessionRef, {
    status: "draft",
    endedAt: new Date(),
    lastActivityAt: new Date(),
  });
}

/**
 * Ends a classroom session and publishes summaries (RF07, RF08, CA06, CA07, CA11).
 * 1. Sets session status to "ended" in users/{teacherUid}/sessions/{sessionId}
 * 2. Publishes class summary to each present student in students/{studentId}/classes/{sessionId}
 * 3. Persists notes to students/{studentId}/notes
 * 4. Records vocabulary words for present students in students/{studentId}/vocabulary
 */
export async function endSession(
  teacherUid: string,
  session: ClassroomSession,
  review: SessionEndReviewData,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const sessionId = session.id;

  // 1. Update the teacher's session document
  const sessionRef = doc(db, `users/${teacherUid}/sessions`, sessionId);
  await updateDoc(sessionRef, {
    status: "ended",
    endedAt: now,
    attendance: review.attendance,
    activitiesPlayed: review.activities,
    newWords: review.words,
    notes: review.notes,
    boardText: review.boardText || "",
    classNotes: review.classNotes || "",
    durationMinutes: review.durationMinutes,
    liveResults: review.liveResults || null,
    lastActivityAt: now,
  });

  // 2. Identify present students
  const presentStudentIds = Object.keys(review.attendance).filter(
    (studentId) => review.attendance[studentId] === true,
  );

  // 3. Save notes to each student's notes collection
  for (const note of review.notes) {
    if (!note.studentId || !note.text) continue;
    const noteId = note.id && !note.id.startsWith("temp-") ? note.id : doc(collection(db, `students/${note.studentId}/notes`)).id;
    const noteRef = doc(db, `students/${note.studentId}/notes`, noteId);

    await setDoc(
      noteRef,
      {
        category: note.category,
        text: note.text,
        correction: note.correction || null,
        visibility: note.visibility,
        resolved: Boolean(note.resolved),
        sessionId,
        createdAt: note.createdAt || now,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  // 4. Publish class history for each present student (CA07, CA11)
  // CRITICAL: CA11: each student receives ONLY their own shared notes! Never other students' notes!
  for (const studentId of presentStudentIds) {
    const studentSharedNotes = review.notes.filter(
      (n) => n.studentId === studentId && n.visibility === "shared",
    );
    const studentLiveResult = review.liveResults
      ? Object.values(review.liveResults).find((r) => r.studentId === studentId) || null
      : null;

    const studentClassDocRef = doc(db, `students/${studentId}/classes`, sessionId);
    await setDoc(studentClassDocRef, {
      sessionId,
      className: session.className,
      date: session.startedAt,
      durationMinutes: review.durationMinutes,
      activities: review.activities.map((a) => ({ id: a.id, title: a.title })),
      words: review.words.map((w) => w.term),
      boardText: review.boardText || "",
      classNotes: review.classNotes || "",
      studentNotes: studentSharedNotes,
      liveResult: studentLiveResult,
      createdAt: now,
    });
  }

  // 5. Batch record vocabulary words for present students (CA07)
  if (review.words.length > 0 && presentStudentIds.length > 0) {
    await recordSessionVocabulary({
      studentIds: presentStudentIds,
      words: review.words,
      sessionId,
    });
  }

  // 6. Auto-complete learning track steps for present students if countClassActivities is enabled (spec 11: RF06b)
  if (review.activities.length > 0 && presentStudentIds.length > 0) {
    try {
      const activityIdsPlayed = review.activities.map((a) => a.id);
      for (const studentId of presentStudentIds) {
        const tracksCol = collection(db, `students/${studentId}/tracks`);
        const tracksSnap = await getDocs(tracksCol);
        for (const tDoc of tracksSnap?.docs || []) {
          const tData = tDoc.data();
          if (!tData.countClassActivities) continue;
          const trackActIds: string[] = Array.isArray(tData.activityIds) ? tData.activityIds : [];
          const comp = tData.completed || {};
          const updates: Record<string, unknown> = {};
          let updatedAny = false;

          for (const actId of activityIdsPlayed) {
            if (trackActIds.includes(actId) && !comp[actId]) {
              updates[`completed.${actId}`] = {
                at: now.toISOString(),
                source: "class",
              };
              updatedAny = true;
            }
          }

          if (updatedAny) {
            updates.updatedAt = now;
            await updateDoc(tDoc.ref, updates);
          }
        }
      }
    } catch (err) {
      console.warn("Could not auto-complete track steps during endSession:", err);
    }
  }
}

/**
 * Fetches ended past sessions for a teacher, optionally filtered by classId (RF08, CA06).
 */
export async function getPastSessions(
  teacherUid: string,
  classId?: string,
): Promise<ClassroomSession[]> {
  const db = getDb();
  const sessionsCol = collection(db, `users/${teacherUid}/sessions`);
  const q = query(
    sessionsCol,
    where("status", "==", "ended"),
    orderBy("startedAt", "desc"),
    limit(50),
  );

  try {
    const snap = await getDocs(q);
    const sessions = snap.docs.map((d) => mapSessionDoc(d.id, d.data()));
    if (classId) {
      return sessions.filter((s) => s.classId === classId);
    }
    return sessions;
  } catch (err) {
    console.warn("Could not query past sessions with order, using fallback:", err);
    const fallbackQ = query(sessionsCol, where("status", "==", "ended"), limit(50));
    const snap = await getDocs(fallbackQ);
    const sessions = snap.docs
      .map((d) => mapSessionDoc(d.id, d.data()))
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    if (classId) {
      return sessions.filter((s) => s.classId === classId);
    }
    return sessions;
  }
}
