"use client";

import {
  Archive,
  ArchiveRestore,
  Copy,
  MoveRight,
  Pencil,
  Play,
  Plus,
  Printer,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import {
  MAX_CLASS_NAME_LENGTH,
  type CreatedStudentResult,
  type Student,
  type TeacherClass,
} from "@/lib/classes/types";
import { useClasses } from "@/lib/classes/use-classes";
import { getPastSessions } from "@/lib/session/repository";
import { useSessionContext } from "@/lib/session/session-context";
import type { ClassroomSession } from "@/lib/session/types";
import { strings } from "@/lib/strings";

interface ClassesSectionProps {
  classesHook?: ReturnType<typeof useClasses>;
}

export function ClassesSection({ classesHook }: ClassesSectionProps) {
  const defaultHook = useClasses();
  const {
    classes,
    students,
    loading,
    addClass,
    editClassName,
    toggleArchiveClass,
    removeClass,
    addStudent,
    addStudentsBatch,
    copyStudent,
    moveStudent,
    removeFromClass,
    deleteStudent,
  } = classesHook ?? defaultHook;

  const { user } = useAuth();
  const session = useSessionContext();
  const [classSubTab, setClassSubTab] = useState<Record<string, "students" | "past">>({});
  const [pastSessionsMap, setPastSessionsMap] = useState<Record<string, ClassroomSession[]>>({});
  const [loadingPastSessions, setLoadingPastSessions] = useState<Record<string, boolean>>({});

  const handleLoadPastSessions = async (classId: string) => {
    if (!user) return;
    try {
      setLoadingPastSessions((prev) => ({ ...prev, [classId]: true }));
      const past = await getPastSessions(user.uid, classId);
      setPastSessionsMap((prev) => ({ ...prev, [classId]: past }));
    } catch (err) {
      console.warn("Error loading past sessions:", err);
    } finally {
      setLoadingPastSessions((prev) => ({ ...prev, [classId]: false }));
    }
  };

  const toast = useToast();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [newClassName, setNewClassName] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  // Modals & form state
  const [batchModalClassId, setBatchModalClassId] = useState<string | null>(null);
  const [batchText, setBatchText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchCreatedPins, setBatchCreatedPins] = useState<CreatedStudentResult[] | null>(null);

  const [singleModalClassId, setSingleModalClassId] = useState<string | null>(null);
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);

  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassNameVal, setEditingClassNameVal] = useState("");

  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const [studentToCopy, setStudentToCopy] = useState<Student | null>(null);
  const [studentToMove, setStudentToMove] = useState<{ student: Student; fromClassId: string } | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [printPinsClass, setPrintPinsClass] = useState<TeacherClass | null>(null);

  const toggleExpand = (classId: string) => {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    try {
      setCreatingClass(true);
      await addClass(name);
      setNewClassName("");
      toast(`Class "${name}" created!`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error creating class");
    } finally {
      setCreatingClass(false);
    }
  };

  const handleSaveRename = async (classId: string) => {
    const trimmed = editingClassNameVal.trim();
    if (!trimmed) return;
    try {
      await editClassName(classId, trimmed);
      setEditingClassId(null);
      toast("Class renamed");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error renaming class");
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchModalClassId || !batchText.trim()) return;
    try {
      setBatchLoading(true);
      const res = await addStudentsBatch(batchModalClassId, batchText);
      if (res.error) {
        toast(res.error);
      } else {
        setBatchCreatedPins(res.created);
        toast(`Added ${res.created.length} students successfully!`);
        setBatchText("");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error adding students");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleModalClassId || !singleName.trim()) return;
    try {
      setSingleLoading(true);
      const res = await addStudent(singleModalClassId, singleName, singleEmail || undefined);
      toast(`Added ${res.student.name}! Homework PIN: ${res.rawPin}`);
      setSingleModalClassId(null);
      setSingleName("");
      setSingleEmail("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error adding student");
    } finally {
      setSingleLoading(false);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setDeletingStudent(true);
      await deleteStudent(studentToDelete.id);
      toast(`Student "${studentToDelete.name}" deleted.`);
      setStudentToDelete(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error deleting student");
    } finally {
      setDeletingStudent(false);
    }
  };

  const handleConfirmCopyStudent = async () => {
    if (!studentToCopy || !targetClassId) return;
    try {
      await copyStudent(studentToCopy.id, targetClassId);
      toast(`Copied "${studentToCopy.name}" to class.`);
      setStudentToCopy(null);
      setTargetClassId("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error copying student");
    }
  };

  const handleConfirmMoveStudent = async () => {
    if (!studentToMove || !targetClassId) return;
    try {
      await moveStudent(studentToMove.student.id, studentToMove.fromClassId, targetClassId);
      toast(`Moved "${studentToMove.student.name}" to new class.`);
      setStudentToMove(null);
      setTargetClassId("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error moving student");
    }
  };

  const activeClasses = classes.filter((c) => !c.archived);
  const archivedClasses = classes.filter((c) => c.archived);
  const displayedClasses = tab === "active" ? activeClasses : archivedClasses;

  return (
    <section id="classes" aria-labelledby="classes-title" className="scroll-mt-24 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="classes-title" className="flex items-center gap-3 font-display text-3xl font-medium">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-accent">
            <Users aria-hidden="true" className="size-5" />
          </span>
          {strings.classes.title}
        </h2>
        {classes.length > 0 && (
          <span className="text-sm text-muted">
            {strings.classes.classesCount(classes.length)}
          </span>
        )}
      </div>

      {/* Tabs and New Class Form */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "active"
                ? "bg-accent text-primary"
                : "border border-border-subtle bg-elevated text-fg-secondary hover:border-accent"
            }`}
          >
            {strings.classes.activeTab} ({activeClasses.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("archived")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "archived"
                ? "bg-accent text-primary"
                : "border border-border-subtle bg-elevated text-fg-secondary hover:border-accent"
            }`}
          >
            {strings.classes.archivedTab} ({archivedClasses.length})
          </button>
        </div>

        {tab === "active" && (
          <form onSubmit={handleCreateClass} className="flex flex-1 max-w-md gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder={strings.classes.classNamePlaceholder}
              maxLength={MAX_CLASS_NAME_LENGTH}
              className="min-h-11 flex-1 rounded-full border border-border-strong bg-primary px-4 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <Button type="submit" disabled={creatingClass || !newClassName.trim()}>
              <Plus className="size-4" />
              <span>{strings.classes.createClass}</span>
            </Button>
          </form>
        )}
      </div>

      {/* Classes list */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : displayedClasses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-fg-secondary">
          {tab === "active" ? strings.classes.emptyActive : strings.classes.emptyArchived}
        </div>
      ) : (
        <ul className="space-y-4">
          {displayedClasses.map((item) => {
            const classStudents = students.filter((s) => s.classIds.includes(item.id));
            const isExpanded = expandedClasses[item.id] ?? false;

            return (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border-subtle bg-elevated transition-shadow"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                  {editingClassId === item.id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <input
                        value={editingClassNameVal}
                        onChange={(e) => setEditingClassNameVal(e.target.value)}
                        maxLength={MAX_CLASS_NAME_LENGTH}
                        className="min-h-10 flex-1 rounded-full border border-border-strong bg-primary px-4 text-fg focus:border-accent focus:outline-none"
                        autoFocus
                      />
                      <Button onClick={() => handleSaveRename(item.id)}>
                        {strings.classes.saveStudent}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingClassId(null)}>
                        {strings.classes.cancel}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-baseline gap-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="text-left font-display text-2xl font-medium text-fg hover:text-accent"
                      >
                        {item.name}
                      </button>
                      <span className="rounded-full bg-accent-muted/40 px-2.5 py-0.5 text-xs font-semibold text-accent">
                        {strings.classes.studentCount(classStudents.length)}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tab === "active" && (
                      <>
                        <Button
                          onClick={async () => {
                            try {
                              await session?.startClass(
                                item.id,
                                item.name,
                                classStudents.map((s) => s.id),
                              );
                            } catch (err) {
                              toast(err instanceof Error ? err.message : "Error starting class");
                            }
                          }}
                          className="min-h-9 px-3.5 py-1 text-xs bg-accent text-primary hover:bg-accent/90"
                          title={strings.session.startClass}
                        >
                          <Play className="size-3.5 fill-current" />
                          <span className="font-semibold">{strings.session.startClass}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setBatchModalClassId(item.id);
                            setBatchCreatedPins(null);
                          }}
                          title={strings.classes.batchAddButton}
                        >
                          <Users className="size-4" />
                          <span className="hidden sm:inline">{strings.classes.batchAddButton}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setSingleModalClassId(item.id)}
                          title={strings.classes.singleAddButton}
                        >
                          <Plus className="size-4" />
                          <span className="hidden sm:inline">{strings.classes.singleAddButton}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setPrintPinsClass(item)}
                          title={strings.classes.printPins}
                        >
                          <Printer className="size-4" />
                          <span className="hidden sm:inline">{strings.classes.printPins}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingClassId(item.id);
                            setEditingClassNameVal(item.name);
                          }}
                          title={strings.dashboard.rename}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </>
                    )}

                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const confirmMsg = item.archived
                          ? `Restore class "${item.name}"?`
                          : strings.classes.confirmArchive(item.name);
                        if (window.confirm(confirmMsg)) {
                          await toggleArchiveClass(item.id, !item.archived);
                          toast(
                            item.archived ? "Class restored" : "Class archived",
                          );
                        }
                      }}
                      title={item.archived ? strings.classes.restore : strings.classes.archive}
                    >
                      {item.archived ? (
                        <ArchiveRestore className="size-4" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={async () => {
                        if (window.confirm(strings.classes.confirmDeleteClass(item.name))) {
                          await removeClass(item.id);
                          toast("Class deleted");
                        }
                      }}
                      title={strings.dashboard.delete}
                    >
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border-subtle bg-primary/40 p-4 sm:p-5">
                    {/* Sub-tabs: Students / Past classes (RF08, CA06) */}
                    <div className="flex items-center gap-2 mb-4 border-b border-border-subtle pb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setClassSubTab((prev) => ({ ...prev, [item.id]: "students" }))
                        }
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          (classSubTab[item.id] ?? "students") === "students"
                            ? "bg-accent text-primary"
                            : "text-fg-secondary hover:text-fg"
                        }`}
                      >
                        {strings.classes.studentCount(classStudents.length)}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClassSubTab((prev) => ({ ...prev, [item.id]: "past" }));
                          if (!pastSessionsMap[item.id]) {
                            void handleLoadPastSessions(item.id);
                          }
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          classSubTab[item.id] === "past"
                            ? "bg-accent text-primary"
                            : "text-fg-secondary hover:text-fg"
                        }`}
                      >
                        {strings.session.pastClasses}
                      </button>
                    </div>

                    {classSubTab[item.id] === "past" ? (
                      <div>
                        {loadingPastSessions[item.id] ? (
                          <Skeleton className="h-24 w-full rounded-2xl" />
                        ) : !pastSessionsMap[item.id] || pastSessionsMap[item.id].length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted">
                            {strings.session.pastClassesEmpty}
                          </div>
                        ) : (
                          <ul className="space-y-3">
                            {pastSessionsMap[item.id].map((past) => (
                              <li
                                key={past.id}
                                className="rounded-2xl border border-border-subtle bg-primary/20 p-4 space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-fg text-sm">
                                    {past.startedAt.toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <div className="flex items-center gap-2 text-muted">
                                    {past.durationMinutes && (
                                      <span>
                                        {strings.session.review.durationMinutes(past.durationMinutes)}
                                      </span>
                                    )}
                                    <span>·</span>
                                    <span>
                                      {Object.values(past.attendance || {}).filter(Boolean).length} present
                                    </span>
                                  </div>
                                </div>

                                {past.activitiesPlayed.length > 0 && (
                                  <p className="text-fg-secondary">
                                    <strong className="text-fg">Activities:</strong>{" "}
                                    {past.activitiesPlayed.map((a) => a.title).join(", ")}
                                  </p>
                                )}

                                {past.newWords.length > 0 && (
                                  <p className="text-fg-secondary">
                                    <strong className="text-fg">Vocabulary:</strong>{" "}
                                    {past.newWords.map((w) => w.term).join(", ")}
                                  </p>
                                )}

                                {past.boardText && (
                                  <p className="text-fg-secondary italic">
                                    &quot;{past.boardText}&quot;
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : classStudents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                        <p className="text-sm text-fg-secondary">{strings.classes.noStudents}</p>
                        {tab === "active" && (
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setBatchModalClassId(item.id);
                                setBatchCreatedPins(null);
                              }}
                            >
                              {strings.classes.batchAddButton}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setSingleModalClassId(item.id)}
                            >
                              {strings.classes.singleAddButton}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <ul className="divide-y divide-border-subtle">
                        {classStudents.map((student) => (
                          <li
                            key={student.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex flex-col">
                              <Link
                                href={`/dashboard/student?id=${student.id}`}
                                className="font-medium text-fg hover:text-accent hover:underline"
                              >
                                {student.name}
                              </Link>
                              {student.email && (
                                <span className="text-xs text-muted">{student.email}</span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                              {/* Copy to another class */}
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setStudentToCopy(student);
                                  setTargetClassId("");
                                }}
                                title={strings.classes.copyToClass}
                              >
                                <Copy className="size-4" />
                              </Button>

                              {/* Move to another class */}
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setStudentToMove({ student, fromClassId: item.id });
                                  setTargetClassId("");
                                }}
                                title={strings.classes.moveToClass}
                              >
                                <MoveRight className="size-4" />
                              </Button>

                              {/* Remove from this class */}
                              <Button
                                variant="ghost"
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      `Remove ${student.name} from "${item.name}"? The student will remain registered.`,
                                    )
                                  ) {
                                    await removeFromClass(student.id, item.id);
                                    toast(`Removed from class`);
                                  }
                                }}
                                title={strings.classes.removeFromClass}
                              >
                                <UserMinus className="size-4" />
                              </Button>

                              {/* Delete student permanently */}
                              <Button
                                variant="ghost"
                                onClick={() => setStudentToDelete(student)}
                                title={strings.classes.deleteStudent}
                              >
                                <Trash2 className="size-4 text-red-500" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Batch Add Modal */}
      {batchModalClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-border-subtle bg-elevated p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-medium text-fg">
              {strings.classes.batchAddButton}
            </h3>
            {batchCreatedPins ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-fg-secondary">
                  The following students were added. Keep note of their homework PINs:
                </p>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-border-subtle bg-primary p-3">
                  <ul className="divide-y divide-border-subtle text-sm">
                    {batchCreatedPins.map((item) => (
                      <li key={item.student.id} className="flex justify-between py-2">
                        <span className="font-medium text-fg">{item.student.name}</span>
                        <span className="font-mono text-accent">PIN: {item.rawPin}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setBatchModalClassId(null);
                      setBatchCreatedPins(null);
                    }}
                  >
                    {strings.classes.closeModal}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBatchSubmit} className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-fg-secondary">
                  {strings.classes.batchAddPrompt}
                </label>
                <textarea
                  rows={8}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={strings.classes.batchAddPlaceholder}
                  className="w-full rounded-2xl border border-border-strong bg-primary p-4 font-mono text-sm text-fg focus:border-accent focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setBatchModalClassId(null);
                      setBatchText("");
                    }}
                  >
                    {strings.classes.cancel}
                  </Button>
                  <Button type="submit" disabled={batchLoading || !batchText.trim()}>
                    {batchLoading ? "Adding..." : strings.classes.batchAddConfirm}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Single Add Modal */}
      {singleModalClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-elevated p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-medium text-fg">
              {strings.classes.singleAddButton}
            </h3>
            <form onSubmit={handleSingleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted">
                  Name (required)
                </label>
                <input
                  type="text"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder={strings.classes.studentNamePlaceholder}
                  maxLength={100}
                  required
                  className="mt-1 min-h-11 w-full rounded-full border border-border-strong bg-primary px-4 text-sm text-fg focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder={strings.classes.studentEmailPlaceholder}
                  maxLength={254}
                  className="mt-1 min-h-11 w-full rounded-full border border-border-strong bg-primary px-4 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSingleModalClassId(null);
                    setSingleName("");
                    setSingleEmail("");
                  }}
                >
                  {strings.classes.cancel}
                </Button>
                <Button type="submit" disabled={singleLoading || !singleName.trim()}>
                  {singleLoading ? "Saving..." : strings.classes.saveStudent}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Warning Modal (CA06) */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-elevated p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-medium text-red-500">
              {strings.classes.deleteStudent}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
              {strings.classes.deleteStudentWarning(studentToDelete.name)}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setStudentToDelete(null)}
                disabled={deletingStudent}
              >
                {strings.classes.cancel}
              </Button>
              <Button
                onClick={handleConfirmDeleteStudent}
                disabled={deletingStudent}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deletingStudent ? "Deleting..." : strings.classes.deleteStudent}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Student Modal */}
      {studentToCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-elevated p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-medium text-fg">
              {strings.classes.copyToClass}
            </h3>
            <p className="mt-2 text-sm text-fg-secondary">
              Copy <strong className="text-fg">{studentToCopy.name}</strong> to:
            </p>
            <div className="mt-4">
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="min-h-11 w-full rounded-full border border-border-strong bg-primary px-4 text-sm text-fg focus:border-accent focus:outline-none"
              >
                <option value="">{strings.classes.selectTargetClass}</option>
                {activeClasses.map((c) => (
                  <option key={c.id} value={c.id} disabled={studentToCopy.classIds.includes(c.id)}>
                    {c.name} {studentToCopy.classIds.includes(c.id) ? "(already enrolled)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStudentToCopy(null)}>
                {strings.classes.cancel}
              </Button>
              <Button onClick={handleConfirmCopyStudent} disabled={!targetClassId}>
                <Copy className="size-4" />
                <span>{strings.classes.copyToClass}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move Student Modal */}
      {studentToMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-elevated p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-medium text-fg">
              {strings.classes.moveToClass}
            </h3>
            <p className="mt-2 text-sm text-fg-secondary">
              Move <strong className="text-fg">{studentToMove.student.name}</strong> to:
            </p>
            <div className="mt-4">
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="min-h-11 w-full rounded-full border border-border-strong bg-primary px-4 text-sm text-fg focus:border-accent focus:outline-none"
              >
                <option value="">{strings.classes.selectTargetClass}</option>
                {activeClasses
                  .filter((c) => c.id !== studentToMove.fromClassId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStudentToMove(null)}>
                {strings.classes.cancel}
              </Button>
              <Button onClick={handleConfirmMoveStudent} disabled={!targetClassId}>
                <MoveRight className="size-4" />
                <span>{strings.classes.moveToClass}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print PINs Modal (RF11) */}
      {printPinsClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-border-subtle bg-elevated shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border-subtle p-5">
              <div>
                <h3 className="font-display text-2xl font-medium text-fg">
                  {strings.classes.printPinsTitle} – {printPinsClass.name}
                </h3>
                <p className="text-xs text-muted mt-1">{strings.classes.printPinsDesc}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setPrintPinsClass(null)}
                className="size-8 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {students.filter((s) => s.classIds.includes(printPinsClass.id)).length === 0 ? (
                <p className="text-sm text-fg-secondary">{strings.classes.noStudents}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {students
                    .filter((s) => s.classIds.includes(printPinsClass.id))
                    .map((s) => (
                      <div
                        key={s.id}
                        className="rounded-2xl border border-border-subtle bg-primary p-4 space-y-2"
                      >
                        <div className="flex justify-between items-baseline">
                          <span className="font-display text-base font-medium text-fg">{s.name}</span>
                          <span className="text-[10px] text-muted">{printPinsClass.name}</span>
                        </div>
                        <div className="rounded-xl border border-border-subtle bg-elevated p-2 text-center">
                          <span className="text-[10px] uppercase tracking-wider text-muted block">
                            Homework PIN
                          </span>
                          <span className="font-mono text-xl font-bold tracking-widest text-accent">
                            ••••
                          </span>
                        </div>
                        <p className="text-[10px] text-muted text-center leading-tight">
                          Enter this PIN when accessing class homework links.
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border-subtle p-4">
              <Button variant="secondary" onClick={() => setPrintPinsClass(null)}>
                {strings.classes.closeModal}
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="size-4" />
                <span>{strings.classes.printButton}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
