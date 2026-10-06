"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import {
  archiveClass,
  copyStudentToClass,
  createClass,
  createStudent,
  createIndividualStudent,
  createStudentsBatch,
  deleteClass,
  deleteStudentAccount,
  getTeacherClasses,
  getTeacherStudents,
  moveStudentToClass,
  regenerateStudentPin,
  removeStudentFromClass,
  renameClass,
  updateStudent,
} from "./repository";
import type { CreatedStudentResult, Student, TeacherClass } from "./types";

export function useClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loading = !user ? false : internalLoading;

  const loadData = useCallback(async (uid: string) => {
    try {
      const [fetchedClasses, fetchedStudents] = await Promise.all([
        getTeacherClasses(uid),
        getTeacherStudents(uid),
      ]);
      setClasses(fetchedClasses);
      setStudents(fetchedStudents);
      setError(null);
    } catch (err) {
      console.error("Failed to load classes or students:", err);
      setError("Failed to load classes and students.");
    } finally {
      setInternalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    let active = true;
    Promise.all([getTeacherClasses(user.uid), getTeacherStudents(user.uid)])
      .then(([fetchedClasses, fetchedStudents]) => {
        if (!active) return;
        setClasses(fetchedClasses);
        setStudents(fetchedStudents);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load classes or students:", err);
        setError("Failed to load classes and students.");
      })
      .finally(() => {
        if (active) setInternalLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) {
      setClasses([]);
      setStudents([]);
      setInternalLoading(false);
      return;
    }
    setInternalLoading(true);
    await loadData(user.uid);
  }, [user, loadData]);

  const addClass = async (name: string): Promise<TeacherClass> => {
    if (!user) throw new Error("Must be logged in.");
    const newClass = await createClass(user.uid, name);
    await refresh();
    return newClass;
  };

  const editClassName = async (classId: string, name: string): Promise<void> => {
    if (!user) throw new Error("Must be logged in.");
    await renameClass(user.uid, classId, name);
    await refresh();
  };

  const toggleArchiveClass = async (classId: string, archived: boolean): Promise<void> => {
    if (!user) throw new Error("Must be logged in.");
    await archiveClass(user.uid, classId, archived);
    await refresh();
  };

  const removeClass = async (classId: string): Promise<void> => {
    if (!user) throw new Error("Must be logged in.");
    await deleteClass(user.uid, classId);
    await refresh();
  };

  const addStudent = async (
    classId: string,
    name: string,
    email?: string,
  ): Promise<CreatedStudentResult> => {
    if (!user) throw new Error("Must be logged in.");
    const result = await createStudent(user.uid, classId, name, email);
    await refresh();
    return result;
  };

  const addIndividualStudent = async (data: {
    name: string;
    email?: string;
    level?: string;
    goal?: string;
    interests?: string[];
    defaultMode?: string;
  }): Promise<CreatedStudentResult> => {
    if (!user) throw new Error("Must be logged in.");
    const result = await createIndividualStudent(user.uid, data);
    await refresh();
    return result;
  };

  const addStudentsBatch = async (
    classId: string,
    rawText: string,
  ): Promise<{ created: CreatedStudentResult[]; error?: string }> => {
    if (!user) throw new Error("Must be logged in.");
    const result = await createStudentsBatch(user.uid, classId, rawText);
    await refresh();
    return result;
  };

  const copyStudent = async (studentId: string, targetClassId: string): Promise<void> => {
    if (!user) throw new Error("Must be logged in.");
    await copyStudentToClass(user.uid, studentId, targetClassId);
    await refresh();
  };

  const moveStudent = async (
    studentId: string,
    fromClassId: string,
    toClassId: string,
  ): Promise<void> => {
    if (!user) throw new Error("Must be logged in.");
    await moveStudentToClass(user.uid, studentId, fromClassId, toClassId);
    await refresh();
  };

  const removeFromClass = async (studentId: string, classId: string): Promise<void> => {
    if (!user) throw new Error("Must be logged in.");
    await removeStudentFromClass(user.uid, studentId, classId);
    await refresh();
  };

  const editStudent = async (
    studentId: string,
    updates: { name?: string; email?: string },
  ): Promise<void> => {
    if (!user) throw new Error("Must be logged in.");
    await updateStudent(user.uid, studentId, updates);
    await refresh();
  };

  const deleteStudent = async (studentId: string): Promise<void> => {
    await deleteStudentAccount(studentId);
    await refresh();
  };

  const regenPin = async (studentId: string): Promise<string> => {
    if (!user) throw new Error("Must be logged in.");
    const rawPin = await regenerateStudentPin(user.uid, studentId);
    await refresh();
    return rawPin;
  };

  return {
    classes,
    students,
    loading,
    error,
    refresh,
    addClass,
    editClassName,
    toggleArchiveClass,
    removeClass,
    addStudent,
    addIndividualStudent,
    addStudentsBatch,
    copyStudent,
    moveStudent,
    removeFromClass,
    editStudent,
    deleteStudent,
    regenPin,
  };
}
