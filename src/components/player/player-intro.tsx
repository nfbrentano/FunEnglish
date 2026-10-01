"use client";

import { Play } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { LevelPill } from "@/components/ui/level-pill";
import { getCategory } from "@/lib/activities/categories";
import type { PlayableActivity } from "@/lib/player/load-activity";
import type { PlayerSettings, RegisteredPlugin } from "@/lib/player/types";
import { strings } from "@/lib/strings";

const TIMER_OPTIONS = [null, 10, 20, 30, 60] as const;
const TEAM_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

type PlayerIntroProps = {
  activity: PlayableActivity;
  plugin: RegisteredPlugin | undefined;
  settings: PlayerSettings;
  onSettingsChange: (settings: PlayerSettings) => void;
  onStart: (() => void) | null;
  /** Replaces the options and Start button (unsupported type, invalid content). */
  message?: ReactNode;
};

const fieldClasses =
  "min-h-11 rounded-full border border-border-strong bg-elevated px-4 text-sm text-fg hover:border-accent";

/** Title, category, level, instructions and pre-game options. Rendered in the static HTML (SEO). */
export function PlayerIntro({
  activity,
  plugin,
  settings,
  onSettingsChange,
  onStart,
  message,
}: PlayerIntroProps) {
  const category = getCategory(activity.category)!;
  const supports = plugin?.supports;
  const set = (patch: Partial<PlayerSettings>) => onSettingsChange({ ...settings, ...patch });

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-10 text-center">
      <div className="flex items-center gap-2 text-sm text-fg-secondary">
        <CategoryIcon category={category} />
        <span>{category.name}</span>
        {plugin && <span aria-hidden="true">·</span>}
        {plugin && <span>{plugin.label}</span>}
      </div>
      <h1 className="font-display text-5xl leading-tight font-medium md:text-6xl">
        {activity.title}
      </h1>
      <LevelPill min={activity.levelMin} max={activity.levelMax} />
      <p className="text-lg text-fg-secondary">{activity.description}</p>
      {plugin && <p className="text-fg-secondary">{plugin.instructions}</p>}

      {message ?? (
        <>
          {(supports?.shuffle || supports?.teams || supports?.timer) && (
            <fieldset className="flex w-full flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-secondary p-4">
              <legend className="px-2 text-xs tracking-widest text-muted uppercase">
                {strings.player.options}
              </legend>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {supports.shuffle && (
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.shuffle}
                      onChange={(event) => set({ shuffle: event.target.checked })}
                      className="size-4 accent-(--accent)"
                    />
                    {strings.player.shuffle}
                  </label>
                )}
                {supports.teams && (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">{strings.player.teams}</span>
                    <select
                      value={settings.teams}
                      onChange={(event) => set({ teams: Number(event.target.value) })}
                      className={fieldClasses}
                    >
                      {TEAM_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? strings.player.noTeams : strings.player.teamCount(n)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {supports.timer && (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">{strings.player.timer}</span>
                    <select
                      value={settings.timerSeconds ?? ""}
                      onChange={(event) =>
                        set({
                          timerSeconds: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                      className={fieldClasses}
                    >
                      {TIMER_OPTIONS.map((n) => (
                        <option key={n ?? "none"} value={n ?? ""}>
                          {n === null ? strings.player.noTimer : strings.player.seconds(n)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </fieldset>
          )}
          {onStart && (
            <Button onClick={onStart} className="min-h-14 px-10 text-base" autoFocus>
              <Play aria-hidden="true" className="size-5" />
              {strings.player.start}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
