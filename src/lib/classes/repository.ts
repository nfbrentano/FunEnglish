import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { callDeleteStudent } from "@/lib/functions";
import { parseStudentBatch } from "./batch";
import { generateHomeworkPin, hashHomeworkPin } from "./pin";
import {
  MAX_CLASSES_PER_TEACHER,
  MAX_CLASS_NAME_LENGTH,
  MAX_STUDENTS_PER_CLASS,
  MAX_STUDENTS_PER_TEACHER,
  type CreatedStudentResult,
  type Student,
  type TeacherClass,
  type StudentPrivateProfile,
} from "./types";

function toDate(val: unknown): Date {
  if (val && typeof (val as Timestamp).toDate === "function") {
    return (val as Timestamp).toDate();
  }
  if (val instanceof Date) {
    return val;
  }
  return new Date();
}

/**
 * Creates a new class for the teacher (RF01, RF02, CA01).
 */
export async function createClass(uid: string, name: string): Promise<TeacherClass> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_CLASS_NAME_LENGTH) {
    throw new Error(
      `Class name must be between 1 and ${MAX_CLASS_NAME_LENGTH} characters.`,
    );
  }

  const db = getDb();
  const classesCol = collection(db, `users/${uid}/classes`);
  const existing = await getDocs(classesCol);
  if (existing.size >= MAX_CLASSES_PER_TEACHER) {
    throw new Error(`Maximum limit of ${MAX_CLASSES_PER_TEACHER} classes reached.`);
  }

  const newClassRef = doc(classesCol);
  const now = new Date();
  const classData = {
    name: trimmed,
    studentIds: [],
    archived: false,
    createdAt: now,
  };

  await setDoc(newClassRef, classData);

  return {
    id: newClassRef.id,
    name: trimmed,
    studentIds: [],
    archived: false,
    createdAt: now,
  };
}

/**
 * Renames a teacher's class (RF02).
 */
export async function renameClass(uid: string, classId: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed || trimmed.length > MAX_CLASS_NAME_LENGTH) {
    throw new Error(
      `Class name must be between 1 and ${MAX_CLASS_NAME_LENGTH} characters.`,
    );
  }
  const db = getDb();
  await updateDoc(doc(db, `users/${uid}/classes/${classId}`), {
    name: trimmed,
  });
}

/**
 * Archives or restores a teacher's class (RF06, CA05).
 */
export async function archiveClass(
  uid: string,
  classId: string,
  archived: boolean,
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, `users/${uid}/classes/${classId}`), {
    archived,
  });
}

/**
 * Deletes a class and removes references from affected students (RF02).
 */
export async function deleteClass(uid: string, classId: string): Promise<void> {
  const db = getDb();
  const classRef = doc(db, `users/${uid}/classes/${classId}`);
  const snap = await getDoc(classRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const studentIds: string[] = Array.isArray(data.studentIds) ? data.studentIds : [];

  if (studentIds.length > 0) {
    const batch = writeBatch(db);
    for (const sid of studentIds) {
      const studentRef = doc(db, `students/${sid}`);
      batch.update(studentRef, {
        classIds: arrayRemove(classId),
      });
    }
    await batch.commit().catch((err) => {
      console.warn("Could not remove classId from some students:", err);
    });
  }

  await deleteDoc(classRef);
}

/**
 * Fetches all classes for a teacher, ordered by creation date descending.
 */
export async function getTeacherClasses(uid: string): Promise<TeacherClass[]> {
  const db = getDb();
  const classesCol = collection(db, `users/${uid}/classes`);
  const q = query(classesCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      studentIds: Array.isArray(data.studentIds) ? data.studentIds : [],
      archived: Boolean(data.archived),
      createdAt: toDate(data.createdAt),
    };
  });
}

/**
 * Creates a single student and adds them to a class (RF03, CA01).
 */
