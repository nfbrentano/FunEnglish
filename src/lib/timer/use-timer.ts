"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initAudioContext, playAlarmSound } from "./audio";

export type TimerMode = "countdown" | "stopwatch";
export type TimerStatus = "idle" | "running" | "paused" | "completed";

export const TIMER_PRESETS = [
  { label: "30 s", seconds: 30 },
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
] as const;

export function formatTimerDisplay(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function parseCustomTime(input: string): {
  valid: boolean;
  seconds: number;
  error?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, seconds: 0 };
  }

  // Accepts mm:ss or m:ss format
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { valid: false, seconds: 0, error: "Enter a time up to 99:59" };
  }

  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);

  if (mins > 99 || secs >= 60 || (mins === 0 && secs === 0)) {
    return { valid: false, seconds: 0, error: "Enter a time up to 99:59" };
  }

  return { valid: true, seconds: mins * 60 + secs };
}

export type UseTimerOptions = {
  initialMode?: TimerMode;
  initialDuration?: number;
  onComplete?: () => void;
};

export function useTimer({
  initialMode = "countdown",
  initialDuration = 120,
  onComplete,
}: UseTimerOptions = {}) {
  const [mode, setMode] = useState<TimerMode>(initialMode);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [duration, setDuration] = useState<number>(initialDuration);
  const [remaining, setRemaining] = useState<number>(initialDuration);
  const [elapsed, setElapsed] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBigScreen, setIsBigScreen] = useState<boolean>(false);

  // References for drift-free Date.now() timing (RNF01)
  const startTimeRef = useRef<number | null>(null);
  const targetDurationMsRef = useRef<number>(initialDuration * 1000);
  const accumulatedElapsedMsRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Sync / tick logic
  const syncTime = useCallback(() => {
    if (status !== "running" || startTimeRef.current === null) return;

    const totalElapsedMs = accumulatedElapsedMsRef.current + (Date.now() - startTimeRef.current);

    if (mode === "countdown") {
      const remainingMs = targetDurationMsRef.current - totalElapsedMs;
      // When 1000ms has elapsed, remaining is duration - 1
      const elapsedSecs = Math.floor(totalElapsedMs / 1000);
      const totalSecs = Math.round(targetDurationMsRef.current / 1000);
      const left = Math.max(0, totalSecs - elapsedSecs);

      setRemaining(left);

      if (remainingMs <= 0) {
        setStatus("completed");
        setRemaining(0);
        startTimeRef.current = null;
        accumulatedElapsedMsRef.current = targetDurationMsRef.current;
        playAlarmSound(isMuted);
        onCompleteRef.current?.();
      }
    } else {
      setElapsed(Math.floor(totalElapsedMs / 1000));
    }
  }, [mode, status, isMuted]);

  // Timer interval & tab visibility sync (CA07)
  useEffect(() => {
    if (status !== "running") return;

    // Run sync immediately to guarantee freshness
    syncTime();

    // 100ms interval for responsive UI
    const intervalId = setInterval(syncTime, 100);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncTime();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, syncTime]);

  const startCountdown = useCallback(
    (seconds?: number) => {
      initAudioContext();
      const secs = seconds !== undefined ? seconds : remaining > 0 ? remaining : duration;
      const targetDuration = seconds !== undefined ? seconds : duration;
      setDuration(targetDuration);
      setRemaining(secs);

      targetDurationMsRef.current = secs * 1000;
      accumulatedElapsedMsRef.current = 0;
      startTimeRef.current = Date.now();
      setStatus("running");
    },
    [remaining, duration],
  );

  const startStopwatch = useCallback(() => {
    initAudioContext();
    startTimeRef.current = Date.now();
    setStatus("running");
  }, []);

  const start = useCallback(() => {
    if (mode === "countdown") {
      startCountdown();
    } else {
      startStopwatch();
    }
  }, [mode, startCountdown, startStopwatch]);

  const pause = useCallback(() => {
    if (status !== "running") return;

    if (startTimeRef.current !== null) {
      accumulatedElapsedMsRef.current += Date.now() - startTimeRef.current;
      startTimeRef.current = null;
    }

    if (mode === "countdown") {
      const elapsedSecs = Math.floor(accumulatedElapsedMsRef.current / 1000);
      const totalSecs = Math.round(targetDurationMsRef.current / 1000);
      setRemaining(Math.max(0, totalSecs - elapsedSecs));
    } else {
      setElapsed(Math.floor(accumulatedElapsedMsRef.current / 1000));
    }

    setStatus("paused");
  }, [mode, status]);

  const resume = useCallback(() => {
    if (status !== "paused") return;
    initAudioContext();
    startTimeRef.current = Date.now();
    setStatus("running");
  }, [status]);

  const reset = useCallback(() => {
    startTimeRef.current = null;
    accumulatedElapsedMsRef.current = 0;
    setStatus("idle");

    if (mode === "countdown") {
      targetDurationMsRef.current = duration * 1000;
      setRemaining(duration);
    } else {
      setElapsed(0);
    }
  }, [mode, duration]);

  const selectPreset = useCallback(
    (seconds: number) => {
      initAudioContext();
      setMode("countdown");
      setDuration(seconds);
      setRemaining(seconds);
      targetDurationMsRef.current = seconds * 1000;
      accumulatedElapsedMsRef.current = 0;
      startTimeRef.current = Date.now();
      setStatus("running");
    },
    [],
  );

  const setCustomCountdown = useCallback(
    (seconds: number, autoStart = false) => {
      setMode("countdown");
      setDuration(seconds);
      setRemaining(seconds);
      targetDurationMsRef.current = seconds * 1000;
      accumulatedElapsedMsRef.current = 0;

      if (autoStart) {
        initAudioContext();
        startTimeRef.current = Date.now();
        setStatus("running");
      } else {
        startTimeRef.current = null;
        setStatus("idle");
      }
    },
    [],
  );

  const switchMode = useCallback(
    (newMode: TimerMode) => {
      startTimeRef.current = null;
      accumulatedElapsedMsRef.current = 0;
      setMode(newMode);
      setStatus("idle");
      if (newMode === "countdown") {
        targetDurationMsRef.current = duration * 1000;
        setRemaining(duration);
      } else {
        setElapsed(0);
      }
    },
    [duration],
  );

  const adjustCountdown = useCallback(
    (deltaSeconds: number) => {
      if (mode !== "countdown") return;

      const deltaMs = deltaSeconds * 1000;
      targetDurationMsRef.current = Math.max(0, targetDurationMsRef.current + deltaMs);

      if (deltaSeconds > 0) {
        setDuration((d) => Math.max(d, Math.round(targetDurationMsRef.current / 1000)));
      }

      const totalElapsed =
        accumulatedElapsedMsRef.current +
        (status === "running" && startTimeRef.current !== null
          ? Date.now() - startTimeRef.current
          : 0);

      const remainingMs = targetDurationMsRef.current - totalElapsed;

      if (remainingMs <= 0) {
        setStatus("completed");
        setRemaining(0);
        startTimeRef.current = null;
        playAlarmSound(isMuted);
        onCompleteRef.current?.();
      } else {
        const elapsedSecs = Math.floor(totalElapsed / 1000);
        const totalSecs = Math.round(targetDurationMsRef.current / 1000);
        setRemaining(Math.max(0, totalSecs - elapsedSecs));
      }
    },
    [mode, status, isMuted],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const openBigScreen = useCallback(() => {
    setIsBigScreen(true);
  }, []);

  const closeBigScreen = useCallback(() => {
    setIsBigScreen(false);
  }, []);

  return {
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
  };
}
