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

const DEFAULT_TIMER_CHOICES = [10, 20, 30, 60];
const MAX_TEAMS = 6;

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

/** Resizes the team list, keeping names already typed. */
export function withTeamCount(settings: PlayerSettings, teams: number): PlayerSettings {
  const teamNames = Array.from(
    { length: teams },
    (_, i) => settings.teamNames[i] ?? strings.player.team(i + 1),
  );
  return { ...settings, teams, teamNames };
}

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
  const minTeams = plugin?.minTeams ?? 1;
  const set = (patch: Partial<PlayerSettings>) => onSettingsChange({ ...settings, ...patch });
  const setExtra = (id: string, value: string | boolean) =>
    set({ extra: { ...settings.extra, [id]: value } });
  const hasOptions =
    supports?.shuffle || supports?.teams || supports?.timer || (plugin?.options?.length ?? 0) > 0;

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
          {hasOptions && (
            <fieldset className="flex w-full flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-secondary p-4">
              <legend className="px-2 text-xs tracking-widest text-muted uppercase">
                {strings.player.options}
              </legend>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {supports?.shuffle && (
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
                {plugin?.options?.map((option) =>
                  option.type === "toggle" ? (
                    <label
                      key={option.id}
                      className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={settings.extra[option.id] === true}
                        onChange={(event) => setExtra(option.id, event.target.checked)}
                        className="size-4 accent-(--accent)"
                      />
                      {option.label}
                    </label>
                  ) : (
                    <label key={option.id} className="flex items-center gap-2 text-sm">
                      <span>{option.label}</span>
                      <select
                        value={String(settings.extra[option.id])}
                        onChange={(event) => setExtra(option.id, event.target.value)}
                        className={fieldClasses}
                      >
                        {option.choices.map((choice) => (
                          <option key={choice.value} value={choice.value}>
                            {choice.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
                {supports?.teams && (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">{strings.player.teams}</span>
                    <select
                      value={settings.teams}
                      onChange={(event) =>
                        onSettingsChange(withTeamCount(settings, Number(event.target.value)))
                      }
                      className={fieldClasses}
                    >
                      {Array.from({ length: MAX_TEAMS - minTeams + 1 }, (_, i) => i + minTeams).map(
                        (n) => (
                          <option key={n} value={n}>
                            {n === 1 ? strings.player.noTeams : strings.player.teamCount(n)}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                )}
                {supports?.timer && (
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
                      {[null, ...(plugin?.timerChoices ?? DEFAULT_TIMER_CHOICES)].map((n) => (
                        <option key={n ?? "none"} value={n ?? ""}>
                          {n === null ? strings.player.noTimer : strings.player.seconds(n)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {settings.teams > 1 && (
                <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
                  {settings.teamNames.map((name, i) => (
                    <input
                      key={i}
                      aria-label={strings.player.teamName(i + 1)}
                      value={name}
                      maxLength={24}
                      onChange={(event) =>
                        set({
                          teamNames: settings.teamNames.map((n, j) =>
                            j === i ? event.target.value : n,
                          ),
                        })
                      }
                      className={`${fieldClasses} w-full`}
                    />
                  ))}
                </div>
              )}
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
