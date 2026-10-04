import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { createCallable } from "./helpers/callable.js";
import { getAdminFirestore } from "./helpers/firebase-admin.js";

export const deleteStudentSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
});

export type DeleteStudentInput = z.infer<typeof deleteStudentSchema>;

export interface DeleteStudentOutput {
  success: true;
  deletedStudentId: string;
}

/**
 * Cloud Function to delete a student and cascade delete all their subcollections (RF07, CA06).
 * Ensures only the student's teacher can delete them, removes the studentId from any classes
 * they belong to, and performs a recursive deletion of the student document and subcollections.
 */
export const deleteStudent = createCallable<DeleteStudentInput, DeleteStudentOutput>({
  schema: deleteStudentSchema,
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
        "You do not have permission to delete this student.",
      );
    }

    // Remove studentId from teacher's classes that include this student
    const classIds = Array.isArray(studentData.classIds) ? studentData.classIds : [];
    if (classIds.length > 0) {
      const batch = db.batch();
      for (const classId of classIds) {
        if (typeof classId === "string" && classId) {
          const classRef = db.doc(`users/${uid}/classes/${classId}`);
          batch.update(classRef, {
            studentIds: FieldValue.arrayRemove(data.studentId),
          });
        }
      }
      try {
        await batch.commit();
      } catch (error) {
        console.warn("Could not remove student from classes during deletion:", error);
      }
    }

    // Recursively delete student document and any subcollections (grades, vocabulary, etc.)
    await db.recursiveDelete(studentRef);

    return {
      success: true,
      deletedStudentId: data.studentId,
    };
  },
});
