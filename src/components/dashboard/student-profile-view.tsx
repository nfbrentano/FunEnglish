"use client";

import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  KeyRound,
  Mail,
  Milestone,
  RefreshCw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import {
  getStudent,
  getTeacherClasses,
  getTeacherStudents,
  regenerateStudentPin,
} from "@/lib/classes/repository";
import type { Student, TeacherClass } from "@/lib/classes/types";
import { StudentNotesSection } from "@/components/notes/student-notes-section";
import { strings } from "@/lib/strings";

interface PlaceholderSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  emptyText: string;
}

function PlaceholderSection({ id, title, icon, emptyText }: PlaceholderSectionProps) {
  return (
    <section id={id} className="rounded-2xl border border-border-subtle bg-elevated p-6 space-y-3">
      <h3 className="flex items-center gap-3 font-display text-2xl font-medium text-fg">
        <span className="flex size-8 items-center justify-center rounded-full bg-accent-muted text-accent">
          {icon}
        </span>
        {title}
      </h3>
      <div className="rounded-xl border border-dashed border-border-strong p-6 text-center text-sm text-fg-secondary">
        {emptyText}
      </div>
    </section>
  );
}

export function StudentProfileView() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("id");
  const { user } = useAuth();
  const toast = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classmates, setClassmates] = useState<Student[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activePin, setActivePin] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const loading = !studentId || !user ? false : internalLoading;

  useEffect(() => {
    if (!studentId || !user) {
      return;
    }

    let active = true;
    Promise.all([
      getStudent(studentId),
      getTeacherClasses(user.uid),
      getTeacherStudents(user.uid).catch(() => []),
    ])
      .then(([foundStudent, teacherClasses, teacherStudents]) => {
        if (!active) return;
        if (!foundStudent || foundStudent.teacherUid !== user.uid) {
          setError(strings.student.notFound);
        } else {
          setStudent(foundStudent);
          setClasses(teacherClasses);
          setClassmates(teacherStudents);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading student:", err);
        setError(strings.student.notFound);
      })
      .finally(() => {
        if (active) setInternalLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId, user]);

  const handleRegeneratePin = async () => {
    if (!student || !user) return;
    if (!window.confirm(strings.classes.confirmRegeneratePin)) return;

    try {
      setRegenerating(true);
      const newPin = await regenerateStudentPin(user.uid, student.id);
      setActivePin(newPin);
      toast(strings.classes.pinGenerated(newPin));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error generating PIN");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1000px] space-y-6 px-4 py-10">
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="mx-auto w-full max-w-[1000px] space-y-6 px-4 py-12 text-center">
        <div className="rounded-3xl border border-dashed border-border-strong p-12 space-y-4">
          <h2 className="font-display text-3xl font-medium text-fg">{strings.student.notFound}</h2>
          <p className="text-fg-secondary">{strings.student.notFoundDesc}</p>
          <div className="pt-2">
            <Link
              href="/dashboard#classes"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-primary hover:opacity-90"
            >
              <ArrowLeft className="size-4" />
              <span>{strings.student.backToClasses}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const enrolledClasses = classes.filter((c) => student.classIds.includes(c.id));

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-10 px-4 py-10">
      {/* Top back navigation */}
      <div>
        <Link
          href="/dashboard#classes"
          className="inline-flex items-center gap-2 text-sm font-medium text-fg-secondary hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          <span>{strings.student.backToClasses}</span>
        </Link>
      </div>

      {/* Student Profile Header card */}
      <header className="rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-medium text-fg">{student.name}</h1>
            {student.email ? (
              <div className="flex items-center gap-2 text-sm text-fg-secondary">
                <Mail className="size-4 text-muted" />
                <span>{student.email}</span>
              </div>
            ) : null}
          </div>

          {/* Homework PIN widget */}
          <div className="rounded-2xl border border-border-subtle bg-primary p-4 sm:min-w-64 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <KeyRound className="size-3.5 text-accent" />
                {strings.student.homeworkPinHeading}
              </span>
              <Button
                variant="ghost"
                onClick={handleRegeneratePin}
                disabled={regenerating}
                className="h-8 px-2 text-xs"
                title={strings.classes.regeneratePin}
              >
                <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{strings.student.regeneratePinButton}</span>
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tracking-widest text-accent">
                {activePin ?? "••••"}
              </span>
              {activePin && <span className="text-xs text-green-500 font-medium">(New PIN)</span>}
            </div>
            <p className="text-[11px] leading-tight text-muted">
              {strings.student.homeworkPinDesc}
            </p>
          </div>
        </div>

        {/* Classes list */}
        <div className="space-y-2 pt-2 border-t border-border-subtle">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Users className="size-3.5" />
            {strings.student.classesHeading}
          </span>
          <div className="flex flex-wrap gap-2">
            {enrolledClasses.length === 0 ? (
              <span className="text-sm text-fg-secondary">{strings.student.noClasses}</span>
            ) : (
              enrolledClasses.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full border border-border-subtle bg-primary px-3 py-1 text-xs font-medium text-fg"
                >
                  {c.name}
                </span>
              ))
            )}
          </div>
        </div>
      </header>

      {/* Sections for student tracking */}
      <div className="space-y-10">
        {/* Grades, Notes & Errors (spec 02) */}
        <StudentNotesSection
          studentId={student.id}
          studentName={student.name}
          allStudents={classmates.map((c) => ({ id: c.id, name: c.name }))}
        />

        {/* Progress Paths (spec 11) */}
        <PlaceholderSection
          id="progress"
          title={strings.student.progressSectionTitle}
          icon={<Milestone className="size-4" />}
          emptyText={strings.student.progressSectionEmpty}
        />

        {/* Homework (spec 10) */}
        <PlaceholderSection
          id="homework"
          title={strings.student.homeworkSectionTitle}
          icon={<BookOpen className="size-4" />}
          emptyText={strings.student.homeworkSectionEmpty}
        />

        {/* Vocabulary Bank (spec 04) */}
        <PlaceholderSection
          id="vocabulary"
          title={strings.student.vocabularySectionTitle}
          icon={<BookMarked className="size-4" />}
          emptyText={strings.student.vocabularySectionEmpty}
        />
      </div>
    </div>
  );
}