export async function createStudent(
  teacherUid: string,
  classId: string,
  name: string,
  email?: string,
): Promise<CreatedStudentResult> {
  const trimmedName = name.trim().replace(/\s+/g, " ");
  if (!trimmedName || trimmedName.length > 100) {
    throw new Error("Student name must be between 1 and 100 characters.");
  }

  const trimmedEmail = email?.trim() || undefined;
  if (trimmedEmail) {
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 254) {
      throw new Error("Invalid student email address.");
    }
  }

  const db = getDb();
  const classRef = doc(db, `users/${teacherUid}/classes/${classId}`);
  const classSnap = await getDoc(classRef);
  if (!classSnap.exists()) {
    throw new Error("Class not found.");
  }

  const classData = classSnap.data();
  const currentStudentIds: string[] = Array.isArray(classData.studentIds) ? classData.studentIds : [];
  if (currentStudentIds.length >= MAX_STUDENTS_PER_CLASS) {
    throw new Error(
      `Class has reached the maximum of ${MAX_STUDENTS_PER_CLASS} students.`,
    );
  }

  // Check teacher overall limit
  const teacherStudentsQuery = query(
    collection(db, "students"),
    where("teacherUid", "==", teacherUid),
  );
  const teacherStudentsSnap = await getDocs(teacherStudentsQuery);
  if (teacherStudentsSnap.size >= MAX_STUDENTS_PER_TEACHER) {
    throw new Error(
      `Teacher has reached the maximum of ${MAX_STUDENTS_PER_TEACHER} students.`,
    );
  }

  const studentRef = doc(collection(db, "students"));
  const rawPin = generateHomeworkPin();
  const hashedPin = await hashHomeworkPin(rawPin);
  const now = new Date();

  const studentDocData: Record<string, unknown> = {
    teacherUid,
    name: trimmedName,
    classIds: [classId],
    homeworkPin: hashedPin,
    createdAt: now,
  };
  if (trimmedEmail) {
    studentDocData.email = trimmedEmail;
  }

  const batch = writeBatch(db);
  batch.set(studentRef, studentDocData);
  batch.update(classRef, {
    studentIds: arrayUnion(studentRef.id),
  });
  await batch.commit();

  return {
    student: {
      id: studentRef.id,
      teacherUid,
      name: trimmedName,
      email: trimmedEmail,
      classIds: [classId],
      homeworkPin: hashedPin,
      createdAt: now,
    },
    rawPin,
  };
}

/**
 * Creates an individual student without a class, using the new 1:1 profile fields (Spec 17).
 */
export async function createIndividualStudent(
  teacherUid: string,
  data: {
    name: string;
    email?: string;
    level?: string;
    goal?: string;
    interests?: string[];
    defaultMode?: string;
  }
): Promise<CreatedStudentResult> {
  const trimmedName = data.name.trim().replace(/\s+/g, " ");
  if (!trimmedName || trimmedName.length > 100) {
    throw new Error("Student name must be between 1 and 100 characters.");
  }

  const trimmedEmail = data.email?.trim() || undefined;
  if (trimmedEmail) {
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 254) {
      throw new Error("Invalid student email address.");
    }
  }

  const db = getDb();
  
  // Check teacher overall limit
  const teacherStudentsQuery = query(
    collection(db, "students"),
    where("teacherUid", "==", teacherUid),
  );
  const teacherStudentsSnap = await getDocs(teacherStudentsQuery);
  if (teacherStudentsSnap.size >= MAX_STUDENTS_PER_TEACHER) {
    throw new Error(
      `Teacher has reached the maximum of ${MAX_STUDENTS_PER_TEACHER} students.`
    );
  }

  const studentRef = doc(collection(db, "students"));
  const rawPin = generateHomeworkPin();
  const hashedPin = await hashHomeworkPin(rawPin);
  const now = new Date();

  const studentDocData: Record<string, unknown> = {
    teacherUid,
    name: trimmedName,
    classIds: [], // no class
    homeworkPin: hashedPin,
    createdAt: now,
    status: "Active",
  };
  
  if (trimmedEmail) studentDocData.email = trimmedEmail;
  if (data.level) studentDocData.level = data.level;
  if (data.goal) studentDocData.goal = data.goal;
  if (data.interests && data.interests.length > 0) studentDocData.interests = data.interests.slice(0, 10);
  if (data.defaultMode) studentDocData.defaultMode = data.defaultMode;

  await setDoc(studentRef, studentDocData);

  return {
    student: {
      id: studentRef.id,
      teacherUid,
      name: trimmedName,
      email: trimmedEmail,
      classIds: [],
      homeworkPin: hashedPin,
      createdAt: now,
      status: "Active",
      level: data.level as any,
      goal: data.goal as any,
      interests: data.interests?.slice(0, 10),
      defaultMode: data.defaultMode as any,
    },
    rawPin,
  };
}

/**
 * Adds multiple students in a batch from raw pasted text (RF03, CA02).
 */
