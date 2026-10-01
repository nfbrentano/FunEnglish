"use client";

import { RotateCcw, Trophy } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import type { ActivityResult } from "@/lib/player/types";
import { strings } from "@/lib/strings";

type PlayerResultsProps = {
  result: ActivityResult;
  scores: number[] | null;
  teamNames: string[];
  seconds: number;
  studentMode: boolean;
  onPlayAgain: () => void;
};

export function PlayerResults({
  result,
  scores,
  teamNames,
  seconds,
  studentMode,
  onPlayAgain,
}: PlayerResultsProps) {
  const teams = scores && scores.length > 1 ? scores : null;
  const best = teams ? Math.max(...teams) : 0;
  const winners = teams ? teams.flatMap((score, i) => (score === best ? [i] : [])) : [];

  return (
    <section
      aria-labelledby="results-title"
      className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-10 text-center"
    >
      <Trophy aria-hidden="true" className="size-12 text-accent" strokeWidth={1.5} />
      <h2 id="results-title" className="font-display text-5xl font-medium">
        {strings.player.results}
      </h2>
      <p className="text-3xl font-medium">
        {result.headline ?? strings.player.correctOf(result.correct, result.total)}
      </p>
      <p className="text-fg-secondary">
        {strings.player.timeLabel}:{" "}
        <span className="tabular-nums">{strings.player.time(seconds)}</span>
      </p>

      {teams && (
        <div className="w-full space-y-3">
          <p className="font-display text-2xl text-accent">
            {winners.length > 1
              ? strings.player.tie
              : strings.player.winner(teamNames[winners[0]] ?? strings.player.team(winners[0] + 1))}
          </p>
          <ol className="mx-auto max-w-sm space-y-2">
            {teams
              .map((score, i) => ({ score, i }))
              .sort((a, b) => b.score - a.score)
              .map(({ score, i }) => (
                <li
                  key={i}
                  className="flex justify-between rounded-xl border border-border-subtle px-4 py-2"
                >
                  <span>{teamNames[i] ?? strings.player.team(i + 1)}</span>
                  <span className="tabular-nums">{strings.player.points(score)}</span>
                </li>
              ))}
          </ol>
        </div>
      )}

      {result.review && result.review.length > 0 && (
        <div className="w-full space-y-3 text-left">
          <h3 className="font-display text-2xl">{strings.player.review}</h3>
          <ul className="space-y-3">
            {result.review.map((item, i) => (
              <li key={i} className="rounded-xl border border-border-subtle bg-elevated p-4">
                <p className="font-medium">{item.prompt}</p>
                <p className="text-sm text-success">
                  {strings.player.correctAnswer}: {item.answer}
                </p>
                {item.chosen && (
                  <p className="text-sm text-fg-secondary">
                    {strings.player.yourAnswer}: {item.chosen}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={onPlayAgain} autoFocus>
          <RotateCcw aria-hidden="true" className="size-4" />
          {strings.player.playAgain}
        </Button>
        {!studentMode && (
          <ButtonLink href="/activities" variant="secondary">
            {strings.player.backToActivities}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}
