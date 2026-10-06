"use client";

import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Lock,
  LockOpen,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import {
  deleteHomeworkTask,
  getHomeworkSubmissions,
  getTeacherHomeworkList,
  getTeacherPinLockouts,
  toggleHomeworkOpen,
} from "@/lib/homework/repository";
import type { Homework, HomeworkSubmission, PinLockoutInfo } from "@/lib/homework/types";
import { strings } from "@/lib/strings";
import { SendHomeworkModal } from "@/components/homework/send-homework-modal";

export function HomeworkSection() {
  const { user } = useAuth();
  const toast = useToast();

  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [pinLockouts, setPinLockouts] = useState<PinLockoutInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "overdue">("all");

  // Expanded task details
  const [expandedHwId, setExpandedHwId] = useState<string | null>(null);
  const [submissionsByHw, setSubmissionsByHw] = useState<Record<string, HomeworkSubmission[]>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState<string | null>(null);

  // Re-share modal
  const [shareModalActivity, setShareModalActivity] = useState<{
    id: string;
    title: string;
    slug?: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([getTeacherHomeworkList(user.uid), getTeacherPinLockouts(user.uid)])
      .then(([list, lockouts]) => {
        if (!active) return;
        setHomeworkList(list);
        setPinLockouts(lockouts);
      })
      .catch((err) => {
        console.warn("Could not load homework list:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSubmissions = async (hwId: string) => {
    if (submissionsByHw[hwId]) return;
    try {
      setLoadingSubmissions(hwId);
      const subs = await getHomeworkSubmissions(hwId);
      setSubmissionsByHw((prev) => ({ ...prev, [hwId]: subs }));
    } catch (err) {
      console.warn("Could not load submissions for homework:", err);
    } finally {
      setLoadingSubmissions(null);
    }
  };

  const handleToggleExpand = (hwId: string) => {
    if (expandedHwId === hwId) {
      setExpandedHwId(null);
    } else {
      setExpandedHwId(hwId);
      void loadSubmissions(hwId);
    }
  };

  const handleToggleOpen = async (hw: Homework) => {
    try {
      const nextOpen = !hw.open;
      await toggleHomeworkOpen(hw.id, nextOpen);
      setHomeworkList((prev) =>
        prev.map((item) => (item.id === hw.id ? { ...item, open: nextOpen } : item)),
      );
      toast(nextOpen ? strings.homework.filterOpen : strings.homework.filterClosed);
    } catch {
      toast("Could not update homework status");
    }
  };

  const handleDelete = async (hw: Homework) => {
    if (!window.confirm(strings.homework.confirmDelete)) return;
    try {
      await deleteHomeworkTask(hw.id);
      setHomeworkList((prev) => prev.filter((item) => item.id !== hw.id));
      toast("Homework task deleted");
    } catch {
      toast("Could not delete homework task");
    }
  };

  const now = new Date();

  const getHwStatus = (hw: Homework): "open" | "closed" | "overdue" => {
    if (!hw.open) return "closed";
    if (hw.dueDate && new Date(hw.dueDate) < now) {
      return hw.allowLate ? "overdue" : "closed";
    }
    return "open";
  };

  const filteredList = homeworkList.filter((hw) => {
    const status = getHwStatus(hw);
    if (filter === "all") return true;
    return status === filter;
  });

  return (
    <section id="homework" aria-labelledby="homework-section-title" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="homework-section-title"
          className="flex items-center gap-3 font-display text-3xl font-medium text-fg"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-accent">
            <BookOpen className="size-5" />
          </span>
          {strings.homework.dashboardTitle}
        </h2>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-border-subtle bg-primary p-1 text-xs">
          {(["all", "open", "overdue", "closed"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`rounded-full px-3 py-1 font-medium capitalize transition-colors ${
                filter === mode
                  ? "bg-accent text-primary font-semibold"
                  : "text-fg-secondary hover:text-fg"
              }`}
            >
              {mode === "all" ? strings.homework.filterAll : strings.homework[`filter${(mode.charAt(0).toUpperCase() + mode.slice(1)) as "Open" | "Closed" | "Overdue"}`]}
            </button>
          ))}
        </div>
      </div>

      {/* PIN brute-force Lockout Alert (RNF09, CA13) */}
      {pinLockouts.length > 0 && (
        <div className="space-y-2">
          {pinLockouts.map((lockout) => (
            <div
              key={lockout.studentId}
              className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500"
            >
              <AlertTriangle className="size-5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{strings.homework.pinLockoutAlert(lockout.studentName)}</p>
                <p className="text-xs opacity-90">
                  Locked until {new Date(lockout.lockedUntil).toLocaleTimeString()}. You can generate a
                  new PIN from the student&apos;s profile.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border-strong p-8">
          <p className="text-fg-secondary">{strings.homework.emptyDashboard}</p>
          <ButtonLink href="/activities" variant="secondary">
            {strings.homework.browseActivities}
          </ButtonLink>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((hw) => {
            const status = getHwStatus(hw);
            const isExpanded = expandedHwId === hw.id;
            const subs = submissionsByHw[hw.id] || [];
            const isTargetClass = hw.targetType === "class" || hw.targetType === "students";
            const totalAssigned = hw.classRoster?.length || hw.studentIds?.length || 0;

            // Unique students who completed
            const completedStudentIds = new Set(
              subs.map((s) => s.studentId).filter(Boolean) as string[],
            );
            const doneCount = completedStudentIds.size;

            // Pending students list (CA05)
            const pendingStudents = (hw.classRoster || []).filter(
              (r) => !completedStudentIds.has(r.studentId),
            );

            return (
              <div
                key={hw.id}
                className="overflow-hidden rounded-3xl border border-border-subtle bg-elevated transition-colors"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl font-medium text-fg">
                        {hw.activityTitle}
                      </h3>
                      {status === "open" ? (
                        <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                          {strings.homework.filterOpen}
                        </span>
                      ) : status === "overdue" ? (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                          {strings.homework.filterOverdue}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted/20 px-2.5 py-0.5 text-xs font-semibold text-muted">
                          {strings.homework.filterClosed}
                        </span>
                      )}
                      {hw.className && (
                        <span className="rounded-full border border-border-subtle bg-primary px-2.5 py-0.5 text-xs text-fg-secondary">
                          {hw.className}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                      {hw.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          <span>Due {new Date(hw.dueDate).toLocaleDateString()}</span>
                        </span>
                      )}
                      {isTargetClass && totalAssigned > 0 && (
                        <span className="font-medium text-fg">
                          {strings.homework.doneRatio(doneCount, totalAssigned)}
                        </span>
                      )}
                      {!isTargetClass && (
                        <span>{subs.length} submissions</span>
                      )}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setShareModalActivity({
                          id: hw.activityId,
                          title: hw.activityTitle,
                          slug: hw.activitySlug,
                        })
                      }
                      className="h-9 px-2 text-xs"
                      title={strings.catalog.share}
                    >
                      <Share2 className="size-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleToggleOpen(hw)}
                      className="h-9 px-2 text-xs"
                      title={hw.open ? strings.homework.closeTask : strings.homework.reopenTask}
                    >
                      {hw.open ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(hw)}
                      className="h-9 px-2 text-xs text-destructive hover:bg-destructive/10"
                      title={strings.homework.deleteTask}
                    >
                      <Trash2 className="size-4" />
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => handleToggleExpand(hw.id)}
                      className="h-9 px-3 text-xs"
                    >
                      {isExpanded ? "Hide Details" : "View Details"}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details: Submissions Table & Pending Roster (RF06, CA05, RF08) */}
                {isExpanded && (
                  <div className="border-t border-border-subtle bg-primary/40 p-5 sm:p-6 space-y-6">
                    {/* Teacher note if present */}
                    {hw.instruction && (
                      <div className="rounded-xl border border-border-subtle bg-primary p-3 text-xs text-fg-secondary">
                        <span className="font-semibold text-muted">Instruction: </span>
                        <span>{hw.instruction}</span>
                      </div>
                    )}

                    {/* Submissions Table */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-fg">
                        {strings.homework.submissionsHeading} ({subs.length})
                      </h4>

                      {loadingSubmissions === hw.id ? (
                        <div className="p-4 text-center text-xs text-muted">Loading submissions…</div>
                      ) : subs.length === 0 ? (
                        <p className="text-xs text-muted">{strings.homework.noSubmissions}</p>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-primary">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-border-subtle bg-secondary/50 text-muted">
                              <tr>
                                <th className="p-3 font-medium">{strings.homework.studentColumn}</th>
                                <th className="p-3 font-medium">{strings.homework.scoreColumn}</th>
                                <th className="p-3 font-medium">{strings.homework.timeColumn}</th>
                                <th className="p-3 font-medium">{strings.homework.viaColumn}</th>
                                <th className="p-3 font-medium">{strings.homework.dateColumn}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                              {subs.map((s) => (
                                <tr key={s.id} className="hover:bg-elevated/40">
                                  <td className="p-3 font-medium text-fg">
                                    <div className="flex items-center gap-1.5">
                                      <span>{s.studentName}</span>
                                      {s.late && (
                                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                                          {strings.homework.lateBadge}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    {hw.activityType === "flashcards" || hw.activityType === "prompt-cards" ? (
                                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                                        {strings.homework.completedBadge}
                                      </span>
                                    ) : (
                                      <span className="font-mono font-medium text-fg">
                                        {s.correct}/{s.total}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-muted">
                                    {strings.homework.timeSpent(s.seconds)}
                                  </td>
                                  <td className="p-3">
                                    <span className="capitalize text-muted">{s.via}</span>
                                  </td>
                                  <td className="p-3 text-muted">
                                    {new Date(s.completedAt).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Pending Students (CA05) */}
                    {isTargetClass && pendingStudents.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border-subtle">
                        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                          {strings.homework.pendingHeading} ({pendingStudents.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {pendingStudents.map((r) => (
                            <span
                              key={r.studentId}
                              className="rounded-full border border-border-subtle bg-primary px-3 py-1 text-xs text-fg-secondary"
                            >
                              {r.firstName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Share / Re-share Modal */}
      {shareModalActivity && (
        <SendHomeworkModal
          activity={shareModalActivity}
          open={Boolean(shareModalActivity)}
          onClose={() => setShareModalActivity(null)}
        />
      )}
    </section>
  );
}

function ButtonLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "primary" | "secondary";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors ${
        variant === "secondary"
          ? "border border-border-subtle bg-secondary text-fg hover:border-accent hover:text-accent"
          : "bg-accent text-primary hover:opacity-90"
      }`}
    >
      {children}
    </Link>
  );
}
