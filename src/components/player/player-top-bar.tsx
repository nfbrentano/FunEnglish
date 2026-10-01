"use client";

import { LogOut, Maximize, Minimize, RotateCcw, Share2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FavoriteButton } from "@/components/favorites/favorites-ui";
import type { Progress } from "@/lib/player/types";
import { strings } from "@/lib/strings";

type PlayerTopBarProps = {
  progress: Progress | null;
  scores: number[] | null;
  teamNames: string[];
  fullscreen: { active: boolean; supported: boolean; toggle: () => void };
  studentMode: boolean;
  onRestart: () => void;
  onShare: () => void;
  activity: { id: string; title: string };
};

const iconButton =
  "flex size-11 items-center justify-center rounded-full text-fg-secondary transition-colors hover:bg-elevated hover:text-fg";

function IconAction({
  label,
  children,
  ...rest
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" aria-label={label} title={label} className={iconButton} {...rest}>
      {children}
    </button>
  );
}

export function PlayerTopBar({
  progress,
  scores,
  teamNames,
  fullscreen,
  studentMode,
  onRestart,
  onShare,
  activity,
}: PlayerTopBarProps) {
  const percent =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle pb-3">
      {progress && (
        <div className="flex min-w-40 flex-1 items-center gap-3">
          <span className="text-sm font-medium tabular-nums">
            {strings.player.progress(progress.current, progress.total)}
          </span>
          <div
            role="progressbar"
            aria-label={strings.player.progressLabel}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.current}
            className="h-1.5 max-w-64 flex-1 overflow-hidden rounded-full bg-border-subtle"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {scores && (
        <ul aria-label={strings.player.score} className="flex flex-wrap gap-2">
          {scores.map((score, team) => {
            const active = scores.length > 1 && progress?.activeTeam === team;
            const name =
              scores.length > 1
                ? (teamNames[team] ?? strings.player.team(team + 1))
                : strings.player.score;
            return (
              <li
                key={team}
                aria-current={active ? "true" : undefined}
                className={`rounded-full border px-3 py-1 text-sm tabular-nums ${
                  active
                    ? "border-accent bg-accent-muted text-fg"
                    : "border-border-subtle text-fg-secondary"
                }`}
              >
                {name}: <strong className="text-fg">{score}</strong>
              </li>
            );
          })}
        </ul>
      )}

      <div className="ml-auto flex items-center gap-1">
        <IconAction label={strings.player.restart} onClick={onRestart}>
          <RotateCcw aria-hidden="true" className="size-5" />
        </IconAction>
        {fullscreen.supported && (
          <IconAction
            label={fullscreen.active ? strings.player.exitFullscreen : strings.player.fullscreen}
            onClick={fullscreen.toggle}
          >
            {fullscreen.active ? (
              <Minimize aria-hidden="true" className="size-5" />
            ) : (
              <Maximize aria-hidden="true" className="size-5" />
            )}
          </IconAction>
        )}
        {!studentMode && (
          <>
            <FavoriteButton
              activityId={activity.id}
              title={activity.title}
              className={iconButton}
              iconClassName="size-5"
            />
            <IconAction label={strings.catalog.share} onClick={onShare}>
              <Share2 aria-hidden="true" className="size-5" />
            </IconAction>
            <Link
              href="/activities"
              aria-label={strings.player.exit}
              title={strings.player.exit}
              className={iconButton}
            >
              <LogOut aria-hidden="true" className="size-5" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
