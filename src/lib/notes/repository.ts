import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  DEFAULT_VISIBILITY_BY_CATEGORY,
  MAX_CORRECTION_TEXT_LENGTH,
  MAX_NOTE_TEXT_LENGTH,
  MAX_NOTES_PAGE_SIZE,
  NOTE_CATEGORIES,
  type CreateNoteInput,
  type NoteCategory,
  type NoteFilterOptions,
  type NoteVisibility,
  type StudentNote,
  type UpdateNoteInput,
} from "./types";

export function validateNoteText(text: unknown): string {
  if (typeof text !== "string") {
    throw new Error("Note text must be a string");
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error("Note text cannot be empty");
  }
  if (trimmed.length > MAX_NOTE_TEXT_LENGTH) {
    throw new Error(`Note text cannot exceed ${MAX_NOTE_TEXT_LENGTH} characters`);
  }
  return trimmed;
}

export function validateCorrection(correction: unknown): string | undefined {
  if (correction === undefined || correction === null || correction === "") {
    return undefined;
  }
  if (typeof correction !== "string") {
    throw new Error("Correction must be a string");
  }
  const trimmed = correction.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > MAX_CORRECTION_TEXT_LENGTH) {
    throw new Error(`Correction cannot exceed ${MAX_CORRECTION_TEXT_LENGTH} characters`);
  }
  return trimmed;
}

export function validateCategory(category: unknown): NoteCategory {
  if (typeof category !== "string" || !NOTE_CATEGORIES.includes(category as NoteCategory)) {
    throw new Error(`Invalid note category: ${category}`);
  }
  return category as NoteCategory;
}

export function resolveDefaultVisibility(
  category: NoteCategory,
  explicit?: NoteVisibility,
): NoteVisibility {
  if (explicit === "private" || explicit === "shared") {
    return explicit;
  }
  return DEFAULT_VISIBILITY_BY_CATEGORY[category];
}

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

/**
 * Fetches notes for a specific student, ordered by createdAt desc.
 */