export async function createStudentsBatch(
  teacherUid: string,
  classId: string,
  rawText: string,
): Promise<{ created: CreatedStudentResult[]; error?: string }> {
  const { names, error } = parseStudentBatch(rawText);
  if (error) {
    return { created: [], error };
  }
  if (names.length === 0) {
    return { created: [] };
  }

  const db = getDb();
  const classRef = doc(db, `users/${teacherUid}/classes/${classId}`);
  const classSnap = await getDoc(classRef);
  if (!classSnap.exists()) {
    return { created: [], error: "Class not found." };
  }

  const classData = classSnap.data();
  const currentStudentIds: string[] = Array.isArray(classData.studentIds) ? classData.studentIds : [];
  if (currentStudentIds.length + names.length > MAX_STUDENTS_PER_CLASS) {
    return {
      created: [],
      error: `Adding ${names.length} students would exceed the class limit of ${MAX_STUDENTS_PER_CLASS} (currently has ${currentStudentIds.length}).`,
    };
  }

  const teacherStudentsQuery = query(
    collection(db, "students"),
    where("teacherUid", "==", teacherUid),
  );
  const teacherStudentsSnap = await getDocs(teacherStudentsQuery);
  if (teacherStudentsSnap.size + names.length > MAX_STUDENTS_PER_TEACHER) {
    return {
      created: [],
      error: `Adding ${names.length} students would exceed the teacher limit of ${MAX_STUDENTS_PER_TEACHER} (currently has ${teacherStudentsSnap.size}).`,
    };
  }

  const created: CreatedStudentResult[] = [];
  const batch = writeBatch(db);
  const newStudentIds: string[] = [];
  const now = new Date();

  for (const name of names) {
    const studentRef = doc(collection(db, "students"));
    const rawPin = generateHomeworkPin();
    const hashedPin = await hashHomeworkPin(rawPin);

    const studentDocData: Record<string, unknown> = {
      teacherUid,
      name,
      classIds: [classId],
      homeworkPin: hashedPin,
      createdAt: now,
    };

    batch.set(studentRef, studentDocData);
    newStudentIds.push(studentRef.id);

    created.push({
      student: {
        id: studentRef.id,
        teacherUid,
        name,
        classIds: [classId],
        homeworkPin: hashedPin,
        createdAt: now,
      },
      rawPin,
    });
  }

  batch.update(classRef, {
    studentIds: arrayUnion(...newStudentIds),
  });

  await batch.commit();

  return { created };
}

/**
 * Copies a student to another class (RF04, CA03).
 */
export async function copyStudentToClass(
  teacherUid: string,
  studentId: string,
  targetClassId: string,
): Promise<void> {
  const db = getDb();
  const targetClassRef = doc(db, `users/${teacherUid}/classes/${targetClassId}`);
  const targetSnap = await getDoc(targetClassRef);
  if (!targetSnap.exists()) {
    throw new Error("Target class not found.");
  }

  const targetData = targetSnap.data();
  const currentStudentIds: string[] = Array.isArray(targetData.studentIds) ? targetData.studentIds : [];
  if (currentStudentIds.includes(studentId)) {
    return; // Already in target class
  }
  if (currentStudentIds.length >= MAX_STUDENTS_PER_CLASS) {
    throw new Error(
      `Target class has reached the maximum of ${MAX_STUDENTS_PER_CLASS} students.`,
    );
  }

  const studentRef = doc(db, `students/${studentId}`);
  const batch = writeBatch(db);
  batch.update(studentRef, {
    classIds: arrayUnion(targetClassId),
  });
  batch.update(targetClassRef, {
    studentIds: arrayUnion(studentId),
  });
  await batch.commit();
}

/**
 * Moves a student from one class to another (RF04).
 */
export async function moveStudentToClass(
  teacherUid: string,
  studentId: string,
  fromClassId: string,
  toClassId: string,
): Promise<void> {
  if (fromClassId === toClassId) return;

  const db = getDb();
  const targetClassRef = doc(db, `users/${teacherUid}/classes/${toClassId}`);
  const targetSnap = await getDoc(targetClassRef);
  if (!targetSnap.exists()) {
    throw new Error("Target class not found.");
  }

  const targetData = targetSnap.data();
  const targetStudentIds: string[] = Array.isArray(targetData.studentIds) ? targetData.studentIds : [];
  if (!targetStudentIds.includes(studentId) && targetStudentIds.length >= MAX_STUDENTS_PER_CLASS) {
    throw new Error(
      `Target class has reached the maximum of ${MAX_STUDENTS_PER_CLASS} students.`,
    );
  }

  const studentRef = doc(db, `students/${studentId}`);
  const fromClassRef = doc(db, `users/${teacherUid}/classes/${fromClassId}`);

  const batch = writeBatch(db);
  batch.update(studentRef, {
    classIds: arrayUnion(toClassId),
  });
  batch.update(studentRef, {
    classIds: arrayRemove(fromClassId),
  });
  batch.update(fromClassRef, {
    studentIds: arrayRemove(studentId),
  });
  batch.update(targetClassRef, {
    studentIds: arrayUnion(studentId),
  });
  await batch.commit();
}

