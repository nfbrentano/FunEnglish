"use client";

import Link from "next/link";
import { ArrowLeft, Radio, Sparkles } from "lucide-react";
import { ClassroomBoard } from "@/components/board/classroom-board";
import { InteractiveWhiteboard } from "@/components/live/interactive-whiteboard";
import { useAuth } from "@/lib/auth/use-auth";
import { useLiveRoom } from "@/lib/live/live-context";
import { strings } from "@/lib/strings";
import { Island } from "./board-ui";

const s = strings.whiteboard;

const chip =
  "flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:h-11";

/**
 * /lousa: the board fills the space below the site header; back link, title and live room
 * controls live in the board's top-left island (SDD/2026-10-06_redesign-ux-ui-lousa.md, RF13).
 */
export function WhiteboardPageView() {
  const { user } = useAuth();
  const live = useLiveRoom();

  const sessionId = user ? `teacher-board-${user.uid}` : "standalone-whiteboard";

  const leading = (
    <Island className="min-w-0">
      <Link
        href="/dashboard"
        aria-label={s.backToDashboard}
        title={s.backToDashboard}
        className={`${chip} text-fg-secondary hover:bg-accent-muted hover:text-fg`}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
      </Link>
      <div className="hidden min-w-0 px-1.5 @6xl:block">
        <h1 className="truncate font-display text-lg leading-tight text-fg">{s.title}</h1>
        <p className="truncate text-[11px] text-muted">{s.pageSubtitle}</p>
      </div>
      <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-border-strong @6xl:block" />
      {live?.isLiveActive ? (
        <>
          <span className="flex h-9 items-center gap-1.5 rounded-xl bg-accent-muted px-2.5 text-xs font-semibold text-accent tabular-nums">
            <span className="size-2 rounded-full bg-accent motion-safe:animate-pulse" />
            {s.liveBadge(live.liveRoom?.code ?? "")}
          </span>
          <button
            type="button"
            onClick={() => live.toggleWhiteboard()}
            className={`${chip} text-fg-secondary hover:bg-accent-muted hover:text-fg`}
          >
            <Sparkles aria-hidden="true" className="size-3.5 text-accent" />
            <span className="hidden @4xl:inline">
              {live.isWhiteboardOpen ? s.liveOpen : s.openOnLive}
            </span>
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => live?.openModal()}
          aria-label={s.connectLive}
          className={`${chip} text-fg-secondary hover:bg-accent-muted hover:text-fg`}
        >
          <Radio aria-hidden="true" className="size-3.5 text-accent" />
          <span className="hidden @4xl:inline">{s.connectLive}</span>
        </button>
      )}
    </Island>
  );

  return (
    <div className="flex w-full flex-col p-2">
      <ClassroomBoard
        sessionId={sessionId}
        leading={leading}
        // Site header (4rem) + padding (1rem), plus the bottom nav (3.5rem) on phones.
        className="h-[calc(100dvh-8.5rem)]! min-h-105 md:h-[calc(100dvh-5rem)]!"
      />

      {live?.isWhiteboardOpen && live.roomCode && (
        <InteractiveWhiteboard
          roomCode={live.roomCode}
          isTeacher={true}
          onClose={() => live.toggleWhiteboard()}
        />
      )}
    </div>
  );
}
