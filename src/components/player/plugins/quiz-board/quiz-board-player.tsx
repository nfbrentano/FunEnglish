"use client";

import { ArrowLeft, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import type { quizBoardContentSchema } from "@/lib/activities/schema/content";
import type { PluginProps } from "@/lib/player/types";
import { strings } from "@/lib/strings";
import { ActivityMedia } from "../../media/activity-media";

type QuizBoardContent = z.infer<typeof quizBoardContentSchema>;
type Cell = { category: number; clue: number };

const ADJUST_STEP = 100;
const key = ({ category, clue }: Cell) => `${category}:${clue}`;

/** Team game board, a.k.a. "Quiz Board" (SDD/2026-09-30_atividade-jogo-jeopardy.md). */
export default function QuizBoardPlayer({
  content,
  settings,
  onProgress,
  onScore,
  onComplete,
}: PluginProps<QuizBoardContent>) {
  const penalty = settings.extra.penalty === true;
  const teams = settings.teamNames;
  const total = content.categories.reduce((sum, c) => sum + c.clues.length, 0);
  const [used, setUsed] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<Cell | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    onProgress({ current: used.size, total });
  }, [used.size, total, onProgress]);

  function finish(usedCount: number, answeredCount: number) {
    onComplete({
      correct: answeredCount,
      total: usedCount,
      headline: strings.board.played(usedCount, total),
    });
  }

  function close(winner: number | null) {
    if (!open) return;
    const clue = content.categories[open.category].clues[open.clue];
    if (winner !== null) onScore(clue.value, winner);
    const nextUsed = new Set(used).add(key(open));
    const nextAnswered = answered + (winner !== null ? 1 : 0);
    setUsed(nextUsed);
    setAnswered(nextAnswered);
    setOpen(null);
    setRevealed(false);
    if (nextUsed.size === total) finish(nextUsed.size, nextAnswered);
  }

  if (open) {
    const category = content.categories[open.category];
    const clue = category.clues[open.clue];
    return (
      <div className="flex flex-1 flex-col items-center gap-6 text-center">
        <p className="text-sm tracking-widest text-muted uppercase">
          {category.name} · {clue.value}
        </p>
        <h2 className="max-w-4xl font-display text-4xl leading-snug font-medium md:text-5xl">
          {clue.question}
        </h2>
        {clue.media && <ActivityMedia media={clue.media} />}
        {!revealed ? (
          <Button onClick={() => setRevealed(true)} autoFocus className="min-h-14 px-8 text-base">
            {strings.board.showAnswer}
          </Button>
        ) : (
          <>
            <p role="status" className="font-display text-4xl text-accent md:text-5xl">
              {clue.answer}
            </p>
            <p className="text-sm text-fg-secondary">{strings.board.whoGotIt}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {teams.map((name, team) => (
                <div key={team} className="flex gap-1">
                  <Button onClick={() => close(team)}>
                    {name} +{clue.value}
                  </Button>
                  {penalty && (
                    <Button
                      variant="secondary"
                      aria-label={strings.board.penalize(name, clue.value)}
                      onClick={() => onScore(-clue.value, team)}
                    >
                      −{clue.value}
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" onClick={() => close(null)}>
                {strings.board.noOne}
              </Button>
            </div>
          </>
        )}
        <Button variant="ghost" onClick={() => setOpen(null)} className="mt-auto">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {strings.board.backToBoard}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div
        role="grid"
        aria-label={strings.board.board}
        className="grid gap-2 md:gap-3"
        style={{ gridTemplateColumns: `repeat(${content.categories.length}, minmax(0, 1fr))` }}
      >
        <div role="row" className="contents">
          {content.categories.map((category) => (
            <div
              key={category.name}
              role="columnheader"
              className="flex min-h-14 items-center justify-center rounded-xl bg-accent-muted p-2 text-center font-display text-lg font-medium md:text-2xl"
            >
              {category.name}
            </div>
          ))}
        </div>
        {Array.from(
          { length: Math.max(...content.categories.map((c) => c.clues.length)) },
          (_, row) => (
            <div key={row} role="row" className="contents">
              {content.categories.map((category, c) => {
                const clue = category.clues[row];
                if (!clue) return <div key={c} role="gridcell" />;
                const cell = { category: c, clue: row };
                const isUsed = used.has(key(cell));
                return (
                  <div key={c} role="gridcell">
                    <button
                      type="button"
                      disabled={isUsed}
                      aria-label={strings.board.cell(category.name, clue.value, isUsed)}
                      onClick={() => setOpen(cell)}
                      className="flex h-16 w-full items-center justify-center rounded-xl border border-border-strong bg-elevated font-display text-3xl text-accent transition-colors hover:border-accent hover:bg-accent-muted disabled:cursor-default disabled:border-border-subtle disabled:bg-secondary disabled:text-transparent md:h-20 md:text-4xl"
                    >
                      {clue.value}
                    </button>
                  </div>
                );
              })}
            </div>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-fg-secondary">{strings.board.adjust}</span>
          {teams.map((name, team) => (
            <span
              key={team}
              className="flex items-center gap-1 rounded-full border border-border-subtle py-1 pr-1 pl-3"
            >
              {name}
              <button
                type="button"
                aria-label={strings.board.adjustBy(name, -ADJUST_STEP)}
                onClick={() => onScore(-ADJUST_STEP, team)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-elevated"
              >
                −
              </button>
              <button
                type="button"
                aria-label={strings.board.adjustBy(name, ADJUST_STEP)}
                onClick={() => onScore(ADJUST_STEP, team)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-elevated"
              >
                +
              </button>
            </span>
          ))}
        </div>
        <Button variant="secondary" onClick={() => finish(used.size, answered)}>
          <Flag aria-hidden="true" className="size-4" />
          {strings.board.endGame}
        </Button>
      </div>
    </div>
  );
}
