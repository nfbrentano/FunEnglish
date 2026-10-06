import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { ProgressReportSnapshot, PublicReportData } from "./types";

/**
 * Generates a 32-char hex token (128-bit entropy) for shareable links (RNF03).
 */
export function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Computes SHA-256 hash using standard Web Crypto API (RNF02, RNF03).
 */
export async function hashShareToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Saves a progress report snapshot under students/{studentId}/reports/{reportId} (RNF02, CA06).
 * If a share token is provided, also creates a public snapshot in publicReports/{tokenHash}.
 */
export async function saveProgressReport(
  studentId: string,
  snapshot: ProgressReportSnapshot,
  shareToken?: string,
): Promise<{ reportId: string; shareToken?: string; shareTokenHash?: string }> {
  const db = getDb();
  let shareTokenHash: string | undefined = snapshot.shareTokenHash;

  if (shareToken && !shareTokenHash) {
    shareTokenHash = await hashShareToken(shareToken);
  }

  const finalSnapshot: ProgressReportSnapshot = {
    ...snapshot,
    shareTokenHash,
    shareToken,
  };

  const reportDocRef = doc(db, `students/${studentId}/reports/${snapshot.id}`);
  await setDoc(reportDocRef, {
    ...finalSnapshot,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (shareToken && shareTokenHash) {
    const publicDocRef = doc(db, `publicReports/${shareTokenHash}`);
    await setDoc(publicDocRef, {
      tokenHash: shareTokenHash,
      studentId,
      reportId: snapshot.id,
      revoked: false,
      snapshot: finalSnapshot,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return {
    reportId: snapshot.id,
    shareToken,
    shareTokenHash,
  };
}

/**
 * Fetches all progress reports for a student.
 */
export async function getStudentReports(
  studentId: string,
): Promise<ProgressReportSnapshot[]> {
  const db = getDb();
  const reportsRef = collection(db, `students/${studentId}/reports`);
  const q = query(reportsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      ...(data as ProgressReportSnapshot),
      id: docSnap.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    };
  });
}

/**
 * Fetches a single progress report by reportId.
 */
export async function getReportById(
  studentId: string,
  reportId: string,
): Promise<ProgressReportSnapshot | null> {
  const db = getDb();
  const docRef = doc(db, `students/${studentId}/reports/${reportId}`);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    ...(data as ProgressReportSnapshot),
    id: snap.id,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  };
}

/**
 * Loads a public report by its plain share token without login (RNF03, CA06, CA07).
 * Checks the SHA-256 hash and verifies revoked status.
 */
export async function getPublicReport(
  token: string,
): Promise<ProgressReportSnapshot | null> {
  if (!token || token.trim().length === 0) return null;

  const db = getDb();
  const tokenHash = await hashShareToken(token);
  const publicDocRef = doc(db, `publicReports/${tokenHash}`);
  const snap = await getDoc(publicDocRef);

  if (!snap.exists()) {
    // Invented token or non-existent (CA07)
    return null;
  }

  const data = snap.data() as PublicReportData;
  if (data.revoked || data.snapshot?.revoked) {
    // Revoked report (CA07)
    return null;
  }

  return data.snapshot;
}

/**
 * Revokes a shared report (CA07).
 */
export async function revokeReportShare(
  studentId: string,
  reportId: string,
  tokenHash?: string,
): Promise<void> {
  const db = getDb();
  const reportDocRef = doc(db, `students/${studentId}/reports/${reportId}`);
  await updateDoc(reportDocRef, {
    revoked: true,
    updatedAt: serverTimestamp(),
  });

  if (tokenHash) {
    const publicDocRef = doc(db, `publicReports/${tokenHash}`);
    await updateDoc(publicDocRef, {
      revoked: true,
      updatedAt: serverTimestamp(),
    }).catch(() => {
      // Document may not exist or already updated
    });
  }
}
