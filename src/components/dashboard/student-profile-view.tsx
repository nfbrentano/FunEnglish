"use client";

import {
  ArrowLeft,
  FileText,
  KeyRound,
  Mail,
  Users,
  Play,
  Video,
  MessageCircle,
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
  getStudentPrivateProfile,
  updateStudentPrivateProfile,
} from "@/lib/classes/repository";
import { getBillingPlan } from "@/lib/billing/repository";
import type { Student, TeacherClass, StudentPrivateProfile, SessionMode } from "@/lib/classes/types";
import { StudentNotesSection } from "@/components/notes/student-notes-section";
import { StudentInviteCard } from "@/components/portal/student-invite-card";
import { StudentSuggestedActivities } from "./student-suggested-activities";
import { StudentVocabularySection } from "@/components/vocabulary/student-vocabulary-section";
import { StudentHomeworkSection } from "@/components/dashboard/student-homework-section";
import { StudentTracksSection } from "@/components/dashboard/student-tracks-section";
import { StudentBillingSection } from "@/components/dashboard/student-billing-section";
import { UpcomingPlansSection } from "@/components/plans/upcoming-plans-section";
import { ProgressReportModal } from "@/components/reports/progress-report-modal";
import { useSessionContext } from "@/lib/session/session-context";
import { getPastSessions } from "@/lib/session/repository";
import type { ClassroomSession } from "@/lib/session/types";
import { strings } from "@/lib/strings";
import { getStudentVocabulary } from "@/lib/vocabulary/repository";

type TabId = "overview" | "lessons" | "notes" | "vocabulary" | "homework" | "tracks" | "billing";


