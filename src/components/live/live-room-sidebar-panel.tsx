"use client";

import {
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Eye,
  Lock,
  Radio,
  Share2,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeLeaderboard } from "@/lib/live/scoring";
import { useLiveRoom } from "@/lib/live/live-context";

export function LiveRoomSidebarPanel() {
  const live = useLiveRoom();

  if (!live) return null;

  const { liveRoom, isLiveActive, openModal } = live;

  if (!isLiveActive || !liveRoom) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Radio className="size-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-semibold text-sm text-fg">No Live Room Active</h4>
          <p className="text-xs text-muted">
            Open a live room so students can join from their phones and participate in real time.
          </p>
        </div>
        <Button onClick={openModal} className="mt-2 min-h-9 px-4 text-xs font-semibold">
          Open live room
        </Button>
      </div>
    );
  }

  const { state, participants, answers, code, locked } = liveRoom;
  const participantsList = Object.values(participants || {});
  const onlineParticipants = participantsList.filter((p) => p.online !== false);
  const totalCount = onlineParticipants.length;

  const currentItemIndex = state.itemIndex ?? 0;
  const currentAnswers = answers?.[currentItemIndex] || {};
  const answeredCount = Object.keys(currentAnswers).length;

  const isRevealed = Boolean(state.revealed);
  const { top: leaderboard } = computeLeaderboard(participants);

  return (
    <div className="p-4 space-y-5 select-none">
      {/* Top Room Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-primary/30 p-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex size-2 rounded-full bg-success animate-pulse" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-black text-accent">{code}</span>
              {locked && (
                <span className="rounded bg-red-500/20 px-1 text-[10px] font-bold text-red-500">
                  LOCKED
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted">
              {onlineParticipants.length} online
            </span>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={openModal}
          className="min-h-8 px-2.5 py-1 text-xs font-semibold"
        >
          <Share2 className="size-3.5" />
          <span>Invite & QR</span>
        </Button>
      </div>

      {/* 1. ACTIVITY MODE (RF04, RF05, RF06, CA05, CA06) */}
      {state.mode === "activity" && state.question && (
        <div className="space-y-4 rounded-3xl border border-border-subtle bg-primary/20 p-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              {state.activityType?.toUpperCase() || "QUIZ"} · Question {(state.itemIndex ?? 0) + 1}
              {state.totalItems ? ` of ${state.totalItems}` : ""}
            </span>
            <Badge variant="outline" className="text-xs font-mono font-bold">
              {answeredCount}/{totalCount} answered
            </Badge>
          </div>

          {/* Prompt */}
          <p className="text-xs font-medium text-fg leading-relaxed">
            {state.question.prompt}
          </p>

          {/* Progress bar of answers */}
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary/40">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{
                  width: `${totalCount > 0 ? (answeredCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted">
              <span>{answeredCount} received</span>
              <span>{Math.max(0, totalCount - answeredCount)} pending</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!isRevealed ? (
              <Button
                onClick={live.revealAnswer}
                className="flex-1 min-h-9 px-4 text-xs font-semibold"
              >
                <Eye className="size-4" />
                <span>Reveal Answer</span>
              </Button>
            ) : (
              <Button
                onClick={live.advanceQuestion}
                className="flex-1 min-h-9 px-4 text-xs font-semibold"
              >
                <span>Next Question</span>
                <ChevronRight className="size-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={live.returnToLobby}
              className="min-h-9 px-3 text-xs text-muted hover:text-fg"
            >
              End Activity
            </Button>
          </div>

          {/* Distribution & Correction after Reveal (RF04, CA06) */}
          {isRevealed && (
            <div className="space-y-3 border-t border-border-subtle pt-3">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <BarChart3 className="size-3.5 text-accent" />
                <span>Responses & Results</span>
              </h5>

              <ul className="space-y-1.5">
                {Object.entries(currentAnswers).map(([uid, ans]) => {
                  const student = participants[uid];
                  const isCorrect = Boolean(ans.correct);
                  return (
                    <li
                      key={uid}
                      className="flex items-center justify-between rounded-xl border border-border-subtle/60 bg-primary/30 px-2.5 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCorrect ? (
                          <CheckCircle2 className="size-3.5 text-success shrink-0" />
                        ) : (
                          <XCircle className="size-3.5 text-muted shrink-0" />
                        )}
                        <span className="font-medium text-fg truncate">
                          {student?.name || "Student"}
                        </span>
                        <span className="text-[11px] text-muted truncate">
                          "{ans.value}"
                        </span>
                      </div>
                      {ans.pointsAwarded ? (
                        <span className="font-mono text-[10px] font-bold text-accent shrink-0">
                          +{ans.pointsAwarded} pts
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 2. PRESENTATION MODE (RF07, CA08) */}
      {state.mode === "presentation" && (
        <div className="space-y-3 rounded-3xl border border-border-subtle bg-primary/20 p-4 text-center">
          <div className="flex size-10 mx-auto items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <Radio className="size-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-fg uppercase tracking-wider">
              Presentation Mode Active
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Student devices currently show:
              <br />
              <span className="font-semibold text-fg">"Look at your teacher's screen 👀"</span>
            </p>
          </div>
          <p className="text-[11px] text-accent/90">
            Projection mode is ON to prevent notes/emails from leaking on screen share.
          </p>
          <Button
            variant="secondary"
            onClick={live.returnToLobby}
            className="min-h-8 px-3 text-xs"
          >
            Back to lobby
          </Button>
        </div>
      )}

      {/* 3. LOBBY STATE */}
      {state.mode === "lobby" && (
        <div className="rounded-3xl border border-dashed border-border-subtle p-5 text-center space-y-2">
          <p className="text-xs font-medium text-fg">Lobby Active</p>
          <p className="text-[11px] text-muted leading-relaxed">
            Students are waiting in the room. Open an activity or use a mirrored tool in the sidebar
            to present.
          </p>
        </div>
      )}

      {/* 4. LEADERBOARD (RF05, CA07) */}
      {leaderboard.length > 0 && (
        <div className="space-y-2.5 rounded-3xl border border-border-subtle bg-primary/10 p-3.5">
          <div className="flex items-center justify-between">
            <h5 className="flex items-center gap-1.5 text-xs font-semibold text-fg">
              <Trophy className="size-3.5 text-accent" />
              <span>Leaderboard (Top 5)</span>
            </h5>
            {liveRoom.hideLeaderboard && (
              <span className="text-[10px] text-muted">Hidden from students</span>
            )}
          </div>

          <ol className="space-y-1.5">
            {leaderboard.map((item) => (
              <li
                key={item.uid}
                className="flex items-center justify-between rounded-xl border border-border-subtle/50 bg-primary/30 px-3 py-1.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      item.rank === 1
                        ? "bg-amber-400 text-black"
                        : item.rank === 2
                          ? "bg-neutral-300 text-black"
                          : item.rank === 3
                            ? "bg-amber-700 text-white"
                            : "bg-primary/40 text-muted"
                    }`}
                  >
                    {item.rank}
                  </span>
                  <span className="font-medium text-fg">{item.name}</span>
                </div>
                <span className="font-mono text-xs font-bold text-accent">
                  {item.score} pts
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
