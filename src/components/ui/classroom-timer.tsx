"use client";

import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { useClassroomTimerContext } from "@/lib/timer/timer-context";
import {
  formatTimerDisplay,
  parseCustomTime,
  TIMER_PRESETS,
  useTimer,
} from "@/lib/timer/use-timer";

export type ClassroomTimerProps = {
  /** Optional custom timer instance. If not provided, uses context or local state. */
  timer?: ReturnType<typeof useTimer>;
  className?: string;
};

/**
 * Visual classroom countdown timer & stopwatch (SDD/2026-10-03_05-cronometro-visual.md).
 * Features:
 * - High-contrast legible projection display (RNF02)
 * - Drift-free Date.now() time calculation (RNF01)
 * - Presets and custom time validation (RF01, CA08)
 * - Quick +30s / -30s adjustment (RF03, CA03)
 * - Visual and auditory Time's up alert (RF04, RNF03, RNF04)
 * - Big screen overlay with Esc dismissal (RF05, CA05)
 */
export function ClassroomTimer({ timer: externalTimer, className = "" }: ClassroomTimerProps) {
  const contextTimer = useClassroomTimerContext();
  const localTimer = useTimer();
  const timer = externalTimer ?? contextTimer ?? localTimer;

  const {
    mode,
    status,
    duration,
    remaining,
    elapsed,
    isMuted,
    isBigScreen,
    start,
    pause,
    resume,
    reset,
    selectPreset,
    setCustomCountdown,
    switchMode,
    adjustCountdown,
    toggleMute,
    openBigScreen,
    closeBigScreen,
  } = timer;

  const [customInput, setCustomInput] = useState("");
  const [customTouched, setCustomTouched] = useState(false);
  const customId = useId();

  // Escape key handler to close big screen without stopping timer (CA05)
  useEffect(() => {
    if (!isBigScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeBigScreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBigScreen, closeBigScreen]);

  const parsedCustom = parseCustomTime(customInput);
  const isCustomInvalid = customTouched && customInput.trim().length > 0 && !parsedCustom.valid;

  const isCompleted = mode === "countdown" && status === "completed";
  const isUrgent = mode === "countdown" && remaining <= 10 && remaining > 0 && status === "running";

  const progress =
    mode === "countdown"
      ? duration > 0
        ? Math.max(0, Math.min(1, remaining / duration))
        : 0
      : 1;

  // SVG circular gauge properties
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      className={`relative flex flex-col items-center gap-6 rounded-3xl border border-border-subtle bg-secondary p-6 text-fg shadow-sm transition-all sm:p-8 ${className}`}
    >
      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label={strings.classroomTimer.title}
        className="flex items-center gap-1 rounded-full border border-border-strong bg-elevated p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "countdown"}
          onClick={() => switchMode("countdown")}
          className={`min-h-9 rounded-full px-5 text-sm font-medium transition-colors ${
            mode === "countdown"
              ? "bg-accent text-primary shadow-xs"
              : "text-fg-secondary hover:text-fg"
          }`}
        >
          {strings.classroomTimer.countdown}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "stopwatch"}
          onClick={() => switchMode("stopwatch")}
          className={`min-h-9 rounded-full px-5 text-sm font-medium transition-colors ${
            mode === "stopwatch"
              ? "bg-accent text-primary shadow-xs"
              : "text-fg-secondary hover:text-fg"
          }`}
        >
          {strings.classroomTimer.stopwatch}
        </button>
      </div>

      {/* Main Countdown Display with Circular Ring */}
      <div className="relative flex size-64 items-center justify-center sm:size-72">
        <svg
          aria-hidden="true"
          className="size-full -rotate-90 transform"
          viewBox="0 0 200 200"
        >
          {/* Background Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="stroke-border-strong"
            strokeWidth="10"
            fill="transparent"
          />
          {/* Active Progress */}
          {mode === "countdown" && (
            <circle
              cx="100"
              cy="100"
              r={radius}
              className={`transition-all duration-300 ease-linear ${
                isCompleted
                  ? "stroke-error animate-pulse"
                  : isUrgent
                    ? "stroke-error"
                    : "stroke-accent"
              }`}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          )}
        </svg>

        {/* Center Numbers and Labels */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {isCompleted ? (
            <div
              role="alert"
              aria-live="assertive"
              className="flex flex-col items-center gap-2 animate-bounce"
            >
              <span className="font-display text-4xl font-bold tracking-wide text-error sm:text-5xl">
                {strings.classroomTimer.timesUp}
              </span>
              <span className="text-sm font-semibold tracking-wider uppercase text-fg-secondary">
                00:00
              </span>
            </div>
          ) : (
            <div
              role="timer"
              aria-label={strings.classroomTimer.title}
              className="flex flex-col items-center"
            >
              <span
                className={`font-mono text-5xl font-bold tracking-tight tabular-nums transition-colors sm:text-6xl ${
                  isUrgent ? "text-error" : "text-fg"
                }`}
              >
                {formatTimerDisplay(mode === "countdown" ? remaining : elapsed)}
              </span>
              <span className="mt-1 text-xs font-medium tracking-widest uppercase text-muted">
                {mode === "countdown"
                  ? status === "running"
                    ? strings.classroomTimer.ariaTimerRunning
                    : status === "paused"
                      ? strings.classroomTimer.ariaTimerPaused
                      : strings.classroomTimer.countdown
                  : strings.classroomTimer.stopwatch}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Countdown Presets & Custom Time */}
      {mode === "countdown" && (
        <div className="flex w-full flex-col items-center gap-4">
          <div
            role="group"
            aria-label="Preset timers"
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {TIMER_PRESETS.map((preset) => {
              const isSelected = duration === preset.seconds && remaining === preset.seconds;
              return (
                <button
                  key={preset.seconds}
                  type="button"
                  onClick={() => {
                    setCustomInput("");
                    setCustomTouched(false);
                    selectPreset(preset.seconds);
                  }}
                  className={`min-h-10 rounded-full border px-3.5 text-xs font-semibold transition-colors sm:text-sm ${
                    isSelected
                      ? "border-accent bg-accent/20 text-accent font-bold"
                      : "border-border-strong bg-elevated text-fg hover:border-accent hover:text-accent"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Time Input */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <label htmlFor={customId} className="text-xs text-fg-secondary">
                {strings.classroomTimer.customTimeLabel}
              </label>
              <input
                id={customId}
                type="text"
                placeholder={strings.classroomTimer.customTimePlaceholder}
                value={customInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomInput(val);
                  setCustomTouched(true);
                  const parsed = parseCustomTime(val);
                  if (parsed.valid) {
                    setCustomCountdown(parsed.seconds, false);
                  }
                }}
                className="min-h-10 w-24 rounded-full border border-border-strong bg-elevated px-3 text-center font-mono text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-hidden"
              />
            </div>

            {isCustomInvalid && (
              <p
                role="alert"
                className="text-xs font-medium text-error"
              >
                {strings.classroomTimer.customTimeError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Action Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {status === "idle" && (
          <Button
            onClick={() => {
              if (customInput.trim().length > 0) {
                if (parsedCustom.valid) {
                  setCustomCountdown(parsedCustom.seconds, true);
                  setCustomInput("");
                  setCustomTouched(false);
                }
              } else {
                start();
              }
            }}
            disabled={
              (mode === "countdown" && remaining <= 0) ||
              (customInput.trim().length > 0 && !parsedCustom.valid)
            }
            className="px-6"
          >
            <Play className="size-4 fill-current" />
            {strings.classroomTimer.start}
          </Button>
        )}

        {status === "running" && (
          <>
            <Button variant="secondary" onClick={() => pause()} className="px-6">
              <Pause className="size-4 fill-current" />
              {strings.classroomTimer.pause}
            </Button>
            {mode === "countdown" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => adjustCountdown(-30)}
                  aria-label="Subtract 30 seconds"
                  className="px-3 text-xs"
                >
                  {strings.classroomTimer.minus30s}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => adjustCountdown(30)}
                  aria-label="Add 30 seconds"
                  className="px-3 text-xs"
                >
                  {strings.classroomTimer.plus30s}
                </Button>
              </div>
            )}
          </>
        )}

        {status === "paused" && (
          <>
            <Button onClick={() => resume()} className="px-6">
              <Play className="size-4 fill-current" />
              {strings.classroomTimer.resume}
            </Button>
            <Button variant="ghost" onClick={() => reset()} className="px-4">
              <RotateCcw className="size-4" />
              {strings.classroomTimer.reset}
            </Button>
          </>
        )}

        {status === "completed" && (
          <Button onClick={() => reset()} className="px-6">
            <RotateCcw className="size-4" />
            {strings.classroomTimer.reset}
          </Button>
        )}
      </div>

      {/* Toolbar: Sound Mute & Big Screen */}
      <div className="flex items-center gap-3 border-t border-border-subtle pt-4 text-sm">
        <button
          type="button"
          onClick={() => toggleMute()}
          aria-label={isMuted ? strings.classroomTimer.unmute : strings.classroomTimer.mute}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-fg-secondary hover:bg-elevated hover:text-fg"
        >
          {isMuted ? (
            <>
              <VolumeX className="size-4 text-muted" />
              <span>{strings.classroomTimer.unmute}</span>
            </>
          ) : (
            <>
              <Volume2 className="size-4 text-accent" />
              <span>{strings.classroomTimer.mute}</span>
            </>
          )}
        </button>

        <span className="text-border-strong" aria-hidden="true">
          |
        </span>

        <button
          type="button"
          onClick={() => openBigScreen()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-fg-secondary hover:bg-elevated hover:text-fg"
        >
          <Maximize2 className="size-4" />
          <span>{strings.classroomTimer.bigScreen}</span>
        </button>
      </div>

      {/* Big Screen Overlay (RF05, CA05, RNF02) */}
      {isBigScreen && (
        <BigScreenOverlay timer={timer} onClose={closeBigScreen} />
      )}
    </div>
  );
}

/**
 * Big screen overlay for classroom projector or TV.
 * Numbers ≥ 20vh, high contrast ratio (RNF02).
 * Dismisses on Esc without stopping countdown (CA05).
 */
export function BigScreenOverlay({
  timer,
  onClose,
}: {
  timer: ReturnType<typeof useTimer>;
  onClose: () => void;
}) {
  const {
    mode,
    status,
    duration,
    remaining,
    elapsed,
    isMuted,
    start,
    pause,
    resume,
    reset,
    adjustCountdown,
    toggleMute,
  } = timer;

  const isCompleted = mode === "countdown" && status === "completed";
  const isUrgent = mode === "countdown" && remaining <= 10 && remaining > 0 && status === "running";

  const progress =
    mode === "countdown"
      ? duration > 0
        ? Math.max(0, Math.min(1, remaining / duration))
        : 0
      : 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Big screen timer"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black p-6 text-white sm:p-12 select-none"
    >
      {/* Top Bar with Close & Mute */}
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? strings.classroomTimer.unmute : strings.classroomTimer.mute}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-4 text-sm font-semibold text-neutral-200 hover:border-neutral-500"
        >
          {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          <span className="hidden sm:inline">
            {isMuted ? strings.classroomTimer.unmute : strings.classroomTimer.mute}
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label={strings.classroomTimer.closeBigScreen}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-5 text-sm font-semibold text-neutral-200 hover:border-neutral-500"
        >
          <Minimize2 className="size-5" />
          <span>{strings.classroomTimer.closeBigScreen}</span>
        </button>
      </header>

      {/* Main Numbers: ≥ 20vh (RNF02) */}
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        {isCompleted ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 animate-bounce"
          >
            <h1 className="text-[12vh] sm:text-[18vh] font-black uppercase tracking-tight text-red-500">
              {strings.classroomTimer.timesUp}
            </h1>
            <span className="font-mono text-[8vh] font-bold text-neutral-400">
              00:00
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span
              className={`font-mono text-[24vh] font-black leading-none tracking-tighter tabular-nums transition-colors ${
                isUrgent ? "text-red-500 animate-pulse" : "text-white"
              }`}
            >
              {formatTimerDisplay(mode === "countdown" ? remaining : elapsed)}
            </span>
            <span className="mt-4 text-lg font-bold tracking-widest uppercase text-neutral-400">
              {mode === "countdown"
                ? status === "running"
                  ? strings.classroomTimer.ariaTimerRunning
                  : strings.classroomTimer.countdown
                : strings.classroomTimer.stopwatch}
            </span>
          </div>
        )}

        {/* Linear progress bar in big screen */}
        {mode === "countdown" && (
          <div
            role="progressbar"
            aria-valuenow={remaining}
            aria-valuemin={0}
            aria-valuemax={duration}
            className="mt-8 h-4 w-full max-w-3xl overflow-hidden rounded-full bg-neutral-800"
          >
            <div
              className={`h-full transition-all duration-300 ease-linear ${
                isCompleted
                  ? "bg-red-500"
                  : isUrgent
                    ? "bg-red-500"
                    : "bg-amber-400"
              }`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </main>

      {/* Bottom Controls */}
      <footer className="flex flex-wrap items-center justify-center gap-4">
        {mode === "countdown" && status === "running" && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => adjustCountdown(-30)}
              className="min-h-12 rounded-full border border-neutral-700 bg-neutral-900 px-6 font-mono text-base font-bold text-neutral-200 hover:border-neutral-500"
            >
              {strings.classroomTimer.minus30s}
            </button>
            <button
              type="button"
              onClick={() => adjustCountdown(30)}
              className="min-h-12 rounded-full border border-neutral-700 bg-neutral-900 px-6 font-mono text-base font-bold text-neutral-200 hover:border-neutral-500"
            >
              {strings.classroomTimer.plus30s}
            </button>
          </div>
        )}

        {status === "idle" && (
          <button
            type="button"
            onClick={() => start()}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-400 px-8 text-base font-bold text-black hover:bg-amber-300"
          >
            <Play className="size-5 fill-current" />
            {strings.classroomTimer.start}
          </button>
        )}

        {status === "running" && (
          <button
            type="button"
            onClick={() => pause()}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-8 text-base font-bold text-neutral-200 hover:border-neutral-500"
          >
            <Pause className="size-5 fill-current" />
            {strings.classroomTimer.pause}
          </button>
        )}

        {status === "paused" && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => resume()}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-400 px-8 text-base font-bold text-black hover:bg-amber-300"
            >
              <Play className="size-5 fill-current" />
              {strings.classroomTimer.resume}
            </button>
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-6 text-base font-semibold text-neutral-200 hover:border-neutral-500"
            >
              <RotateCcw className="size-5" />
              {strings.classroomTimer.reset}
            </button>
          </div>
        )}

        {status === "completed" && (
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-400 px-8 text-base font-bold text-black hover:bg-amber-300"
          >
            <RotateCcw className="size-5" />
            {strings.classroomTimer.reset}
          </button>
        )}
      </footer>
    </div>
  );
}

/**
 * Compact minitimer for headers and sidebars (RF06, CA06).
 * Remains visible across tabs when countdown or stopwatch is active.
 */
export function MiniTimer({
  timer: externalTimer,
  onClick,
  className = "",
}: {
  timer?: ReturnType<typeof useTimer>;
  onClick?: () => void;
  className?: string;
}) {
  const contextTimer = useClassroomTimerContext();
  const timer = externalTimer ?? contextTimer;

  if (!timer) return null;

  const { mode, status, remaining, elapsed } = timer;
  const isRunning = status === "running";
  const isCompleted = mode === "countdown" && status === "completed";
  const isUrgent = mode === "countdown" && remaining <= 10 && remaining > 0 && isRunning;

  const timeString = formatTimerDisplay(mode === "countdown" ? remaining : elapsed);

  return (
    <button
      type="button"
      onClick={onClick ?? (() => timer.openBigScreen())}
      aria-label={`${strings.classroomTimer.title}: ${timeString}`}
      className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-mono font-semibold transition-colors ${
        isCompleted
          ? "border-error bg-error/15 text-error animate-pulse"
          : isUrgent
            ? "border-error text-error"
            : isRunning
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-strong bg-elevated text-fg-secondary"
      } ${className}`}
    >
      <span
        className={`size-2 rounded-full ${
          isCompleted
            ? "bg-error"
            : isRunning
              ? "bg-emerald-500 animate-pulse"
              : "bg-neutral-500"
        }`}
        aria-hidden="true"
      />
      <span className="tabular-nums">{isCompleted ? strings.classroomTimer.timesUp : timeString}</span>
    </button>
  );
}
