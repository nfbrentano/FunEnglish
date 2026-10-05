import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Student } from "@/lib/classes/types";
import type { StudentNote } from "@/lib/notes/types";
import type { StudentClassHistoryItem } from "./types";

function mapStudentDoc(id: string, data: DocumentData): Student {
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw && typeof createdAtRaw.toDate === "function"
      ? createdAtRaw.toDate()
      : createdAtRaw instanceof Date
        ? createdAtRaw
        : new Date();

  return {
    id,
    teacherUid: data.teacherUid,
    name: data.name,
    email: data.email || undefined,
    classIds: Array.isArray(data.classIds) ? data.classIds : [],
    portalUid: data.portalUid || undefined,
    homeworkPin: data.homeworkPin,
    createdAt,
  };
}

function mapNoteDoc(id: string, studentId: string, data: DocumentData): StudentNote {
  const createdAtRaw = data.createdAt;
  const updatedAtRaw = data.updatedAt;

  const createdAt =
    createdAtRaw && typeof createdAtRaw.toDate === "function"
      ? createdAtRaw.toDate()
      : createdAtRaw instanceof Date
        ? createdAtRaw
        : new Date();

  const updatedAt =
    updatedAtRaw && typeof updatedAtRaw.toDate === "function"
      ? updatedAtRaw.toDate()
      : updatedAtRaw instanceof Date
        ? updatedAtRaw
        : new Date();

  return {
    id,
    studentId,
    category: data.category,
    text: data.text,
    correction: data.correction || undefined,
    visibility: data.visibility,
    resolved: Boolean(data.resolved),
    sessionId: data.sessionId || undefined,
    createdAt,
    updatedAt,
  };
}

function mapClassHistoryDoc(id: string, data: DocumentData): StudentClassHistoryItem {
  const dateRaw = data.date || data.startedAt || data.createdAt;
  const date =
    dateRaw && typeof dateRaw.toDate === "function"
      ? dateRaw.toDate()
      : dateRaw instanceof Date
        ? dateRaw
        : new Date();

  return {
    id,
    sessionId: data.sessionId || id,
    className: data.className || undefined,
    date,
    durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : undefined,
    activities: Array.isArray(data.activities) ? data.activities : [],
    words: Array.isArray(data.words) ? data.words : [],
    boardText: data.boardText || undefined,
    classNotes: data.classNotes || undefined,
    studentNotes: Array.isArray(data.studentNotes) ? data.studentNotes : [],
  };
}

/**
 * Returns all student documents linked to the given portal auth uid (RF03, CA08).
 * A student can be invited by multiple teachers.
 */
export async function getStudentRecordsForPortal(portalUid: string): Promise<Student[]> {
  const db = getDb();
  const q = query(collection(db, "students"), where("portalUid", "==", portalUid));
  const snap = await getDocs(q);

  return snap.docs.map((docSnap) => mapStudentDoc(docSnap.id, docSnap.data()));
}

/**
 * Fetches shared notes for a student (CA03).
 */
export async function getSharedStudentNotes(studentId: string): Promise<StudentNote[]> {
  const db = getDb();
  const q = query(
    collection(db, "students", studentId, "notes"),
    where("visibility", "==", "shared"),
    orderBy("createdAt", "desc"),
  );

  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapNoteDoc(d.id, studentId, d.data()));
  } catch (err) {
    // Fallback if composite index on visibility + createdAt is building
    console.warn("Retrying notes query without orderBy:", err);
    const fallbackQ = query(
      collection(db, "students", studentId, "notes"),
      where("visibility", "==", "shared"),
    );
    const fallbackSnap = await getDocs(fallbackQ);
    const notes = fallbackSnap.docs.map((d) => mapNoteDoc(d.id, studentId, d.data()));
    return notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

/**
 * Fetches class history for a student (RF05, CA04).
 */
export async function getStudentClassHistory(
  studentId: string,
): Promise<StudentClassHistoryItem[]> {
  const db = getDb();
  const q = query(collection(db, "students", studentId, "classes"));
  const snap = await getDocs(q);

  const items = snap.docs.map((d) => mapClassHistoryDoc(d.id, d.data()));
  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Formats a class session summary ready for WhatsApp (RF09).
 */
export function formatClassSummaryForWhatsApp({
  studentName,
  date,
  durationMinutes,
  activities,
  words,
  boardText,
  notes,
  portalUrl,
}: {
  studentName: string;
  date: Date;
  durationMinutes?: number;
  activities?: Array<{ title: string }>;
  words?: string[];
  boardText?: string;
  notes?: StudentNote[];
  portalUrl: string;
}): string {
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const lines: string[] = [
    `🎓 *Class Summary · ${studentName}*`,
    `📅 ${dateStr}${durationMinutes ? ` (${durationMinutes} min)` : ""}`,
    "",
  ];

  if (activities && activities.length > 0) {
    lines.push(`📚 *Activities practiced:*`);
    for (const act of activities) {
      lines.push(`• ${act.title}`);
    }
    lines.push("");
  }

  if (words && words.length > 0) {
    lines.push(`✨ *Vocabulary & Key Words:*`);
    lines.push(words.join(", "));
    lines.push("");
  }

  if (boardText && boardText.trim()) {
    lines.push(`📝 *Whiteboard Notes:*`);
    lines.push(boardText.trim());
    lines.push("");
  }

  if (notes && notes.length > 0) {
    const strengths = notes.filter((n) => n.category === "strength");
    const errors = notes.filter((n) => n.category !== "strength");

    if (strengths.length > 0) {
      lines.push(`🌟 *Highlights:*`);
      for (const s of strengths) {
        lines.push(`• ${s.text}`);
      }
      lines.push("");
    }

    if (errors.length > 0) {
      lines.push(`🎯 *To review:*`);
      for (const e of errors) {
        lines.push(`• ${e.correction || e.text}`);
      }
      lines.push("");
    }
  }

  lines.push(`🔗 *Review your progress on the Student Portal:*`);
  lines.push(portalUrl);

  return lines.join("\n");
}
