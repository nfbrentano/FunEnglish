"use client";

import { Dices, RotateCcw, Volume2, Play, Pause, Square, Check, Clock } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { rollDiceContentSchema } from "@/lib/activities/schema/content";
import type { PluginProps } from "@/lib/player/types";
import { strings } from "@/lib/strings";

type RollDiceContent = z.infer<typeof rollDiceContentSchema>;

/** Synthesizes procedural wooden dice tumbling clicks with zero external audio assets. */
function playDiceSound() {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const t = now + i * 0.08 + Math.random() * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(160 + Math.random() * 140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.04);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  } catch {
    // Audio is non-blocking enhancement
  }
}

/** Beep sound for speaking timer zero alert. */
function playBeepSound() {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Non-blocking
  }
}

/** Reads a sentence aloud using Web Speech API. */
function speakText(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

/** Visual die component with 3x3 pip dots. */
function DieFace({
  value,
  label,
  colorScheme = "primary",
  isRolling = false,
  onClick,
}: {
  value: number;
  label: string;
  colorScheme?: "primary" | "secondary";
  isRolling?: boolean;
  onClick?: () => void;
}) {
  // 3x3 positions for pips (1 to 6)
  const pips: Record<number, [number, number][]> = {
    1: [[2, 2]],
    2: [
      [1, 3],
      [3, 1],
    ],
    3: [
      [1, 3],
      [2, 2],
      [3, 1],
    ],
    4: [
      [1, 1],
      [1, 3],
      [3, 1],
      [3, 3],
    ],
    5: [
      [1, 1],
      [1, 3],
      [2, 2],
      [3, 1],
      [3, 3],
    ],
    6: [
      [1, 1],
      [1, 3],
      [2, 1],
      [2, 3],
      [3, 1],
      [3, 3],
    ],
  };

  const activePips = pips[Math.min(6, Math.max(1, value))] ?? pips[1];

  const borderClass =
    colorScheme === "primary"
      ? "border-primary/40 bg-card text-primary shadow-sm"
      : "border-amber-500/40 bg-card text-amber-500 shadow-sm";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-semibold tracking-wider uppercase text-muted">
        {label}
      </span>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label} showing ${value}`}
        className={`relative grid h-16 w-16 md:h-20 md:w-20 cursor-pointer grid-cols-3 grid-rows-3 items-center justify-items-center rounded-2xl border-2 p-2.5 transition-all duration-150 hover:scale-105 active:scale-95 ${borderClass} ${
          isRolling ? "animate-bounce" : ""
        }`}
      >
        {[1, 2, 3].map((r) =>
          [1, 2, 3].map((c) => {
            const hasPip = activePips.some(([pr, pc]) => pr === r && pc === c);
            return (
              <span
                key={`${r}-${c}`}
                className={`h-2.5 w-2.5 md:h-3 md:w-3 rounded-full transition-opacity duration-150 ${
                  hasPip
                    ? colorScheme === "primary"
                      ? "bg-primary"
                      : "bg-amber-500"
                    : "opacity-0"
                }`}
              />
            );
          }),
        )}
      </button>
    </div>
  );
}

/** Speaking timer inside the modal. */
function ModalSpeakingTimer({ defaultSeconds = 60 }: { defaultSeconds?: number }) {
  const [target, setTarget] = useState(defaultSeconds);
  const [left, setLeft] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setLeft(target);
    setRunning(false);
  }, [target]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setRunning(false);
          playBeepSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  if (target === 0) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTarget(60)}
          className="text-xs text-muted hover:text-foreground flex items-center gap-1 underline underline-offset-2"
        >
          <Clock className="h-3.5 w-3.5" />
          Start speaking timer
        </button>
      </div>
    );
  }

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card border px-3 py-1.5 shadow-xs">
      <Clock className={`h-4 w-4 ${running ? "text-primary animate-pulse" : "text-muted"}`} />
      <span className={`font-mono text-sm font-semibold ${left <= 5 && left > 0 ? "text-amber-500" : left === 0 ? "text-destructive" : ""}`}>
        {mm}:{ss}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? "Pause timer" : "Start timer"}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => {
            setRunning(false);
            setLeft(target);
          }}
          aria-label="Reset timer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="border-l pl-2 flex gap-1">
        {[30, 60, 90].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTarget(s)}
            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
              target === s ? "bg-primary text-primary-foreground font-bold" : "text-muted hover:text-foreground"
            }`}
          >
            {s}s
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RollDicePlayer({
  content,
  onProgress,
  onComplete,
}: PluginProps<RollDiceContent>) {
  const [rowDie, setRowDie] = useState(1);
  const [colDie, setColDie] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  const rollLiveRegionId = useId();

  // Index questions by `${row}:${col}` for fast O(1) lookup
  const questionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of content.grid) {
      map.set(`${item.row}:${item.col}`, item.question);
    }
    return map;
  }, [content.grid]);

  // Report progress
  useEffect(() => {
    onProgress({ current: visited.size, total: 36 });
  }, [visited.size, onProgress]);

  const openQuestion = useCallback((row: number, col: number) => {
    const q = questionMap.get(`${row}:${col}`) ?? "";
    setActiveCell({ row, col });
    setSelectedQuestion(q);
    setModalOpen(true);
    setVisited((prev) => new Set(prev).add(`${row}:${col}`));
  }, [questionMap]);

  const rollDice = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);
    playDiceSound();

    let count = 0;
    const interval = setInterval(() => {
      setRowDie(Math.floor(Math.random() * 6) + 1);
      setColDie(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 10) {
        clearInterval(interval);
        const finalRow = Math.floor(Math.random() * 6) + 1;
        const finalCol = Math.floor(Math.random() * 6) + 1;
        setRowDie(finalRow);
        setColDie(finalCol);
        setIsRolling(false);
        // Highlight and open question after stopping
        setTimeout(() => {
          openQuestion(finalRow, finalCol);
        }, 300);
      }
    }, 70);
  }, [isRolling, openQuestion]);

  const resetBoard = useCallback(() => {
    setVisited(new Set());
    setActiveCell(null);
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-2 md:px-4 py-2">
      {/* Hidden live region for a11y screen reader announcements (CA10) */}
      <div id={rollLiveRegionId} aria-live="polite" className="sr-only">
        {isRolling
          ? strings.rollDice.rolling
          : strings.rollDice.result(rowDie, colDie)}
      </div>

      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card border p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Dices className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold md:text-2xl">
              {strings.rollDice.title}
            </h1>
            <p className="text-xs md:text-sm text-muted">
              {content.instructions ?? "Roll the dice and practice speaking!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-medium py-1 px-3">
            {strings.rollDice.answered(visited.size, 36)}
          </Badge>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={resetBoard}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{strings.rollDice.resetBoard}</span>
          </Button>
        </div>
      </div>

      {/* Main Layout: Dice Sidebar + 6x6 Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Dice Control Panel */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center gap-6 rounded-2xl bg-card border p-6 shadow-xs">
          <div className="flex items-center justify-center gap-6">
            <DieFace
              value={rowDie}
              label={strings.rollDice.rowLabel(rowDie)}
              colorScheme="primary"
              isRolling={isRolling}
              onClick={rollDice}
            />
            <DieFace
              value={colDie}
              label={strings.rollDice.colLabel(colDie)}
              colorScheme="secondary"
              isRolling={isRolling}
              onClick={rollDice}
            />
          </div>

          <Button
            type="button"
            size="lg"
            onClick={rollDice}
            disabled={isRolling}
            className="w-full text-base font-semibold py-6 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Dices className={`h-5 w-5 ${isRolling ? "animate-spin" : ""}`} />
            <span>{isRolling ? strings.rollDice.rolling : strings.rollDice.rollButton}</span>
          </Button>

          <p className="text-xs text-center text-muted">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border font-mono">Space</kbd> or click the dice to roll. You can also click any square on the board directly!
          </p>
        </div>

        {/* 6x6 Board Grid */}
        <div className="lg:col-span-3 flex flex-col gap-2 rounded-2xl bg-card border p-3 md:p-6 shadow-xs overflow-x-auto">
          {/* Header Row: Column Numbers 1 to 6 */}
          <div className="grid grid-cols-7 gap-1.5 md:gap-2.5 text-center font-bold text-xs md:text-sm text-muted uppercase">
            <div className="flex items-center justify-center font-mono text-muted/60">#</div>
            {[1, 2, 3, 4, 5, 6].map((c) => (
              <div
                key={`col-hdr-${c}`}
                className={`py-1 rounded-md transition-colors ${
                  colDie === c ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold" : ""
                }`}
              >
                Col {c}
              </div>
            ))}
          </div>

          {/* Grid Rows 1 to 6 */}
          {[1, 2, 3, 4, 5, 6].map((r) => (
            <div key={`row-${r}`} className="grid grid-cols-7 gap-1.5 md:gap-2.5">
              {/* Row Header Label */}
              <div
                className={`flex items-center justify-center rounded-lg text-xs md:text-sm font-bold uppercase transition-colors ${
                  rowDie === r ? "bg-primary/15 text-primary font-extrabold" : "text-muted"
                }`}
              >
                Row {r}
              </div>

              {/* 6 Cells in this Row */}
              {[1, 2, 3, 4, 5, 6].map((c) => {
                const question = questionMap.get(`${r}:${c}`) ?? "";
                const isVisited = visited.has(`${r}:${c}`);
                const isActive = activeCell?.row === r && activeCell?.col === c;
                const isTargetOfDice = rowDie === r && colDie === c;

                return (
                  <button
                    key={`cell-${r}-${c}`}
                    type="button"
                    data-row={r}
                    data-col={c}
                    onClick={() => openQuestion(r, c)}
                    className={`group relative flex flex-col justify-between h-20 md:h-28 p-2 text-left rounded-xl border transition-all duration-150 select-none cursor-pointer overflow-hidden ${
                      isActive || isTargetOfDice
                        ? "border-primary ring-2 ring-primary/40 bg-primary/10 shadow-md scale-[1.02] z-10"
                        : isVisited
                        ? "border-border/60 bg-muted/40 opacity-75 hover:opacity-100"
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted/30 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-[10px] md:text-xs text-muted/80">
                        {r},{c}
                      </span>
                      {isVisited && (
                        <span
                          aria-label={strings.rollDice.visited}
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px]"
                        >
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>

                    <p className="line-clamp-3 text-[11px] md:text-xs leading-snug font-medium text-foreground group-hover:text-primary transition-colors">
                      {question}
                    </p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Question Modal (Native Accessible Dialog) */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs font-semibold">
              Row {activeCell?.row}, Col {activeCell?.col}
            </Badge>
            <span className="text-sm font-medium text-muted">Conversation Challenge</span>
          </div>
        }
        className="max-w-2xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            <ModalSpeakingTimer defaultSeconds={60} />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => selectedQuestion && speakText(selectedQuestion)}
                className="flex items-center gap-1.5"
              >
                <Volume2 className="h-4 w-4" />
                <span>{strings.rollDice.readAloud}</span>
              </Button>
              <Button
                type="button"
                onClick={() => setModalOpen(false)}
              >
                {strings.rollDice.closeModal}
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center gap-6 py-6 text-center">
          <h2 className="font-display text-2xl md:text-4xl font-semibold leading-relaxed tracking-tight text-foreground">
            {selectedQuestion}
          </h2>
        </div>
      </Dialog>
    </div>
  );
}