export async function getStudentNotes(
  studentId: string,
  options?: NoteFilterOptions & { limitCount?: number },
): Promise<StudentNote[]> {
  const db = getDb();
  const notesRef = collection(db, `students/${studentId}/notes`);
  const q = query(
    notesRef,
    orderBy("createdAt", "desc"),
    limit(options?.limitCount ?? MAX_NOTES_PAGE_SIZE),
  );

  const snapshot = await getDocs(q);
  const notes: StudentNote[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    notes.push({
      id: docSnap.id,
      studentId,
      category: data.category as NoteCategory,
      text: data.text ?? "",
      correction: data.correction ?? undefined,
      visibility: (data.visibility as NoteVisibility) ?? "private",
      resolved: Boolean(data.resolved),
      sessionId: data.sessionId ?? undefined,
      source: (data.source as any) ?? undefined,
      homeworkId: data.homeworkId ?? undefined,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  }

  // Filter in memory for maximum responsiveness
  return notes.filter((n) => {
    if (options?.category && options.category !== "all" && n.category !== options.category) {
      return false;
    }
    if (
      options?.visibility &&
      options.visibility !== "all" &&
      n.visibility !== options.visibility
    ) {
      return false;
    }
    if (options?.status && options.status !== "all") {
      if (options.status === "open" && n.resolved) return false;
      if (options.status === "resolved" && !n.resolved) return false;
    }
    return true;
  });
}

/**
 * Creates a single note for a student (RF01, RF08, CA01).
 */
export async function createStudentNote(
  studentId: string,
  input: CreateNoteInput,
): Promise<StudentNote> {
  const validatedText = validateNoteText(input.text);
  const validatedCategory = validateCategory(input.category);
  const validatedCorrection = validateCorrection(input.correction);
  const visibility = resolveDefaultVisibility(validatedCategory, input.visibility);
  const resolved = Boolean(input.resolved);
  const sessionId = input.sessionId?.trim() || undefined;
  const source = input.source;
  const homeworkId = input.homeworkId?.trim() || undefined;

  const db = getDb();
  const notesRef = collection(db, `students/${studentId}/notes`);

  const payload: Record<string, unknown> = {
    category: validatedCategory,
    text: validatedText,
    visibility,
    resolved,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (validatedCorrection) {
    payload.correction = validatedCorrection;
  }
  if (sessionId) {
    payload.sessionId = sessionId;
  }
  if (source) {
    payload.source = source;
  }
  if (homeworkId) {
    payload.homeworkId = homeworkId;
  }

  const docRef = await addDoc(notesRef, payload);

  return {
    id: docRef.id,
    studentId,
    category: validatedCategory,
    text: validatedText,
    correction: validatedCorrection,
    visibility,
    resolved,
    sessionId,
    source,
    homeworkId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates a note across multiple students simultaneously (RF03, CA02, CT02).
 */
export async function createBatchNotes(
  studentIds: string[],
  input: CreateNoteInput,
): Promise<{ count: number; studentIds: string[] }> {
  if (!studentIds || studentIds.length === 0) {
    return { count: 0, studentIds: [] };
  }

  const validatedText = validateNoteText(input.text);
  const validatedCategory = validateCategory(input.category);
  const validatedCorrection = validateCorrection(input.correction);
  const visibility = resolveDefaultVisibility(validatedCategory, input.visibility);
  const resolved = Boolean(input.resolved);
  const sessionId = input.sessionId?.trim() || undefined;

  const db = getDb();
  const batch = writeBatch(db);

  for (const sId of studentIds) {
    const noteDocRef = doc(collection(db, `students/${sId}/notes`));
    const payload: Record<string, unknown> = {
      category: validatedCategory,
      text: validatedText,
      visibility,
      resolved,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (validatedCorrection) payload.correction = validatedCorrection;
    if (sessionId) payload.sessionId = sessionId;

    batch.set(noteDocRef, payload);
  }

  await batch.commit();
  return { count: studentIds.length, studentIds };
}

/**
 * Updates an existing note (RF05, RF07, CA04, CA06).
 */
export async function updateStudentNote(
  studentId: string,
  noteId: string,
  updates: UpdateNoteInput,
): Promise<void> {
  const db = getDb();
  const noteRef = doc(db, `students/${studentId}/notes/${noteId}`);

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.text !== undefined) {
    payload.text = validateNoteText(updates.text);
  }
  if (updates.category !== undefined) {
    payload.category = validateCategory(updates.category);
  }
  if (updates.correction !== undefined) {
    if (updates.correction === null || updates.correction === "") {
      payload.correction = "";
    } else {
      payload.correction = validateCorrection(updates.correction);
    }
  }
  if (updates.visibility !== undefined) {
    payload.visibility = updates.visibility;
  }
  if (updates.resolved !== undefined) {
    payload.resolved = Boolean(updates.resolved);
  }
  if (updates.sessionId !== undefined) {
    payload.sessionId = updates.sessionId ?? "";
  }
  if (updates.source !== undefined) {
    payload.source = updates.source ?? "";
  }
  if (updates.homeworkId !== undefined) {
    payload.homeworkId = updates.homeworkId ?? "";
  }

  await updateDoc(noteRef, payload);
}

/**
 * Deletes a note (RF07).
 */
export async function deleteStudentNote(studentId: string, noteId: string): Promise<void> {
  const db = getDb();
  const noteRef = doc(db, `students/${studentId}/notes/${noteId}`);
  await deleteDoc(noteRef);
}

export interface GroupedNotesByDate {
  dateLabel: string;
  timestamp: number;
  notes: StudentNote[];
}

/**
 * Groups notes by class/session date, from most recent to oldest (RF04, CA03).
 */
export function groupNotesByClassDate(notes: StudentNote[]): GroupedNotesByDate[] {
  const groupMap = new Map<
    string,
    { dateLabel: string; timestamp: number; notes: StudentNote[] }
  >();

  for (const note of notes) {
    const date = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;

    const label = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const dayTimestamp = new Date(yyyy, date.getMonth(), date.getDate()).getTime();

    const existing = groupMap.get(key);
    if (!existing) {
      groupMap.set(key, {
        dateLabel: label,
        timestamp: dayTimestamp,
        notes: [note],
      });
    } else {
      existing.notes.push(note);
    }
  }

  // Sort groups descending by date
  const sorted = Array.from(groupMap.values()).sort((a, b) => b.timestamp - a.timestamp);

  // Inside each group, sort notes descending by createdAt
  for (const group of sorted) {
    group.notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return sorted;
}
