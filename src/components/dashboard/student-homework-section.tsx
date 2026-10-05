"use client";

import { BookOpen, Calendar, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentHomeworkSubmissions } from "@/lib/homework/repository";
import type { StudentHomeworkRecord } from "@/lib/homework/types";
import { strings } from "@/lib/strings";

interface StudentHomeworkSectionProps {
  studentId: string;
}

export function StudentHomeworkSection({ studentId }: StudentHomeworkSectionProps) {
  const [records, setRecords] = useState<StudentHomeworkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getStudentHomeworkSubmissions(studentId)
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch((err) => {
        console.warn("Could not load student homework records:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  return (
    <section id="homework" aria-labelledby="student-hw-heading" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-accent-muted text-accent">
          <BookOpen className="size-4" />
        </span>
        <h2 id="student-hw-heading" className="font-display text-2xl font-medium text-fg">
          {strings.student.homeworkSectionTitle}
        </h2>
        {records.length > 0 && (
          <span className="text-xs font-semibold text-muted">({records.length})</span>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-6 text-sm text-fg-secondary">
          {strings.student.homeworkSectionEmpty}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-elevated">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border-subtle bg-secondary/50 text-muted">
              <tr>
                <th className="p-3.5 font-medium">Activity</th>
                <th className="p-3.5 font-medium">{strings.homework.scoreColumn}</th>
                <th className="p-3.5 font-medium">{strings.homework.timeColumn}</th>
                <th className="p-3.5 font-medium">{strings.homework.dateColumn}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-primary/50">
                  <td className="p-3.5 font-medium text-fg">
                    <div className="flex items-center gap-2">
                      <span>{rec.activityTitle}</span>
                      {rec.late && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                          {strings.homework.lateBadge}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5">
                    {rec.activityType === "flashcards" || rec.activityType === "prompt-cards" ? (
                      <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-medium text-success">
                        {strings.homework.completedBadge}
                      </span>
                    ) : (
                      <span className="font-mono font-medium text-fg">
                        {rec.correct}/{rec.total}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-muted" />
                      <span>{strings.homework.timeSpent(rec.seconds)}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-muted" />
                      <span>{new Date(rec.completedAt).toLocaleDateString()}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
