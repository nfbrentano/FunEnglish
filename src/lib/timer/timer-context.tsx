"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTimer, type UseTimerOptions } from "./use-timer";

export type TimerContextType = ReturnType<typeof useTimer>;

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({
  children,
  ...options
}: { children: ReactNode } & UseTimerOptions) {
  const timer = useTimer(options);
  return <TimerContext.Provider value={timer}>{children}</TimerContext.Provider>;
}

export function useClassroomTimerContext(): TimerContextType | null {
  return useContext(TimerContext);
}
