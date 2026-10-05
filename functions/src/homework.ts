import crypto from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { createCallable } from "./helpers/callable.js";
import { getAdminFirestore } from "./helpers/firebase-admin.js";
import { gradeActivityAnswers } from "./helpers/grading.js";

function random20CharId(): string {
  // Generates 20 alphanumeric/safe characters (RF02)
  return crypto.randomBytes(15).toString("base64url").slice(0, 20);
}

function randomStudentToken(): string {
  // Generates 32 hex chars (128-bit entropy, >= 22 chars) (RNF07)
  return crypto.randomBytes(16).toString("hex");
}

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin.trim()).digest("hex");
}

/* =========================================================================
 * 1. createHomework
 * ========================================================================= */
export const createHomeworkSchema = z.object({
  activityId: z.string().min(1, "activityId is required"),
  targetType: z.enum(["class", "students", "anyone"]),
  classId: z.string().optional(),
  studentIds: z.array(z.string()).optional(),
  dueDate: z.string().nullable().optional(),
  instruction: z.string().max(300, "Instruction cannot exceed 300 characters").optional(),
  allowLate: z.boolean().optional().default(false),
});

export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;

export interface IndividualLinkInfo {
  studentId: string;
  studentName: string;
  token: string;
}

export interface CreateHomeworkOutput {
  homeworkId: string;
  individualLinks?: IndividualLinkInfo[];
}

