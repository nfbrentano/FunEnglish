"use client";

import {
  Check,
  Circle,
  ExternalLink,
  Milestone,
  Minus,
  Play,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogItem } from "@/lib/catalog/schema";
import { useCatalogIndex } from "@/lib/catalog/use-catalog-index";
import { strings } from "@/lib/strings";
import { calculateTrackProgress } from "@/lib/tracks/progress";
import { getStudentTracks } from "@/lib/tracks/repository";
import type { StudentTrackProgress } from "@/lib/tracks/types";

interface StudentTracksTabProps {
  studentId: string;
}

export function StudentTracksTab({ studentId }: StudentTracksTabProps) {
  const { index } = useCatalogIndex();
  const [tracks, setTracks] = useState<StudentTrackProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const catalogMap = new Map(index.items.map((item) => [item.id, item]));

  useEffect(() => {
    let active = true;
    if (!studentId) return;

    setLoading(true);
    getStudentTracks(studentId)
      .then((records) => {
        if (!active) return;
        setTracks(records);
      })
      .catch((err) => {
        if (!active) return;
        console.warn("Could not load tracks for student portal:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-3xl" />
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong bg-elevated p-8 sm:p-12 text-center space-y-3">
        <div className="flex justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Milestone className="size-6" />
          </span>
        </div>
        <h3 className="font-display text-xl font-medium text-fg">
          {strings.portal.progressTitle}
        </h3>
        <p className="text-sm text-fg-secondary max-w-sm mx-auto">
          {strings.portal.progressEmpty}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {tracks.map((track) => {
        const calculated = calculateTrackProgress(
          track.activityIds,
          track.completed,
          catalogMap,
        );

        const isFullyCompleted =
          calculated.total > 0 && calculated.completedCount >= calculated.total;

        return (
          <section
            key={track.trackId}
            className="rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-8 space-y-6 shadow-xs"
          >
            {/* Header banner */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                    <Milestone className="size-3.5" />
                    {strings.tracks.portalTab}
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-medium text-fg">
                    {track.trackName}
                  </h2>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl sm:text-4xl font-bold text-accent">
                    {calculated.percent}%
                  </span>
                  <span className="text-xs text-muted uppercase font-medium">complete</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-primary overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500 rounded-full"
                    style={{ width: `${calculated.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted font-medium">
                  <span>
                    {strings.tracks.stepsCompleted(calculated.completedCount, calculated.total)}
                  </span>
                  {isFullyCompleted && (
                    <span className="text-success font-semibold flex items-center gap-1">
                      <Sparkles className="size-3" />
                      All steps finished!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Congratulations box if 100% complete */}
            {isFullyCompleted && (
              <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-xs font-medium text-success">
                <Trophy className="size-5 shrink-0" />
                <span>{strings.tracks.congratulationsAllCompleted}</span>
              </div>
            )}

            {/* Stepping Trail (Roadmap) */}
            <div className="space-y-3 pt-2 border-t border-border-subtle">
              <span className="text-xs font-semibold text-fg-secondary uppercase tracking-wider">
                Trail Path
              </span>

              <div className="space-y-3">
                {calculated.steps.map((step) => {
                  const item = catalogMap.get(step.activityId);
                  const isCompleted = step.status === "completed";
                  const isCurrent = step.status === "current";
                  const isUnavailable = step.status === "unavailable";
                  const activityHref = item ? `/play?id=${item.id}` : "#";

                  return (
                    <div
                      key={step.activityId}
                      className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30"
                          : isCompleted
                            ? "border-success/30 bg-success/5"
                            : isUnavailable
                              ? "border-border-subtle bg-primary/40 opacity-60"
                              : "border-border-subtle bg-primary"
                      }`}
                    >
                      {/* Step Indicator & Title */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        {/* Step badge */}
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isCompleted
                              ? "bg-success text-primary"
                              : isCurrent
                                ? "bg-accent text-primary animate-pulse"
                                : isUnavailable
                                  ? "bg-secondary text-muted"
                                  : "bg-secondary text-muted border border-border-subtle"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="size-4 stroke-3" />
                          ) : isUnavailable ? (
                            <Minus className="size-3.5" />
                          ) : (
                            step.order
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <p
                            className={`font-medium text-sm truncate ${
                              isUnavailable ? "text-muted line-through" : "text-fg"
                            }`}
                          >
                            {item?.title ?? `Activity (${step.activityId})`}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted">
                            {item && <span className="capitalize">{item.category}</span>}
                            {isUnavailable && (
                              <span className="text-amber-500 font-medium">
                                · {strings.tracks.statusUnavailable}
                              </span>
                            )}
                            {isCompleted && (
                              <span className="text-success font-medium flex items-center gap-1">
                                · Completed ✓
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-accent font-semibold flex items-center gap-1">
                                · Next up
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action for step */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isCurrent && item && (
                          <Link
                            href={activityHref}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-xs font-semibold text-primary hover:opacity-90 shadow-xs"
                          >
                            <Play className="size-3 fill-current" />
                            <span>{strings.tracks.playActivity}</span>
                          </Link>
                        )}

                        {isCompleted && item && (
                          <Link
                            href={activityHref}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border-subtle bg-primary px-3 text-xs font-medium text-fg-secondary hover:text-fg hover:border-accent"
                          >
                            <span>Practice again</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
