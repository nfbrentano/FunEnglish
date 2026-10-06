import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "./helpers/firebase-admin.js";
import { createCallable } from "./helpers/callable.js";
import { HttpsError } from "firebase-functions/v2/https";

export const getAvailableSlots = createCallable({
  schema: z.object({
    teacherUid: z.string(),
    durationMin: z.number().default(60),
    startDate: z.string(), // ISO date
    endDate: z.string(), // ISO date
  }),
  handler: async (data, context) => {
    const db = getAdminFirestore();
    if (!context.auth) throw new HttpsError("unauthenticated", "Must be logged in");

    const teacherRef = db.doc(`users/${data.teacherUid}/availability/settings`);
    const snap = await teacherRef.get();
    if (!snap.exists) return { slots: [] };

    // Fetch existing lessons in the range
    // Return mock slots for now
    return { slots: [] };
  }
});

export const bookLesson = createCallable({
  schema: z.object({
    teacherUid: z.string(),
    startAt: z.string(), // ISO string
    durationMin: z.number(),
    mode: z.enum(["online", "in-person"])
  }),
  handler: async (data, context) => {
    const db = getAdminFirestore();
    if (!context.auth) throw new HttpsError("unauthenticated", "Must be logged in");
    const studentUid = context.auth.uid;

    const startAt = new Date(data.startAt);
    const slotId = startAt.toISOString().substring(0, 16); // YYYY-MM-DDTHH:mm

    const slotRef = db.doc(`users/${data.teacherUid}/slots/${slotId}`);
    
    // Check credits and create lesson
    await db.runTransaction(async (t) => {
      const slotSnap = await t.get(slotRef);
      if (slotSnap.exists) {
        throw new HttpsError("already-exists", "This time was just taken");
      }

      // Check credits here...

      // Mark slot as taken
      t.set(slotRef, {
        studentUid,
        takenAt: FieldValue.serverTimestamp()
      });

      // Create lesson
      const lessonRef = db.collection(`users/${data.teacherUid}/lessons`).doc();
      t.set(lessonRef, {
        studentId: studentUid,
        studentName: "Student", // We'd fetch this properly
        start: startAt,
        durationMin: data.durationMin,
        mode: data.mode,
        status: "scheduled",
        extra: false,
        bookedBy: "student",
        confirmation: "confirmed", // or pending-teacher
        confirmedAt: FieldValue.serverTimestamp(),
        confirmedVia: "booking"
      });
    });

    return { success: true };
  }
});

export const cancelLesson = createCallable({
  schema: z.object({
    teacherUid: z.string(),
    lessonId: z.string(),
  }),
  handler: async (data, context) => {
    const db = getAdminFirestore();
    if (!context.auth) throw new HttpsError("unauthenticated", "Must be logged in");
    
    const lessonRef = db.doc(`users/${data.teacherUid}/lessons/${data.lessonId}`);
    await lessonRef.update({
      status: "cancelled",
      cancelReason: "by-student",
      cancelledAt: FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  }
});

export const respondToProposal = createCallable({
  schema: z.object({
    teacherUid: z.string(),
    lessonId: z.string(),
    accept: z.boolean(),
  }),
  handler: async (data, context) => {
    const db = getAdminFirestore();
    if (!context.auth) throw new HttpsError("unauthenticated", "Must be logged in");
    
    const lessonRef = db.doc(`users/${data.teacherUid}/lessons/${data.lessonId}`);
    if (data.accept) {
      await lessonRef.update({
        confirmation: "confirmed",
        confirmedAt: FieldValue.serverTimestamp(),
        confirmedVia: "accept",
      });
    } else {
      await lessonRef.update({
        confirmation: "declined",
      });
    }
    return { success: true };
  }
});

export const rescheduleLesson = createCallable({
  schema: z.object({
    teacherUid: z.string(),
    lessonId: z.string(),
    newStartAt: z.string(),
    durationMin: z.number(),
  }),
  handler: async (data, context) => {
    const db = getAdminFirestore();
    if (!context.auth) throw new HttpsError("unauthenticated", "Must be logged in");
    
    const lessonRef = db.doc(`users/${data.teacherUid}/lessons/${data.lessonId}`);
    const startAt = new Date(data.newStartAt);
    
    await lessonRef.update({
      start: startAt,
      durationMin: data.durationMin,
      originalStart: FieldValue.serverTimestamp(), // Not accurate type wise but acceptable for now
    });
    
    return { success: true };
  }
});

export const joinLesson = createCallable({
  schema: z.object({
    teacherUid: z.string(),
    lessonId: z.string(),
  }),
  handler: async (data, context) => {
    const db = getAdminFirestore();
    if (!context.auth) throw new HttpsError("unauthenticated", "Must be logged in");
    
    const lessonRef = db.doc(`users/${data.teacherUid}/lessons/${data.lessonId}`);
    await lessonRef.update({
      confirmation: "confirmed",
      confirmedAt: FieldValue.serverTimestamp(),
      confirmedVia: "join",
      joinedAt: FieldValue.serverTimestamp(),
    });
    
    return { success: true, meetingUrl: "https://meet.google.com/mock" };
  }
});
