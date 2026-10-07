"use client";

import { useSyncExternalStore } from "react";
import { subscribeToTheme } from "@/lib/theme";
import {
  BOARD_SURFACE_PREFERENCES,
  resolveBoardSurface,
  type BoardSurface,
  type BoardSurfacePreference,
} from "./ink";

/**
 * Teacher preferences for the board, kept in this browser only (RF04, RF17).
 * Storage can be blocked (private mode): reads fall back to the default and writes still update
 * every open board for this page view.
 */

export const BOARD_DOCK_POSITIONS = ["left", "top"] as const;
export type BoardDockPosition = (typeof BOARD_DOCK_POSITIONS)[number];

const SURFACE_KEY = "fun-english:board-surface";
const DOCK_KEY = "fun-english:board-dock";
const CHANGE_EVENT = "fun-english-board-preferences";

const memory: Record<string, string> = {};

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  let value: string | null = memory[key] ?? null;
  try {
    value = window.localStorage.getItem(key) ?? value;
  } catch {
    // Storage blocked: use the in-memory value.
  }
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function write(key: string, value: string): void {
  memory[key] = value;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the in-memory value still applies to this page view.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SURFACE_KEY || event.key === DOCK_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export const readSurfacePreference = () =>
  read<BoardSurfacePreference>(SURFACE_KEY, BOARD_SURFACE_PREFERENCES, "auto");
export const setSurfacePreference = (value: BoardSurfacePreference) => write(SURFACE_KEY, value);

export const readDockPosition = () =>
  read<BoardDockPosition>(DOCK_KEY, BOARD_DOCK_POSITIONS, "left");
export const setDockPosition = (value: BoardDockPosition) => write(DOCK_KEY, value);

const readSiteTheme = () => document.documentElement.dataset.theme ?? "dark";

export function useSurfacePreference(): BoardSurfacePreference {
  return useSyncExternalStore(subscribe, readSurfacePreference, () => "auto");
}

export function useDockPosition(): BoardDockPosition {
  return useSyncExternalStore(subscribe, readDockPosition, () => "left");
}

/** The surface the board paints right now: follows the preference and, on "auto", the site theme. */
export function useBoardSurface(): BoardSurface {
  const preference = useSurfacePreference();
  const siteTheme = useSyncExternalStore(subscribeToTheme, readSiteTheme, () => "dark");
  return resolveBoardSurface(preference, siteTheme);
}