export const createHomework = createCallable<CreateHomeworkInput, CreateHomeworkOutput>({
  schema: createHomeworkSchema,
  requireAuth: true,
  handler: async (data, request) => {
    const uid = request.auth!.uid;
    const db = getAdminFirestore();

    // 1. Fetch activity to copy title, slug, and type
    const actDoc = await db.doc(`activities/${data.activityId}`).get();
    if (!actDoc.exists) {
      throw new HttpsError("not-found", "Activity not found");
    }
    const actData = actDoc.data()!;

    const homeworkId = random20CharId();
    let classRoster: Array<{ studentId: string; firstName: string }> = [];
    const individualLinks: IndividualLinkInfo[] = [];
    let className: string | null = null;
    let targetStudentIds: string[] = [];

    if (data.targetType === "class" && data.classId) {
      const classDoc = await db.doc(`users/${uid}/classes/${data.classId}`).get();
      if (!classDoc.exists) {
        throw new HttpsError("not-found", "Class not found");
      }
      className = classDoc.data()?.name || null;
      targetStudentIds = Array.isArray(classDoc.data()?.studentIds)
        ? classDoc.data()!.studentIds
        : [];
    } else if (data.targetType === "students" && Array.isArray(data.studentIds)) {
      targetStudentIds = data.studentIds;
    }

    if (targetStudentIds.length > 0) {
      const batch = db.batch();

      // Fetch each student doc
      const studentDocs = await Promise.all(
        targetStudentIds.map((id) => db.doc(`students/${id}`).get()),
      );

      for (const sDoc of studentDocs) {
        if (!sDoc.exists) continue;
        const sData = sDoc.data()!;
        if (sData.teacherUid !== uid) continue;

        const fullName = sData.name || "Student";
        const firstName = fullName.trim().split(/\s+/)[0];
        const studentToken = randomStudentToken();

        classRoster.push({
          studentId: sDoc.id,
          firstName,
        });

        individualLinks.push({
          studentId: sDoc.id,
          studentName: fullName,
          token: studentToken,
        });

        const assigneeRef = db.doc(`homework/${homeworkId}/assignees/${studentToken}`);
        batch.set(assigneeRef, {
          studentId: sDoc.id,
          firstName,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
    }

    // Sort roster alphabetically by first name
    classRoster.sort((a, b) => a.firstName.localeCompare(b.firstName));

    const homeworkRef = db.doc(`homework/${homeworkId}`);
    await homeworkRef.set({
      teacherUid: uid,
      activityId: data.activityId,
      activitySlug: actData.slug || "",
      activityTitle: actData.title || "",
      activityType: actData.type || "quiz",
      targetType: data.targetType,
      classId: data.classId || null,
      className,
      studentIds: targetStudentIds,
      classRoster,
      dueDate: data.dueDate || null,
      instruction: data.instruction || "",
      allowLate: Boolean(data.allowLate),
      open: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      homeworkId,
      individualLinks: individualLinks.length > 0 ? individualLinks : undefined,
    };
  },
});

/* =========================================================================
 * 2. getHomeworkForStudent
 * ========================================================================= */
export const getHomeworkForStudentSchema = z.object({
  homeworkId: z.string().min(1, "homeworkId is required"),
  studentToken: z.string().optional(),
});

export type GetHomeworkForStudentInput = z.infer<typeof getHomeworkForStudentSchema>;

export interface GetHomeworkForStudentOutput {
  valid: boolean;
  error?: string;
  isClosed?: boolean;
  isExpired?: boolean;
  homework?: {
    id: string;
    activityId: string;
    activitySlug: string;
    activityTitle: string;
    activityType: string;
    targetType: "class" | "students" | "anyone";
    className?: string | null;
    classRoster?: Array<{ studentId: string; firstName: string }>;
    dueDate?: string | null;
    instruction?: string;
    allowLate: boolean;
    open: boolean;
  };
  student?: {
    studentId: string;
    firstName: string;
  };
  activityContent?: unknown;
}

export const getHomeworkForStudent = createCallable<
  GetHomeworkForStudentInput,
  GetHomeworkForStudentOutput
>({
  schema: getHomeworkForStudentSchema,
  requireAuth: false,
  handler: async (data) => {
    const db = getAdminFirestore();
    const homeworkDoc = await db.doc(`homework/${data.homeworkId}`).get();

    if (!homeworkDoc.exists) {
      return { valid: false, error: "not-found" };
    }

    const hw = homeworkDoc.data()!;
    let studentInfo: { studentId: string; firstName: string } | undefined;

    // Check individual token if provided (RNF07, CA02, CA10)
    if (data.studentToken) {
      const assigneeDoc = await db
        .doc(`homework/${data.homeworkId}/assignees/${data.studentToken}`)
        .get();
      if (!assigneeDoc.exists) {
        return { valid: false, error: "invalid-token" };
      }
      studentInfo = {
        studentId: assigneeDoc.data()!.studentId,
        firstName: assigneeDoc.data()!.firstName,
      };
    }

    const now = new Date();
    const isExpired = hw.dueDate ? new Date(hw.dueDate) < now : false;
    const isClosed = !hw.open || (isExpired && !hw.allowLate);

    // Fetch activity for play
    const actDoc = await db.doc(`activities/${hw.activityId}`).get();
    const actData = actDoc.data();

    return {
      valid: true,
      isClosed,
      isExpired,
      homework: {
        id: homeworkDoc.id,
        activityId: hw.activityId,
        activitySlug: hw.activitySlug || "",
        activityTitle: hw.activityTitle || "",
        activityType: hw.activityType || "quiz",
        targetType: hw.targetType,
        className: hw.className || null,
        classRoster: hw.classRoster || [],
        dueDate: hw.dueDate || null,
        instruction: hw.instruction || "",
        allowLate: Boolean(hw.allowLate),
        open: Boolean(hw.open),
      },
      student: studentInfo,
      activityContent: actData?.content,
    };
  },
});

/* =========================================================================
 * 3. verifyStudentPin
 * ========================================================================= */
export const verifyStudentPinSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
  pin: z.string().min(1, "pin is required"),
});

export type VerifyStudentPinInput = z.infer<typeof verifyStudentPinSchema>;

export interface VerifyStudentPinOutput {
  success: boolean;
  studentName?: string;
  locked?: boolean;
}

export const verifyStudentPin = createCallable<VerifyStudentPinInput, VerifyStudentPinOutput>({
  schema: verifyStudentPinSchema,
  requireAuth: false,
  handler: async (data) => {
    const db = getAdminFirestore();
    const now = Date.now();
    const attemptRef = db.doc(`pinAttempts/${data.studentId}`);
    const attemptDoc = await attemptRef.get();

    let failedCount = 0;
    let lockedUntil = 0;

    if (attemptDoc.exists) {
      const aData = attemptDoc.data()!;
      if (aData.lockedUntil && now < aData.lockedUntil) {
        throw new HttpsError("resource-exhausted", "Too many attempts — ask your teacher");
      }
      if (aData.lastAttemptAt && now - aData.lastAttemptAt < 15 * 60 * 1000) {
        failedCount = aData.failedCount || 0;
      }
    }

    const studentDoc = await db.doc(`students/${data.studentId}`).get();
    if (!studentDoc.exists) {
      throw new HttpsError("not-found", "Student not found");
    }
    const student = studentDoc.data()!;
    const hashed = hashPin(data.pin);

    // If student had 5 failed attempts in the window, even a correct PIN is locked until expiry (CA13)
    if (failedCount >= 5 && attemptDoc.exists && attemptDoc.data()?.lockedUntil && now < attemptDoc.data()?.lockedUntil) {
      throw new HttpsError("resource-exhausted", "Too many attempts — ask your teacher");
    }

    if (hashed !== student.homeworkPin) {
      failedCount++;
      if (failedCount >= 5) {
        lockedUntil = now + 15 * 60 * 1000;
      }
      await attemptRef.set({
        studentId: data.studentId,
        studentName: student.name,
        teacherUid: student.teacherUid,
        failedCount,
        lockedUntil,
        lastAttemptAt: now,
      });

      if (failedCount >= 5) {
        throw new HttpsError("resource-exhausted", "Too many attempts — ask your teacher");
      }
      throw new HttpsError("invalid-argument", "Wrong PIN");
    }

    // PIN is correct and not locked out -> clear attempts
    await attemptRef.delete().catch(() => {});

    return {
      success: true,
      studentName: student.name,
    };
  },
});

/* =========================================================================
 * 4. regenerateStudentHomeworkToken
 * ========================================================================= */
export const regenerateStudentHomeworkTokenSchema = z.object({
  homeworkId: z.string().min(1, "homeworkId is required"),
  studentId: z.string().min(1, "studentId is required"),
});

export type RegenerateStudentHomeworkTokenInput = z.infer<
  typeof regenerateStudentHomeworkTokenSchema
>;

export interface RegenerateStudentHomeworkTokenOutput {
  token: string;
}

export const regenerateStudentHomeworkToken = createCallable<
  RegenerateStudentHomeworkTokenInput,
  RegenerateStudentHomeworkTokenOutput
>({
  schema: regenerateStudentHomeworkTokenSchema,
  requireAuth: true,
  handler: async (data, request) => {
    const uid = request.auth!.uid;
    const db = getAdminFirestore();

    const hwDoc = await db.doc(`homework/${data.homeworkId}`).get();
    if (!hwDoc.exists) {
      throw new HttpsError("not-found", "Homework not found");
    }
    if (hwDoc.data()?.teacherUid !== uid) {
      throw new HttpsError("permission-denied", "Only the teacher can regenerate tokens");
    }

    // Find and delete old tokens for this student
    const assigneesQuery = await db
      .collection(`homework/${data.homeworkId}/assignees`)
      .where("studentId", "==", data.studentId)
      .get();

    let firstName = "Student";
    const batch = db.batch();
    for (const docSnap of assigneesQuery.docs) {
      firstName = docSnap.data()?.firstName || firstName;
      batch.delete(docSnap.ref);
    }

    const newToken = randomStudentToken();
    const newRef = db.doc(`homework/${data.homeworkId}/assignees/${newToken}`);
    batch.set(newRef, {
      studentId: data.studentId,
      firstName,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return { token: newToken };
  },
});

/* =========================================================================
 * 5. submitHomework
 * ========================================================================= */
export const submitHomeworkSchema = z.object({
  homeworkId: z.string().min(1, "homeworkId is required"),
  via: z.enum(["token", "pin", "portal", "anonymous"]),
  studentToken: z.string().optional(),
  studentId: z.string().optional(),
  studentPin: z.string().optional(),
  studentName: z.string().optional(),
  seconds: z.number().int().min(0).default(0),
  answers: z.array(z.unknown()).default([]),
});

export type SubmitHomeworkInput = z.infer<typeof submitHomeworkSchema>;

export interface SubmitHomeworkOutput {
  success: true;
  submissionId: string;
  correct: number;
  total: number;
  seconds: number;
  late: boolean;
}

export const submitHomework = createCallable<SubmitHomeworkInput, SubmitHomeworkOutput>({
  schema: submitHomeworkSchema,
  requireAuth: false,
  handler: async (data, request) => {
    const db = getAdminFirestore();
    const hwDoc = await db.doc(`homework/${data.homeworkId}`).get();

    if (!hwDoc.exists) {
      throw new HttpsError("not-found", "This homework link is not valid");
    }
    const hw = hwDoc.data()!;

    // Status check (RF07, CA06)
    if (!hw.open) {
      throw new HttpsError("failed-precondition", "This homework is closed");
    }

    let late = false;
    if (hw.dueDate && new Date(hw.dueDate) < new Date()) {
      if (!hw.allowLate) {
        throw new HttpsError("failed-precondition", "This homework is closed");
      }
      late = true;
    }

    let resolvedStudentId: string | null = null;
    let resolvedStudentName = data.studentName?.trim() || "";
    let portalUid: string | null = null;

    if (data.via === "token") {
      if (!data.studentToken) {
        throw new HttpsError("invalid-argument", "studentToken is required for token submission");
      }
      const assigneeDoc = await db
        .doc(`homework/${data.homeworkId}/assignees/${data.studentToken}`)
        .get();
      if (!assigneeDoc.exists) {
        throw new HttpsError("permission-denied", "This homework link is not valid");
      }
      const aData = assigneeDoc.data()!;
      // Token forgery prevention (CA12): hash of Ana cannot be submitted with studentId of Bruno
      if (data.studentId && data.studentId !== aData.studentId) {
        throw new HttpsError("permission-denied", "Student token mismatch");
      }
      resolvedStudentId = aData.studentId;
      resolvedStudentName = aData.firstName;
    } else if (data.via === "pin") {
      if (!data.studentId || !data.studentPin) {
        throw new HttpsError("invalid-argument", "studentId and studentPin are required");
      }
      const sDoc = await db.doc(`students/${data.studentId}`).get();
      if (!sDoc.exists) {
        throw new HttpsError("not-found", "Student not found");
      }
      const s = sDoc.data()!;
      const hashed = hashPin(data.studentPin);
      if (hashed !== s.homeworkPin) {
        throw new HttpsError("invalid-argument", "Wrong PIN");
      }
      resolvedStudentId = data.studentId;
      resolvedStudentName = s.name;
    } else if (data.via === "portal") {
      if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Authentication required for portal submission");
      }
      const sQuery = await db
        .collection("students")
        .where("portalUid", "==", request.auth.uid)
        .limit(1)
        .get();
      if (sQuery.empty) {
        throw new HttpsError("permission-denied", "Portal student record not found");
      }
      const sDoc = sQuery.docs[0];
      resolvedStudentId = sDoc.id;
      resolvedStudentName = sDoc.data()?.name || "Student";
      portalUid = request.auth.uid;
    } else if (data.via === "anonymous") {
      if (hw.targetType !== "anyone") {
        throw new HttpsError("permission-denied", "Anonymous submission not permitted");
      }
      resolvedStudentName = data.studentName?.trim() || "Anonymous";
    }

    // Limit check: up to 3 attempts per student per homework (RNF03, CA07)
    if (resolvedStudentId) {
      const existingSubs = await db
        .collection(`homework/${data.homeworkId}/submissions`)
        .where("studentId", "==", resolvedStudentId)
        .get();
      if (existingSubs.size >= 3) {
        throw new HttpsError("failed-precondition", "You've used all 3 attempts");
      }
    }

    const totalCount = await db
      .collection(`homework/${data.homeworkId}/submissions`)
      .count()
      .get();
    if (totalCount.data().count >= 200) {
      throw new HttpsError("resource-exhausted", "Maximum submissions reached for this homework");
    }

    // Server-side recalculation of score (RNF04, RF10, CA08, CA09)
    const actDoc = await db.doc(`activities/${hw.activityId}`).get();
    const actData = actDoc.data();
    const { correct, total } = gradeActivityAnswers(
      hw.activityType,
      actData?.content,
      data.answers,
    );

    const submissionRef = db.collection(`homework/${data.homeworkId}/submissions`).doc();
    await submissionRef.set({
      studentId: resolvedStudentId,
      studentName: resolvedStudentName,
      via: data.via,
      portalUid,
      correct,
      total,
      seconds: data.seconds,
      answers: data.answers,
      completedAt: FieldValue.serverTimestamp(),
      late,
    });

    // Record on student subcollection (RF09, CA05)
    if (resolvedStudentId) {
      await db
        .doc(`students/${resolvedStudentId}/homeworkSubmissions/${submissionRef.id}`)
        .set({
          homeworkId: data.homeworkId,
          activityId: hw.activityId,
          activityTitle: hw.activityTitle,
          activityType: hw.activityType,
          correct,
          total,
          seconds: data.seconds,
          completedAt: FieldValue.serverTimestamp(),
          late,
        });

      // Mark learning track steps for student (spec 11: RF06, RNF03, CA05)
      try {
        const tracksCol = db.collection(`students/${resolvedStudentId}/tracks`);
        if (tracksCol && typeof tracksCol.get === "function") {
          const tracksSnap = await tracksCol.get();
          if (!tracksSnap.empty) {
            const batch = db.batch();
            let hasUpdates = false;
            for (const tDoc of tracksSnap.docs) {
              const tData = tDoc.data();
              const actIds: string[] = Array.isArray(tData.activityIds) ? tData.activityIds : [];
              if (actIds.includes(hw.activityId)) {
                const comp = tData.completed || {};
                if (!comp[hw.activityId]) {
                  batch.update(tDoc.ref, {
                    [`completed.${hw.activityId}`]: {
                      at: new Date().toISOString(),
                      source: "homework",
                    },
                    updatedAt: FieldValue.serverTimestamp(),
                  });
                  hasUpdates = true;
                }
              }
            }
            if (hasUpdates) {
              await batch.commit();
            }
          }
        }
      } catch (err) {
        console.warn("Could not auto-complete track steps on homework submission:", err);
      }
    }

    return {
      success: true,
      submissionId: submissionRef.id,
      correct,
      total,
      seconds: data.seconds,
      late,
    };
  },
});

/**
 * Firestore trigger when a submission is created directly in homework/{homeworkId}/submissions/{submissionId}
 * (spec 11: RNF03, CA05).
 */
export const onHomeworkSubmissionCreated = onDocumentCreated(
  "homework/{homeworkId}/submissions/{submissionId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const subData = snap.data();
    const studentId = subData?.studentId;
    if (!studentId) return;

    const db = getAdminFirestore();
    const hwDoc = await db.doc(`homework/${event.params.homeworkId}`).get();
    if (!hwDoc.exists) return;
    const activityId = hwDoc.data()?.activityId;
    if (!activityId) return;

    try {
      const tracksSnap = await db.collection(`students/${studentId}/tracks`).get();
      if (tracksSnap.empty) return;

      const batch = db.batch();
      let hasUpdates = false;
      for (const tDoc of tracksSnap.docs) {
        const tData = tDoc.data();
        const actIds: string[] = Array.isArray(tData.activityIds) ? tData.activityIds : [];
        if (actIds.includes(activityId)) {
          const comp = tData.completed || {};
          if (!comp[activityId]) {
            batch.update(tDoc.ref, {
              [`completed.${activityId}`]: {
                at: new Date().toISOString(),
                source: "homework",
              },
              updatedAt: FieldValue.serverTimestamp(),
            });
            hasUpdates = true;
          }
        }
      }
      if (hasUpdates) {
        await batch.commit();
      }
    } catch (err) {
      console.warn("Error in onHomeworkSubmissionCreated trigger:", err);
    }
  },
);

