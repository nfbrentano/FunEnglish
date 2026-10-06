import type { ComponentType } from "react";
import type { z } from "zod";

export type PlayerSettings = {
  shuffle: boolean;
  /** 1 = no teams. */
  teams: number;
  /** One per team ("Team 1"… unless renamed). */
  teamNames: string[];
  /** Seconds per item; null = no timer. */
  timerSeconds: number | null;
  /** Values of the plugin's own options, by option id. */
  extra: Record<string, string | boolean>;
};

/** An option a plugin adds to the intro screen (e.g. "Start with: Picture / Word"). */
export type PluginOption =
  | { id: string; label: string; type: "toggle"; default: boolean }
  | {
      id: string;
      label: string;
      type: "select";
      default: string;
      choices: { value: string; label: string }[];
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
  /** Replaces "8 / 10 correct" for types without right/wrong answers (e.g. "12 cards discussed"). */
  headline?: string;
  /** Items to go over again (e.g. wrong answers). */
  review?: ReviewItem[];
  /**
   * What the student answered, one entry per item in content order. Homework sends it to the
   * server, which grades it again (functions/src/helpers/grading.ts) and ignores the score above.
   */
  rawAnswers?: unknown[];
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
  /** Fewest teams the type needs (e.g. 2 for a game board). */
  minTeams?: number;
  /** Timer choices in seconds, when the type has a timer (default 10/20/30/60). */
  timerChoices?: number[];
  options?: PluginOption[];
  defaults?: Partial<Omit<PlayerSettings, "extra" | "teamNames">>;
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
