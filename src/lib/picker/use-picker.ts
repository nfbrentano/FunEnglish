"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pickRandom } from "./crypto-random";
import {
  createBalancedGroups,
  createGroupsBySize,
  formatGroupsAsText,
} from "./group-maker";
import {
  ClassroomPickerProps,
  GroupMode,
  PickerHistoryEntry,
  PICKER_CUSTOM_NAMES_STORAGE_KEY,
  PICKER_HISTORY_STORAGE_KEY,
  PICKER_NO_REPEAT_STORAGE_KEY,
  PICKER_PICKED_CYCLE_STORAGE_KEY,
} from "./types";

const DEFAULT_NAMES = [
  "Emma",
  "Lucas",
  "Sophia",
  "Liam",
  "Olivia",
  "Noah",
  "Ava",
  "Ethan",
];

const SPIN_DURATION_MS = 2500; // 2.5s (within 2-4s as required by RF01)

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota/private mode errors
  }
}

export function usePicker({
  students,
  hasActiveSession = false,
}: ClassroomPickerProps = {}) {
  // Freeform custom names from localStorage or default
  const [customNamesRaw, setCustomNamesRaw] = useState<string>(() => {
    const stored = safeGetStorage(PICKER_CUSTOM_NAMES_STORAGE_KEY);
    return stored !== null ? stored : DEFAULT_NAMES.join("\n");
  });

  // Source selection: roster vs custom
  const [useCustomNames, setUseCustomNames] = useState<boolean>(() => {
    return !hasActiveSession && (!students || students.length === 0);
  });

  // Parsed custom names
  const parsedCustomNames = useMemo(() => {
    return customNamesRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [customNamesRaw]);

  // Active names list
  const activeNames = useMemo(() => {
    if (hasActiveSession && students && students.length > 0 && !useCustomNames) {
      return students.map((s) => s.trim()).filter(Boolean);
    }
    return parsedCustomNames;
  }, [hasActiveSession, students, useCustomNames, parsedCustomNames]);

  // "Don't repeat until everyone is picked"
  const [noRepeat, setNoRepeatState] = useState<boolean>(() => {
    const stored = safeGetStorage(PICKER_NO_REPEAT_STORAGE_KEY);
    return stored === "true";
  });

  const setNoRepeat = useCallback((val: boolean) => {
    setNoRepeatState(val);
    safeSetStorage(PICKER_NO_REPEAT_STORAGE_KEY, String(val));
  }, []);

  // Cycle picked names (students already picked in the current cycle)
  const [cyclePickedNames, setCyclePickedNamesState] = useState<string[]>(() => {
    const stored = safeGetStorage(PICKER_PICKED_CYCLE_STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const setCyclePickedNames = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setCyclePickedNamesState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      safeSetStorage(PICKER_PICKED_CYCLE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // History of recent 20 picks (RF06)
  const [history, setHistoryState] = useState<PickerHistoryEntry[]>(() => {
    const stored = safeGetStorage(PICKER_HISTORY_STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
    } catch {
      return [];
    }
  });

  const addHistoryEntry = useCallback((name: string) => {
    const entry: PickerHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      timestamp: Date.now(),
    };
    setHistoryState((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      safeSetStorage(PICKER_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistoryState([]);
    safeSetStorage(PICKER_HISTORY_STORAGE_KEY, JSON.stringify([]));
  }, []);

  // Remaining eligible names for spinning
  const eligibleNames = useMemo(() => {
    if (!noRepeat) return activeNames;
    return activeNames.filter((n) => !cyclePickedNames.includes(n));
  }, [activeNames, noRepeat, cyclePickedNames]);

  // Notice banner (e.g. "Everyone has been picked — starting over")
  const [notice, setNotice] = useState<string | null>(null);

  // Winner state & animation
  const [winner, setWinner] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isBigScreen, setIsBigScreen] = useState(false);

  // Group Maker state
  const [groupMode, setGroupMode] = useState<GroupMode>("count");
  const [groupCount, setGroupCount] = useState(3);
  const [groupSize, setGroupSize] = useState(3);
  const [groups, setGroups] = useState<string[][]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [copiedGroups, setCopiedGroups] = useState(false);

  // Timer ref to clean up on unmount
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  // Update custom names handler (RF03, CA03)
  const setCustomNames = useCallback((text: string) => {
    setCustomNamesRaw(text);
    safeSetStorage(PICKER_CUSTOM_NAMES_STORAGE_KEY, text);
  }, []);

  // Reset cycle manually (RF02)
  const resetCycle = useCallback(() => {
    setCyclePickedNames([]);
    setNotice(null);
  }, [setCyclePickedNames]);

  // Check prefers-reduced-motion (RNF02, CA08)
  const isReducedMotion = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Core spin function (RF01, RF02, CA01, CA02, CA07, CA08, CA09)
  const spin = useCallback(
    (skipTarget?: string) => {
      if (isSpinning) return;
      if (activeNames.length < 2) return;

      let currentPool = eligibleNames;
      let didAutoReplenish = false;

      // CA02: When "no repeat" is active and all names were picked,
      // replenish wheel automatically on next spin with notice
      if (noRepeat && currentPool.length === 0) {
        currentPool = activeNames;
        setCyclePickedNames([]);
        setNotice("Everyone has been picked — starting over");
        didAutoReplenish = true;
      } else if (!didAutoReplenish) {
        setNotice(null);
      }

      // If skipping, filter out the skipped candidate if possible
      let poolForPick = currentPool;
      if (skipTarget && currentPool.length > 1) {
        poolForPick = currentPool.filter((n) => n !== skipTarget);
      }

      const pickedResult = pickRandom(poolForPick);
      if (!pickedResult) return;

      const chosenName = pickedResult.item;

      // Find index on the wheel slices
      const wheelSlices = currentPool;
      const sliceIndex = wheelSlices.indexOf(chosenName);
      const totalSlices = wheelSlices.length;
      const sliceAngle = 360 / totalSlices;

      // Top pointer is at 270 degrees in SVG coordinates.
      // Slice center angle = (sliceIndex + 0.5) * sliceAngle
      // Target rotation brings slice center to top pointer
      const sliceCenter = (sliceIndex + 0.5) * sliceAngle;
      const targetPointerAngle = 270;
      let targetWheelAngle = targetPointerAngle - sliceCenter;
      while (targetWheelAngle < 0) targetWheelAngle += 360;

      // Add 5-7 full spins (clockwise) beyond current rotation
      const fullSpins = 360 * 6;
      const nextRotation =
        wheelRotation +
        fullSpins +
        ((targetWheelAngle - (wheelRotation % 360) + 360) % 360);

      const reducedMotion = isReducedMotion();

      if (reducedMotion) {
        // CA08: no spin animation
        setWheelRotation(nextRotation);
        setWinner(chosenName);
        addHistoryEntry(chosenName);
        if (noRepeat) {
          setCyclePickedNames((prev) =>
            prev.includes(chosenName) ? prev : [...prev, chosenName]
          );
        }
        return;
      }

      setIsSpinning(true);
      setWinner(null);
      setWheelRotation(nextRotation);

      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      spinTimerRef.current = setTimeout(() => {
        setIsSpinning(false);
        setWinner(chosenName);
        addHistoryEntry(chosenName);
        if (noRepeat) {
          setCyclePickedNames((prev) =>
            prev.includes(chosenName) ? prev : [...prev, chosenName]
          );
        }
      }, SPIN_DURATION_MS);
    },
    [
      isSpinning,
      activeNames,
      eligibleNames,
      noRepeat,
      wheelRotation,
      isReducedMotion,
      addHistoryEntry,
      setCyclePickedNames,
    ]
  );

  // Skip current winner (RF08, CA06)
  const skip = useCallback(() => {
    if (!winner) return;
    const skippedName = winner;

    // Remove skippedName from cyclePickedNames so they remain eligible
    if (noRepeat) {
      setCyclePickedNames((prev) => prev.filter((n) => n !== skippedName));
    }

    setWinner(null);
    // Spin again immediately without counting skipped student as picked
    spin(skippedName);
  }, [winner, noRepeat, setCyclePickedNames, spin]);

  // Generate groups (RF04, RF05, CA04, CA09)
  const generateGroups = useCallback(() => {
    setGroupError(null);
    if (activeNames.length === 0) {
      setGroups([]);
      return;
    }

    try {
      if (groupMode === "count") {
        if (groupCount > activeNames.length) {
          setGroupError(`Not enough students for ${groupCount} groups`);
          setGroups([]);
          return;
        }
        const res = createBalancedGroups(activeNames, groupCount);
        setGroups(res);
      } else {
        const res = createGroupsBySize(activeNames, groupSize);
        setGroups(res);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error generating groups";
      setGroupError(msg);
      setGroups([]);
    }
  }, [activeNames, groupMode, groupCount, groupSize]);

  // Copy groups to clipboard
  const copyGroups = useCallback(async () => {
    if (groups.length === 0) return;
    const text = formatGroupsAsText(groups);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // fallback
    }
    setCopiedGroups(true);
    setTimeout(() => setCopiedGroups(false), 2000);
  }, [groups]);

  const computedGroupError = useMemo(() => {
    if (groupMode === "count" && groupCount > activeNames.length) {
      return `Not enough students for ${groupCount} groups`;
    }
    return groupError;
  }, [groupMode, groupCount, activeNames.length, groupError]);

  return {
    activeNames,
    customNamesRaw,
    setCustomNames,
    useCustomNames,
    setUseCustomNames,
    hasRoster: Boolean(hasActiveSession && students && students.length > 0),
    noRepeat,
    setNoRepeat,
    cyclePickedNames,
    eligibleNames,
    resetCycle,
    notice,
    winner,
    isSpinning,
    wheelRotation,
    spin,
    skip,
    isBigScreen,
    setIsBigScreen,
    history,
    clearHistory,
    // Groups
    groupMode,
    setGroupMode,
    groupCount,
    setGroupCount,
    groupSize,
    setGroupSize,
    groups,
    groupError: computedGroupError,
    generateGroups,
    copyGroups,
    copiedGroups,
  };
}
