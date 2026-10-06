import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { normalizeWordId, validateWordInput } from "./slug";
import type {
  CreateWordInput,
  RecordSessionVocabularyParams,
  StudentWord,
  UpdateWordInput,
} from "./types";

function toIsoString(val: unknown): string {
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (
    val &&
    typeof val === "object" &&
    "toDate" in val &&
    typeof (val as { toDate: () => Date }).toDate === "function"
  ) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (
    val &&
    typeof val === "object" &&
    "seconds" in val &&
    typeof (val as { seconds: number }).seconds === "number"
  ) {
    return new Date((val as { seconds: number }).seconds * 1000).toISOString();
  }
  if (val instanceof Date) return val.toISOString();
  return new Date().toISOString();
}

/**
 * Fetches all vocabulary items for a given student (up to 2000, RNF03).
 */
export async function getStudentVocabulary(studentId: string): Promise<StudentWord[]> {
  const db = getDb();
  const vocabRef = collection(db, "students", studentId, "vocabulary");
  const snapshot = await getDocs(vocabRef);

  const words: StudentWord[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    words.push({
      id: docSnap.id,
      term: data.term || docSnap.id,
      meaning: data.meaning ? String(data.meaning) : undefined,
      example: data.example ? String(data.example) : undefined,
      sessionIds: Array.isArray(data.sessionIds) ? data.sessionIds : [],
      firstAddedAt: toIsoString(data.firstAddedAt),
      lastAddedAt: toIsoString(data.lastAddedAt),
      learned: Boolean(data.learned),
      dueAt: typeof data.dueAt === "string" ? data.dueAt : undefined,
      intervalDays: typeof data.intervalDays === "number" ? data.intervalDays : undefined,
      ease: typeof data.ease === "number" ? data.ease : undefined,
      reps: typeof data.reps === "number" ? data.reps : undefined,
      lapses: typeof data.lapses === "number" ? data.lapses : undefined,
      lastReviewedAt: typeof data.lastReviewedAt === "string" ? data.lastReviewedAt : undefined,
    });
  }

  // Sort in-memory: most recent first (RF05)
  words.sort((a, b) => new Date(b.lastAddedAt).getTime() - new Date(a.lastAddedAt).getTime());

  return words;
}

/**
 * Adds or updates a word for a student (RF01, RF03, RF04, CA03, CA04).
 * Deduplicates automatically by slug.
 */
export async function addWordToStudent(
  studentId: string,
  input: CreateWordInput,
): Promise<StudentWord> {
  const validation = validateWordInput(input);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid word input");
  }

  const db = getDb();
  const wordId = normalizeWordId(input.term);
  const wordRef = doc(db, "students", studentId, "vocabulary", wordId);
  const now = new Date().toISOString();

  const snap = await getDoc(wordRef);

  if (snap.exists()) {
    const existing = snap.data();
    const existingSessions: string[] = Array.isArray(existing.sessionIds)
      ? existing.sessionIds
      : [];

    const updatedSessions =
      input.sessionId && !existingSessions.includes(input.sessionId)
        ? [...existingSessions, input.sessionId].slice(0, 50)
        : existingSessions;

    const payload: Record<string, unknown> = {
      lastAddedAt: now,
      sessionIds: updatedSessions,
    };

    if (input.meaning?.trim()) {
      payload.meaning = input.meaning.trim();
    }
    if (input.example?.trim()) {
      payload.example = input.example.trim();
    }

    await updateDoc(wordRef, payload);

    return {
      id: wordId,
      term: existing.term || input.term.trim(),
      meaning: (payload.meaning as string) ?? existing.meaning ?? undefined,
      example: (payload.example as string) ?? existing.example ?? undefined,
      sessionIds: updatedSessions,
      firstAddedAt: toIsoString(existing.firstAddedAt),
      lastAddedAt: now,
      learned: Boolean(existing.learned),
    };
  }

  const newDoc: Record<string, unknown> = {
    term: input.term.trim(),
    sessionIds: input.sessionId ? [input.sessionId] : [],
    firstAddedAt: now,
    lastAddedAt: now,
    learned: false,
  };

  if (input.meaning?.trim()) {
    newDoc.meaning = input.meaning.trim();
  }
  if (input.example?.trim()) {
    newDoc.example = input.example.trim();
  }

  await setDoc(wordRef, newDoc);

  return {
    id: wordId,
    term: input.term.trim(),
    meaning: input.meaning?.trim() || undefined,
    example: input.example?.trim() || undefined,
    sessionIds: input.sessionId ? [input.sessionId] : [],
    firstAddedAt: now,
    lastAddedAt: now,
    learned: false,
  };
}

/**
 * Updates an existing vocabulary entry (Teacher).
 */