export function StudentProfileView() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("id");
  const { user } = useAuth();
  const session = useSessionContext();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classmates, setClassmates] = useState<Student[]>([]);
  const [privateProfile, setPrivateProfile] = useState<StudentPrivateProfile | null>(null);
  const [editingPrivate, setEditingPrivate] = useState<StudentPrivateProfile>({});
  const [isSavingPrivate, setIsSavingPrivate] = useState(false);
  const [pastSessions, setPastSessions] = useState<ClassroomSession[]>([]);
  const [unlearnedWords, setUnlearnedWords] = useState<string[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activePin, setActivePin] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

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
      getStudentPrivateProfile(studentId).catch(() => null),
      getPastSessions(user.uid, undefined, studentId).catch(() => []),
    ])
      .then(async ([foundStudent, teacherClasses, teacherStudents, profile, sessions]) => {
        if (!active) return;
        if (!foundStudent || foundStudent.teacherUid !== user.uid) {
          setError(strings.student.notFound);
        } else {
          setStudent(foundStudent);
          setClasses(teacherClasses);
          setClassmates(teacherStudents);
          setPrivateProfile(profile);
          setEditingPrivate(profile || {});
          setPastSessions(sessions);
          try {
            const vocab = await getStudentVocabulary(studentId);
            if (active) {
              setUnlearnedWords(vocab.filter((w) => !w.learned).map((w) => w.term));
            }
          } catch {
            // Ignore vocabulary fetch error if offline or permissions
          }
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

  const handleSavePrivateProfile = async () => {
    if (!student) return;
    try {
      setIsSavingPrivate(true);
      await updateStudentPrivateProfile(student.id, editingPrivate);
      setPrivateProfile(editingPrivate);
      toast("Private profile updated successfully.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error saving private profile");
    } finally {
      setIsSavingPrivate(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-250 space-y-6 px-4 py-10">
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="mx-auto w-full max-w-250 space-y-6 px-4 py-12 text-center">
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
    <div className="mx-auto w-full max-w-250 space-y-10 px-4 py-10">
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
          <div className="space-y-3">
            <div>
              <h1 className="font-display text-4xl font-medium text-fg flex items-center gap-3">
                {student.name}
                {student.status && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${student.status === "Active" ? "bg-green-500/20 text-green-500" : "bg-border-strong text-muted"}`}>
                    {student.status}
                  </span>
                )}
              </h1>
              {student.email ? (
                <div className="flex items-center gap-2 mt-1 text-sm text-fg-secondary">
                  <Mail className="size-4 text-muted" />
                  <span>{student.email}</span>
                </div>
              ) : null}
            </div>

            {/* Profile fields */}
            <div className="flex flex-wrap gap-2 text-sm">
              {student.level && (
                <span className="bg-accent-muted/40 text-accent px-2 py-1 rounded-md font-semibold">
                  {student.level}
                </span>
              )}
              {student.goal && (
                <span className="border border-border-strong px-2 py-1 rounded-md text-fg-secondary">
                  Goal: {student.goal}
                </span>
              )}
              {student.defaultMode && (
                <span className="border border-border-strong px-2 py-1 rounded-md text-fg-secondary">
                  Mode: {student.defaultMode}
                </span>
              )}
              {student.interests && student.interests.length > 0 && (
                <span className="border border-border-strong px-2 py-1 rounded-md text-fg-secondary">
                  Interests: {student.interests.join(", ")}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-50">
            <Button
              className="bg-accent text-primary hover:bg-accent/90 w-full"
              onClick={async () => {
                try {
                  const plan = await getBillingPlan(student.id);
                  if (plan && plan.type === "package" && plan.creditsBalance <= 0) {
                    if (!window.confirm(`${student.name} has no lessons left. Start anyway?`)) {
                      return;
                    }
                  }

                  if (session?.startOneToOne) {
                    await session.startOneToOne(student.id, student.name, student.defaultMode as SessionMode);
                  }
                } catch (err) {
                  toast(err instanceof Error ? err.message : "Error starting session");
                }
              }}
            >
              <Play className="size-4 mr-2 fill-current" /> Start Lesson
            </Button>
            {student.defaultMode !== "in-person" && (
              <Button 
                variant="secondary" 
                className="w-full"
                disabled={!privateProfile?.meetingUrl}
                onClick={() => privateProfile?.meetingUrl && window.open(privateProfile.meetingUrl, "_blank", "noopener,noreferrer")}
              >
                <Video className="size-4 mr-2" /> Open Meeting
              </Button>
            )}
            <Button 
              variant="secondary" 
              className="w-full"
              disabled={!privateProfile?.phone}
              onClick={() => {
                if (privateProfile?.phone) {
                  const cleaned = privateProfile.phone.replace(/\\D/g, "");
                  window.open(`https://wa.me/${cleaned}`, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <MessageCircle className="size-4 mr-2" /> WhatsApp
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setReportModalOpen(true)}
            >
              <FileText className="size-4 mr-2" /> Progress Report
            </Button>
          </div>
        </div>

        {/* Classes list */}
        {enrolledClasses.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border-subtle">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Users className="size-3.5" />
              {strings.student.classesHeading}
            </span>
            <div className="flex flex-wrap gap-2">
              {enrolledClasses.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full border border-border-subtle bg-primary px-3 py-1 text-xs font-medium text-fg"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Tabs navigation */}
      <div className="border-b border-border-subtle">
        <nav className="flex gap-4 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Overview" },
            { id: "lessons", label: "Lessons" },
            { id: "notes", label: "Notes" },
            { id: "vocabulary", label: "Vocabulary" },
            { id: "homework", label: "Homework" },
            { id: "tracks", label: "Tracks" },
            { id: "billing", label: "Billing" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-accent text-primary"
                  : "text-fg-secondary hover:text-fg hover:bg-elevated"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Sections for student tracking */}
      <div className="space-y-10">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h3 className="font-display text-2xl font-medium">Overview</h3>

            {/* Upcoming Lesson Plans (RF08, CA07, CA09, CA10) */}
            <UpcomingPlansSection
              targetType="student"
              targetId={student.id}
              targetName={student.name}
              initialGoal={pastSessions[0]?.nextFocus}
              suggestedWords={unlearnedWords}
            />

            <StudentSuggestedActivities 
              level={student.level} 
              interests={student.interests} 
            />
            
            <div className="rounded-2xl border border-border-subtle bg-elevated p-6 space-y-4">
              <h4 className="font-display text-lg font-medium text-fg flex items-center gap-2">
                <KeyRound className="size-4 text-accent" />
                Private Profile (Teacher Only)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-fg">WhatsApp / Phone</label>
                  <input
                    type="text"
                    value={editingPrivate.phone || ""}
                    onChange={(e) => setEditingPrivate(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 234 567 8900"
                    className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-fg">Meeting URL</label>
                  <input
                    type="url"
                    value={editingPrivate.meetingUrl || ""}
                    onChange={(e) => setEditingPrivate(p => ({ ...p, meetingUrl: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-fg">Address / Location</label>
                  <input
                    type="text"
                    value={editingPrivate.address || ""}
                    onChange={(e) => setEditingPrivate(p => ({ ...p, address: e.target.value }))}
                    placeholder="Student's address or coffee shop..."
                    className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-fg">Private Notes</label>
                  <textarea
                    value={editingPrivate.privateNotes || ""}
                    onChange={(e) => setEditingPrivate(p => ({ ...p, privateNotes: e.target.value }))}
                    placeholder="Logistics, billing info, or personal notes (not visible to student)..."
                    maxLength={1000}
                    className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg min-h-24"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-border-subtle mt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h5 className="text-sm font-semibold text-fg">Homework PIN</h5>
                    <p className="text-xs text-muted mt-0.5">
                      {activePin || student.homeworkPin ? "Active PIN: " : "No PIN generated."}
                      {(activePin || student.homeworkPin) && (
                        <span className="font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded ml-1 font-bold">
                          {activePin || student.homeworkPin}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRegeneratePin}
                    disabled={regenerating}
                  >
                    {regenerating ? "Generating..." : "Generate new PIN"}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSavePrivateProfile} 
                  disabled={isSavingPrivate}
                  className="bg-accent text-primary hover:bg-accent/90"
                >
                  {isSavingPrivate ? "Saving..." : "Save Private Profile"}
                </Button>
              </div>
            </div>

            {/* Student Portal Invite Widget */}
            <StudentInviteCard
              student={student}
              onStudentUpdated={(updated) => setStudent(updated)}
            />
          </div>
        )}

        {activeTab === "lessons" && (
          <div className="space-y-6">
            <h3 className="font-display text-2xl font-medium">Lesson History</h3>
            {pastSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-fg-secondary text-sm">
                No past lessons found for this student.
              </div>
            ) : (
              <div className="space-y-4">
                {pastSessions.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-border-subtle bg-elevated p-5 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-fg">
                        {s.startedAt.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="text-sm text-fg-secondary">
                        {s.durationMinutes || 0} min · {s.mode === "in-person" ? "In Person" : "Online"}
                      </div>
                    </div>
                    {s.summary && (
                      <p className="text-sm text-fg-secondary bg-primary/30 p-3 rounded-xl mt-2">{s.summary}</p>
                    )}
                    <div className="text-xs text-muted flex gap-4 mt-2">
                      <span>{s.activitiesPlayed?.length || 0} activities</span>
                      <span>{s.newWords?.length || 0} new words</span>
                      <span>{s.notes?.length || 0} notes</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <StudentNotesSection
            studentId={student.id}
            studentName={student.name}
            allStudents={classmates.map((c) => ({ id: c.id, name: c.name }))}
          />
        )}

        {activeTab === "vocabulary" && (
          <StudentVocabularySection
            studentId={student.id}
            studentName={student.name}
          />
        )}

        {activeTab === "homework" && (
          <StudentHomeworkSection studentId={student.id} />
        )}

        {activeTab === "tracks" && (
          <StudentTracksSection
            studentId={student.id}
            studentName={student.name}
          />
        )}

        {activeTab === "billing" && (
          <StudentBillingSection
            studentId={student.id}
            studentName={student.name}
            phone={privateProfile?.phone}
          />
        )}
      </div>

      <ProgressReportModal
        open={reportModalOpen}
        student={student}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}
