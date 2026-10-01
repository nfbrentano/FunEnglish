import type { ComponentType } from "react";
import type { z } from "zod";

export type PlayerSettings = {
  shuffle: boolean;
  /** 1 = no teams. */
  teams: number;
  /** Seconds per item; null = no timer. */
  timerSeconds: number | null;
};

export type Progress = {
  current: number;
  total: number;
  /** Team whose turn it is (0-based), for team play. */
  activeTeam?: number;
};

export type ReviewItem = { prompt: string; answer: string; chosen?: string };

export type ActivityResult = {
  correct: number;
  total: number;
  /** Items to go over again (e.g. wrong answers). */
  review?: ReviewItem[];
};

/** What the player shell gives every activity type. */
export type PluginProps<TContent> = {
  content: TContent;
  settings: PlayerSettings;
  onProgress: (progress: Progress) => void;
  /** Adds points to a team (0 when playing without teams). */
  onScore: (delta: number, team?: number) => void;
  onComplete: (result: ActivityResult) => void;
};

export type PlayerPlugin<TContent = unknown> = {
  /** Shown to users, e.g. "Quiz". */
  label: string;
  instructions: string;
  schema: z.ZodType<TContent>;
  supports: { scoring: boolean; teams: boolean; timer: boolean; shuffle: boolean };
  defaults?: Partial<PlayerSettings>;
  Component: ComponentType<PluginProps<TContent>>;
};

/** A plugin as stored in the registry (each entry is checked against its own content type first). */
export type RegisteredPlugin = Omit<PlayerPlugin, "schema" | "Component"> & {
  schema: z.ZodType;
  Component: ComponentType<PluginProps<never>>;
};

export type PluginRegistry = Record<string, RegisteredPlugin | undefined>;

/** Type-checks a plugin against its own content type, then stores it in the generic registry shape. */
export function definePlugin<TContent>(plugin: PlayerPlugin<TContent>): RegisteredPlugin {
  return plugin as unknown as RegisteredPlugin;
}