export async function updateWord(
  studentId: string,
  wordId: string,
  updates: UpdateWordInput,
): Promise<void> {
  const db = getDb();
  const wordRef = doc(db, "students", studentId, "vocabulary", wordId);

  const payload: Record<string, unknown> = {
    lastAddedAt: new Date().toISOString(),
  };

  if (updates.term !== undefined) {
    const term = updates.term.trim();
    if (!term || term.length > 80) {
      throw new Error("Term must be between 1 and 80 characters.");
    }
    payload.term = term;
  }
  if (updates.meaning !== undefined) {
    payload.meaning = updates.meaning.trim();
  }
  if (updates.example !== undefined) {
    payload.example = updates.example.trim();
  }
  if (updates.learned !== undefined) {
    payload.learned = Boolean(updates.learned);
  }
  if (updates.sessionIds !== undefined) {
    payload.sessionIds = updates.sessionIds.slice(0, 50);
  }
  if (updates.dueAt !== undefined) {
    payload.dueAt = updates.dueAt;
  }
  if (updates.intervalDays !== undefined) {
    payload.intervalDays = updates.intervalDays;
  }
  if (updates.ease !== undefined) {
    payload.ease = updates.ease;
  }
  if (updates.reps !== undefined) {
    payload.reps = updates.reps;
  }
  if (updates.lapses !== undefined) {
    payload.lapses = updates.lapses;
  }
  if (updates.lastReviewedAt !== undefined) {
    payload.lastReviewedAt = updates.lastReviewedAt;
  }

  await updateDoc(wordRef, payload);
}

/**
 * Deletes a word from a student's dictionary (Teacher, RF03).
 */
export async function deleteWord(studentId: string, wordId: string): Promise<void> {
  const db = getDb();
  const wordRef = doc(db, "students", studentId, "vocabulary", wordId);
  await deleteDoc(wordRef);
}

/**
 * Sets learned state for a student ("I know this") (Student Portal, RF06, RNF02, CA06).
 * Only updates the `learned` field to comply with security rules.
 */
export async function setWordLearned(
  studentId: string,
  wordId: string,
  learned: boolean,
): Promise<void> {
  const db = getDb();
  const wordRef = doc(db, "students", studentId, "vocabulary", wordId);
  await updateDoc(wordRef, { learned: Boolean(learned) });
}

/**
 * Batch records review ratings and updated SM-2 scheduling for student's words (RF03, RNF03, CA03).
 */
export async function recordWordReviews(
  studentId: string,
  reviews: Array<{
    wordId: string;
    dueAt: string;
    intervalDays: number;
    ease: number;
    reps: number;
    lapses: number;
  }>,
): Promise<void> {
  if (!reviews.length) return;
  const db = getDb();
  const now = new Date().toISOString();

  const BATCH_SIZE = 500;
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const chunk = reviews.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const r of chunk) {
      const wordRef = doc(db, "students", studentId, "vocabulary", r.wordId);
      batch.update(wordRef, {
        dueAt: r.dueAt,
        intervalDays: r.intervalDays,
        ease: r.ease,
        reps: r.reps,
        lapses: r.lapses,
        lastReviewedAt: now,
      });
    }
    await batch.commit();
  }
}

/**
 * Batch records vocabulary words for multiple students at class session end (RF02, RNF04, CA02).
 * Writes are split into chunks of up to 500 operations per Firestore writeBatch limits.
 */
export async function recordSessionVocabulary(
  params: RecordSessionVocabularyParams,
): Promise<void> {
  const { studentIds, words, sessionId } = params;
  if (!studentIds.length || !words.length) return;

  const db = getDb();
  const now = new Date().toISOString();

  // Prepare all operations
  const operations: Array<{
    ref: ReturnType<typeof doc>;
    data: Record<string, unknown>;
  }> = [];

  for (const sId of studentIds) {
    for (const w of words) {
      const term = w.term.trim();
      if (!term) continue;
      const wordId = normalizeWordId(term);
      const wordRef = doc(db, "students", sId, "vocabulary", wordId);

      const data: Record<string, unknown> = {
        term,
        firstAddedAt: now,
        lastAddedAt: now,
        learned: false,
        sessionIds: sessionId ? [sessionId] : [],
      };
      if (w.meaning?.trim()) data.meaning = w.meaning.trim();
      if (w.example?.trim()) data.example = w.example.trim();

      operations.push({ ref: wordRef, data });
    }
  }

  // Chunk in batches of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      // Use set with merge: true to avoid overwriting firstAddedAt or learned if existing,
      // or setDoc directly
      batch.set(op.ref, op.data, { merge: true });
    }
    await batch.commit();
  }
}
