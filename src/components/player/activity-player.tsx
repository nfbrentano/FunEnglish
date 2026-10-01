"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsAdmin } from "@/lib/admin/use-is-admin";
import type { PlayableActivity } from "@/lib/player/load-activity";
import { useFullscreen } from "@/lib/player/fullscreen";
import { PLUGINS } from "@/lib/player/registry";
import type {
  ActivityResult,
  PlayerSettings,
  PluginRegistry,
  Progress,
  RegisteredPlugin,
} from "@/lib/player/types";
import { useShareLink } from "@/lib/share/use-share-link";
import { strings } from "@/lib/strings";
import { useStudentMode } from "@/lib/student-mode";
import { useAuth } from "@/lib/auth/use-auth";
import { firestoreHistory, type HistoryRepository } from "@/lib/history/history";
import { PlayerErrorBoundary } from "./error-boundary";
import { PlayerIntro, withTeamCount } from "./player-intro";
import { PlayerMessage } from "./player-message";
import { PlayerResults } from "./player-results";
import { PlayerTopBar } from "./player-top-bar";

type Phase = "intro" | "playing" | "results";

const BASE_SETTINGS: PlayerSettings = {
  shuffle: false,
  teams: 1,
  teamNames: [],
  timerSeconds: null,
  extra: {},
};

function initialSettings(plugin: RegisteredPlugin | undefined): PlayerSettings {
  const extra = Object.fromEntries(
    (plugin?.options ?? []).map((option) => [option.id, option.default]),
  );
  const settings = { ...BASE_SETTINGS, ...plugin?.defaults, extra };
  return withTeamCount(settings, Math.max(settings.teams, plugin?.minTeams ?? 1));
}

/** Blank names fall back to "Team N". */
const teamLabels = (settings: PlayerSettings) =>
  settings.teamNames.map((name, i) => name.trim() || strings.player.team(i + 1));

type ActivityPlayerProps = {
  activity: PlayableActivity;
  /** Injectable for tests; defaults to the app's activity types. */
  plugins?: PluginRegistry;
  history?: HistoryRepository;
  /** Called when a game starts (the live refresh stops swapping content from then on). */
  onStart?: () => void;
  /** Shows the admin "Edit activity" link; off inside the editor's preview. */
  editable?: boolean;
};

/** The shell every activity type runs in: intro → playing → results. */
export function ActivityPlayer({
  activity,
  plugins = PLUGINS,
  history = firestoreHistory,
  onStart,
  editable = true,
}: ActivityPlayerProps) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const plugin = plugins[activity.type];
  const parsed = plugin?.schema.safeParse(activity.content);
  const studentMode = useStudentMode();
  const rootRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(rootRef);
  const { share } = useShareLink();

  const [phase, setPhase] = useState<Phase>("intro");
  const [settings, setSettings] = useState<PlayerSettings>(() => initialSettings(plugin));
  const [run, setRun] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [scores, setScores] = useState<number[]>([0]);
  const [result, setResult] = useState<ActivityResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(0);

  const start = useCallback(() => {
    setScores(Array.from({ length: settings.teams }, () => 0));
    setProgress(null);
    setResult(null);
    startedAt.current = Date.now();
    setRun((value) => value + 1);
    setPhase("playing");
    onStart?.();
    // "Recently played" on the dashboard; students on shared links aren't tracked.
    if (user && !studentMode) {
      history
        .record(user.uid, activity.id)
        .catch((error: unknown) => console.warn("Could not save history", error));
    }
  }, [settings.teams, user, studentMode, history, activity.id, onStart]);

  const onScore = useCallback((delta: number, team = 0) => {
    setScores((current) => current.map((score, i) => (i === team ? score + delta : score)));
  }, []);

  const onComplete = useCallback((final: ActivityResult) => {
    setResult(final);
    setSeconds(Math.round((Date.now() - startedAt.current) / 1000));
    setPhase("results");
  }, []);

  // F toggles fullscreen during a game (not while typing).
  useEffect(() => {
    if (phase !== "playing") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey) return;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      void fullscreen.toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, fullscreen]);

  const loadError = (
    <PlayerMessage title={strings.player.loadError}>{strings.player.loadErrorHint}</PlayerMessage>
  );
  const Plugin = plugin?.Component;
  const showScores = plugin?.supports.scoring ? scores : null;

  return (
    <div
      ref={rootRef}
      className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col bg-primary px-4 py-6 [&:fullscreen]:max-w-none [&:fullscreen]:overflow-auto [&:fullscreen]:p-10"
    >
      {phase === "intro" && editable && isAdmin && !studentMode && (
        <div className="flex justify-end">
          <Link
            href={`/admin/edit?id=${encodeURIComponent(activity.id)}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-subtle px-4 text-sm text-fg-secondary hover:border-accent hover:text-fg"
          >
            <Pencil aria-hidden="true" className="size-4" />
            {strings.player.editActivity}
          </Link>
        </div>
      )}
      {phase === "intro" && (
        <PlayerIntro
          activity={activity}
          plugin={plugin}
          settings={settings}
          onSettingsChange={setSettings}
          onStart={plugin && parsed?.success ? start : null}
          message={
            !plugin ? (
              <PlayerMessage title={strings.player.unsupported}>
                {strings.player.unsupportedHint}
              </PlayerMessage>
            ) : !parsed?.success ? (
              loadError
            ) : undefined
          }
        />
      )}

      {phase === "playing" && Plugin && parsed?.success && (
        <div className="flex flex-1 flex-col gap-6">
          <PlayerTopBar
            progress={progress}
            scores={showScores}
            teamNames={teamLabels(settings)}
            fullscreen={fullscreen}
            studentMode={studentMode}
            onRestart={start}
            onShare={() => share({ title: activity.title, path: `/play/${activity.slug}` })}
            activity={activity}
          />
          <PlayerErrorBoundary key={run} fallback={loadError}>
            <Plugin
              content={parsed.data as never}
              settings={{ ...settings, teamNames: teamLabels(settings) }}
              onProgress={setProgress}
              onScore={onScore}
              onComplete={onComplete}
            />
          </PlayerErrorBoundary>
        </div>
      )}

      {phase === "results" && result && (
        <PlayerResults
          result={result}
          scores={showScores}
          teamNames={teamLabels(settings)}
          seconds={seconds}
          studentMode={studentMode}
          onPlayAgain={start}
        />
      )}

      {studentMode && (
        <p className="mt-auto pt-10 text-center text-xs text-muted">{strings.player.madeWith}</p>
      )}
    </div>
  );
}