/**
 * Removes a student from a specific class (RF04).
 */
export async function removeStudentFromClass(
  teacherUid: string,
  studentId: string,
  classId: string,
): Promise<void> {
  const db = getDb();
  const studentRef = doc(db, `students/${studentId}`);
  const classRef = doc(db, `users/${teacherUid}/classes/${classId}`);

  const batch = writeBatch(db);
  batch.update(studentRef, {
    classIds: arrayRemove(classId),
  });
  batch.update(classRef, {
    studentIds: arrayRemove(studentId),
  });
  await batch.commit();
}

/**
 * Updates a student's basic information (name, email) (RF04).
 */
export async function updateStudent(
  teacherUid: string,
  studentId: string,
  updates: { name?: string; email?: string },
): Promise<void> {
  const db = getDb();
  const updateData: Record<string, unknown> = {};

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim().replace(/\s+/g, " ");
    if (!trimmed || trimmed.length > 100) {
      throw new Error("Student name must be between 1 and 100 characters.");
    }
    updateData.name = trimmed;
  }

  if (updates.email !== undefined) {
    const trimmed = updates.email.trim();
    if (trimmed) {
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(trimmed) || trimmed.length > 254) {
        throw new Error("Invalid student email address.");
      }
      updateData.email = trimmed;
    }
  }

  if (Object.keys(updateData).length === 0) return;

  await updateDoc(doc(db, `students/${studentId}`), updateData);
}

/**
 * Generates a new 4-digit PIN for the student and saves its hash (RNF01).
 * Returns the raw 4-digit PIN for the teacher to view and share.
 */
export async function regenerateStudentPin(
  teacherUid: string,
  studentId: string,
): Promise<string> {
  const rawPin = generateHomeworkPin();
  const hashedPin = await hashHomeworkPin(rawPin);
  const db = getDb();

  await updateDoc(doc(db, `students/${studentId}`), {
    homeworkPin: hashedPin,
  });

  return rawPin;
}

/**
 * Permanently deletes a student and recursively wipes subcollections via Cloud Function (RF07, CA06).
 */
export async function deleteStudentAccount(studentId: string): Promise<void> {
  await callDeleteStudent(studentId);
}

/**
 * Fetches a single student document by ID (RF05, CA04).
 */
export async function getStudent(studentId: string): Promise<Student | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, `students/${studentId}`));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: snap.id,
    teacherUid: data.teacherUid,
    name: data.name,
    email: data.email,
    classIds: Array.isArray(data.classIds) ? data.classIds : [],
    portalUid: data.portalUid,
    homeworkPin: data.homeworkPin,
    createdAt: toDate(data.createdAt),
    level: data.level,
    goal: data.goal,
    goalNote: data.goalNote,
    interests: data.interests,
    defaultMode: data.defaultMode,
    status: data.status,
    startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
    lastLessonAt: data.lastLessonAt ? toDate(data.lastLessonAt) : undefined,
  };
}

/**
 * Fetches all students belonging to a teacher.
 */
export async function getTeacherStudents(teacherUid: string): Promise<Student[]> {
  const db = getDb();
  const q = query(collection(db, "students"), where("teacherUid", "==", teacherUid));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      teacherUid: data.teacherUid,
      name: data.name,
      email: data.email,
      classIds: Array.isArray(data.classIds) ? data.classIds : [],
      portalUid: data.portalUid,
      homeworkPin: data.homeworkPin,
      createdAt: toDate(data.createdAt),
      level: data.level,
      goal: data.goal,
      goalNote: data.goalNote,
      interests: data.interests,
      defaultMode: data.defaultMode,
      status: data.status,
      startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
      lastLessonAt: data.lastLessonAt ? toDate(data.lastLessonAt) : undefined,
    };
  });
}

/**
 * Fetches the private profile for a student (Spec 17).
 */
export async function getStudentPrivateProfile(studentId: string): Promise<StudentPrivateProfile | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, `students/${studentId}/private/profile`));
  if (!snap.exists()) return null;
  return snap.data() as StudentPrivateProfile;
}

/**
 * Updates the private profile for a student (Spec 17).
 */
export async function updateStudentPrivateProfile(studentId: string, profile: StudentPrivateProfile): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, `students/${studentId}/private/profile`), profile, { merge: true });
}
