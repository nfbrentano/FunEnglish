"use client";

import { useSyncExternalStore } from "react";
import { STUDENT_MODE_VALUE } from "./student-mode-script";

const subscribe = () => () => {};
const getSnapshot = () => document.documentElement.dataset.mode === STUDENT_MODE_VALUE;

/** Student mode (shared links): only the activity, no navigation, favorites or sharing. */
export function useStudentMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
