import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { createCallable } from "./helpers/callable.js";
import { getAdminFirestore } from "./helpers/firebase-admin.js";

// 31 unambiguous characters (excludes 0, O, 1, I, L)
const UNAMBIGUOUS_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateInviteCode(length = 8): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * UNAMBIGUOUS_CHARSET.length);
    result += UNAMBIGUOUS_CHARSET[randomIndex];
  }
  return result;
}

export const createStudentInviteSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
});

export type CreateStudentInviteInput = z.infer<typeof createStudentInviteSchema>;

export interface CreateStudentInviteOutput {
  code: string;
  studentId: string;
  expiresAt: number; // ms timestamp
  expiresInDays: number;
}

/**
 * Creates an 8-character invite code valid for 14 days (RF01, CA01).
 * Callable by the owner teacher only.
 */
export const createStudentInvite = createCallable<
  CreateStudentInviteInput,
  CreateStudentInviteOutput
>({
  schema: createStudentInviteSchema,
  requireAuth: true,
  handler: async (data, request) => {
    const uid = request.auth!.uid;
    const db = getAdminFirestore();

    const studentRef = db.doc(`students/${data.studentId}`);
    const studentDoc = await studentRef.get();

    if (!studentDoc.exists) {
      throw new HttpsError("not-found", "Student not found.");
    }

    const studentData = studentDoc.data();
    if (studentData?.teacherUid !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to invite this student.",
      );
    }

    // Clean up any existing invites for this student
    const existingInvitesSnap = await db
      .collection("invites")
      .where("studentId", "==", data.studentId)
      .get();

    if (!existingInvitesSnap.empty) {
      const batch = db.batch();
      for (const docSnap of existingInvitesSnap.docs) {
        batch.delete(docSnap.ref);
      }
      await batch.commit();
    }

    const code = generateInviteCode(8);
    const nowMs = Date.now();
    const expiresAtMs = nowMs + 14 * 24 * 60 * 60 * 1000; // 14 days
    const expiresAt = Timestamp.fromMillis(expiresAtMs);

    // Fetch teacher display name if available
    let teacherName: string | undefined;
    try {
      const teacherDoc = await db.doc(`users/${uid}`).get();
      if (teacherDoc.exists) {
        teacherName = teacherDoc.data()?.displayName || undefined;
      }
    } catch {
      // Ignore if teacher profile cannot be read
    }

    await db.doc(`invites/${code}`).set({
      code,
      studentId: data.studentId,
      studentName: studentData.name,
      teacherUid: uid,
      teacherName: teacherName || null,
      createdAt: Timestamp.fromMillis(nowMs),
      expiresAt,
    });

    return {
      code,
      studentId: data.studentId,
      expiresAt: expiresAtMs,
      expiresInDays: 14,
    };
  },
});

export const getStudentInviteSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
});

export type GetStudentInviteInput = z.infer<typeof getStudentInviteSchema>;

export interface GetStudentInviteOutput {
  active: boolean;
  code?: string;
  expiresAt?: number;
}

/**
 * Returns active invite for a student if one exists and has not expired.
 */
export const getStudentInvite = createCallable<GetStudentInviteInput, GetStudentInviteOutput>({
  schema: getStudentInviteSchema,
  requireAuth: true,
  handler: async (data, request) => {
    const uid = request.auth!.uid;
    const db = getAdminFirestore();

    const studentRef = db.doc(`students/${data.studentId}`);
    const studentDoc = await studentRef.get();

    if (!studentDoc.exists) {
      throw new HttpsError("not-found", "Student not found.");
    }

    const studentData = studentDoc.data();
    if (studentData?.teacherUid !== uid) {
      throw new HttpsError("permission-denied", "You do not own this student.");
    }

    const snap = await db
      .collection("invites")
      .where("studentId", "==", data.studentId)
      .limit(1)
      .get();

    if (snap.empty) {
      return { active: false };
    }

    const inviteDoc = snap.docs[0]!;
    const inviteData = inviteDoc.data();
    const expiresAtMs =
      inviteData.expiresAt instanceof Timestamp
        ? inviteData.expiresAt.toMillis()
        : inviteData.expiresAt;

    if (Date.now() > expiresAtMs) {
      await inviteDoc.ref.delete();
      return { active: false };
    }

    return {
      active: true,
      code: inviteData.code,
      expiresAt: expiresAtMs,
    };
  },
});

export const revokeStudentInviteSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
});

export type RevokeStudentInviteInput = z.infer<typeof revokeStudentInviteSchema>;

export interface RevokeStudentInviteOutput {
  success: true;
}

/**
 * Revokes an existing invite code for a student (RF01).
 */
export const revokeStudentInvite = createCallable<
  RevokeStudentInviteInput,
  RevokeStudentInviteOutput
>({
  schema: revokeStudentInviteSchema,
  requireAuth: true,
  handler: async (data, request) => {
    const uid = request.auth!.uid;
    const db = getAdminFirestore();

    const studentRef = db.doc(`students/${data.studentId}`);
    const studentDoc = await studentRef.get();

    if (!studentDoc.exists) {
      throw new HttpsError("not-found", "Student not found.");
    }

    if (studentDoc.data()?.teacherUid !== uid) {
      throw new HttpsError("permission-denied", "You do not own this student.");
    }

    const snap = await db.collection("invites").where("studentId", "==", data.studentId).get();

    if (!snap.empty) {
      const batch = db.batch();
      for (const d of snap.docs) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }

    return { success: true };
  },
});

