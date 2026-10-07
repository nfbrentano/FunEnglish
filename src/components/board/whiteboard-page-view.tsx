"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Radio, Sparkles } from "lucide-react";
import { ClassroomBoard } from "@/components/board/classroom-board";
import { InteractiveWhiteboard } from "@/components/live/interactive-whiteboard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { useLiveRoom } from "@/lib/live/live-context";

export function WhiteboardPageView() {
  const { user } = useAuth();
  const live = useLiveRoom();
  const [showLiveSyncModal, setShowLiveSyncModal] = useState(false);

  const sessionId = user ? `teacher-board-${user.uid}` : "standalone-whiteboard";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6">
      {/* Top action header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-elevated/70 p-3.5 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-primary/40 px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:border-accent hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-accent-muted text-accent">
              <Edit3 className="size-4" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-fg sm:text-xl">
                Lousa Digital
              </h1>
              <p className="text-[11px] text-muted">
                Quadro livre para anotações, explicações e desenho
              </p>
            </div>
          </div>
        </div>

        {/* Live sharing actions */}
        <div className="flex items-center gap-2">
          {live?.isLiveActive ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                <span className="size-2 rounded-full bg-accent animate-pulse" />
                Live: {live.liveRoom?.code}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => live.toggleWhiteboard()}
                className="gap-1.5 text-xs"
              >
                <Sparkles className="size-3.5 text-accent" />
                <span>{live.isWhiteboardOpen ? "Lousa ao Vivo Aberta" : "Abrir na Sala ao Vivo"}</span>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => live?.openModal()}
              className="gap-1.5 text-xs"
            >
              <Radio className="size-3.5 text-accent" />
              <span>Conectar com Alunos (Live)</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Board Component */}
      <main className="w-full">
        <ClassroomBoard
          sessionId={sessionId}
          className="h-[calc(100vh-10rem)]! min-h-145 w-full shadow-md"
        />
      </main>

      {/* Live synchronized whiteboard overlay if teacher opened it */}
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