export const removePortalAccessSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
});

export type RemovePortalAccessInput = z.infer<typeof removePortalAccessSchema>;

export interface RemovePortalAccessOutput {
  success: true;
}

/**
 * Removes student's portal access immediately (RF08, CA07).
 */
export const removePortalAccess = createCallable<
  RemovePortalAccessInput,
  RemovePortalAccessOutput
>({
  schema: removePortalAccessSchema,
  requireAuth: true,
  handler: async (data, request) => {
    const uid = request.auth!.uid;
    const db = getAdminFirestore();

    const studentRef = db.doc(`students/${data.studentId}`);
    const studentDoc = await studentRef.get();

    if (!studentDoc.exists) {
      throw new HttpsError("not-found", "Student not found.");
    }

    if (studentDoc.data()?.teacherUid !== uid) {
      throw new HttpsError("permission-denied", "You do not own this student.");
    }

    await studentRef.update({
      portalUid: FieldValue.delete(),
    });

    return { success: true };
  },
});

export const validateInviteSchema = z.object({
  code: z.string().min(1, "code is required"),
});

export type ValidateInviteInput = z.infer<typeof validateInviteSchema>;

export interface ValidateInviteOutput {
  valid: boolean;
  studentName?: string;
  teacherName?: string;
  error?: string;
}

/**
 * Validates an invite code before signup/login (CA10).
 * Public callable (no requireAuth).
 */
export const validateInvite = createCallable<ValidateInviteInput, ValidateInviteOutput>({
  schema: validateInviteSchema,
  requireAuth: false,
  handler: async (data) => {
    const normalizedCode = data.code.trim().toUpperCase();
    const db = getAdminFirestore();

    const inviteRef = db.doc(`invites/${normalizedCode}`);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return {
        valid: false,
        error: "This invite is invalid or has expired. Ask your teacher for a new one.",
      };
    }

    const inviteData = inviteDoc.data()!;
    const expiresAtMs =
      inviteData.expiresAt instanceof Timestamp
        ? inviteData.expiresAt.toMillis()
        : inviteData.expiresAt;

    if (Date.now() > expiresAtMs) {
      // Remove expired invite
      await inviteRef.delete().catch(() => {});
      return {
        valid: false,
        error: "This invite is invalid or has expired. Ask your teacher for a new one.",
      };
    }

    return {
      valid: true,
      studentName: inviteData.studentName || undefined,
      teacherName: inviteData.teacherName || undefined,
    };
  },
});

export const redeemInviteSchema = z.object({
  code: z.string().min(1, "code is required"),
});

export type RedeemInviteInput = z.infer<typeof redeemInviteSchema>;

export interface RedeemInviteOutput {
  success: true;
  studentId: string;
}

/**
 * Redeems an invite code in a transaction (RNF02, CA02, CA09):
 * 1. Checks code validity and expiration
 * 2. Checks student doesn't already have a different portalUid
 * 3. Creates/ensures student user profile with role: "student"
 * 4. Sets students/{id}.portalUid = auth.uid
 * 5. Deletes invite in the same transaction
 */
export const redeemInvite = createCallable<RedeemInviteInput, RedeemInviteOutput>({
  schema: redeemInviteSchema,
  requireAuth: true,
  handler: async (data, request) => {
    const uid = request.auth!.uid;
    const normalizedCode = data.code.trim().toUpperCase();
    const db = getAdminFirestore();

    const inviteRef = db.doc(`invites/${normalizedCode}`);
    const userRef = db.doc(`users/${uid}`);

    let redeemedStudentId = "";

    await db.runTransaction(async (transaction) => {
      const inviteDoc = await transaction.get(inviteRef);

      if (!inviteDoc.exists) {
        throw new HttpsError(
          "not-found",
          "This invite is invalid or has expired. Ask your teacher for a new one.",
        );
      }

      const inviteData = inviteDoc.data()!;
      const expiresAtMs =
        inviteData.expiresAt instanceof Timestamp
          ? inviteData.expiresAt.toMillis()
          : inviteData.expiresAt;

      if (Date.now() > expiresAtMs) {
        transaction.delete(inviteRef);
        throw new HttpsError(
          "failed-precondition",
          "This invite is invalid or has expired. Ask your teacher for a new one.",
        );
      }

      const studentId = inviteData.studentId;
      redeemedStudentId = studentId;
      const studentRef = db.doc(`students/${studentId}`);
      const studentDoc = await transaction.get(studentRef);

      if (!studentDoc.exists) {
        throw new HttpsError("not-found", "Student record no longer exists.");
      }

      const studentData = studentDoc.data()!;
      if (studentData.portalUid && studentData.portalUid !== uid) {
        throw new HttpsError(
          "already-exists",
          "This student record already has portal access linked to another account.",
        );
      }

      // Check or create user profile
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        if (userData.role === "teacher") {
          throw new HttpsError(
            "failed-precondition",
            "Teacher accounts cannot redeem student invites. Please use a separate student account.",
          );
        }
      } else {
        // Create student profile
        transaction.set(userRef, {
          displayName: request.auth?.token.name || inviteData.studentName || null,
          email: request.auth?.token.email || null,
          photoURL: request.auth?.token.picture || null,
          role: "student",
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Link student portalUid
      transaction.update(studentRef, {
        portalUid: uid,
      });

      // Delete the redeemed invite
      transaction.delete(inviteRef);
    });

    return {
      success: true,
      studentId: redeemedStudentId,
    };
  },
});
