"use client";

import { Check, ExternalLink, Lightbulb, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { isBlankCorrect, parseBlanks, withGaps, type BlankSegment } from "@/lib/activities/blanks";
import type { fillBlanksContentSchema } from "@/lib/activities/schema/content";
import type { PluginProps, ReviewItem } from "@/lib/player/types";
import { strings } from "@/lib/strings";
import { ActivityMedia } from "../../media/activity-media";
import { shuffled } from "../shuffle";

type FillBlanksContent = z.infer<typeof fillBlanksContentSchema>;
type Blank = Extract<BlankSegment, { kind: "blank" }>;
type Chip = { id: number; word: string };

const blanksOf = (segments: BlankSegment[]) =>
  segments.filter((s): s is Blank => s.kind === "blank");

function stateClasses(checked: boolean, correct: boolean) {
  if (!checked) return "border-border-strong";
  return correct ? "border-success bg-success/15" : "border-error bg-error/15";
}

/** Fill in the blanks: typing or word bank (SDD/2026-09-30_atividade-completar-lacunas.md). */
export default function FillBlanksPlayer({
  content,
  onProgress,
  onScore,
  onComplete,
}: PluginProps<FillBlanksContent>) {
  const [index, setIndex] = useState(0);
  const item = content.items[index];
  const segments = parseBlanks(item.text);
  const blanks = blanksOf(segments);
  const wordBank = content.mode === "word-bank";

  const [values, setValues] = useState<string[]>(() => blanks.map(() => ""));
  const [bank, setBank] = useState<Chip[]>(() => makeBank(blanks, content.distractors));
  const [placed, setPlaced] = useState<(Chip | null)[]>(() => blanks.map(() => null));
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hint, setHint] = useState(false);
  const totals = useRef({ correct: 0, total: 0, review: [] as ReviewItem[] });
  const firstInput = useRef<HTMLInputElement>(null);

  const last = index === content.items.length - 1;
  const answerAt = (i: number) => (wordBank ? (placed[i]?.word ?? "") : values[i]);
  const results = blanks.map((blank, i) => isBlankCorrect(answerAt(i), blank.answers));

  useEffect(() => {
    onProgress({ current: index + 1, total: content.items.length });
    firstInput.current?.focus();
  }, [index, content.items.length, onProgress]);

  function check() {
    if (checked) return;
    setChecked(true);
    const correct = results.filter(Boolean).length;
    totals.current.correct += correct;
    totals.current.total += blanks.length;
    if (correct > 0) onScore(correct);
    blanks.forEach((blank, i) => {
      if (!results[i]) {
        totals.current.review.push({
          prompt: withGaps(item.text),
          answer: blank.answers[0],
          chosen: answerAt(i) || undefined,
        });
      }
    });
  }

  function next() {
    if (last) {
      const { correct, total, review } = totals.current;
      onComplete({ correct, total, review });
      return;
    }
    const nextBlanks = blanksOf(parseBlanks(content.items[index + 1].text));
    setIndex(index + 1);
    setValues(nextBlanks.map(() => ""));
    setBank(makeBank(nextBlanks, content.distractors));
    setPlaced(nextBlanks.map(() => null));
    setSelectedChip(null);
    setChecked(false);
    setRevealed(false);
    setHint(false);
  }

  function placeInto(blankIndex: number) {
    if (checked) return;
    const current = placed[blankIndex];
    if (current) {
      // Tapping a filled gap sends its word back to the bank.
      setPlaced(placed.map((chip, i) => (i === blankIndex ? null : chip)));
      setBank([...bank, current]);
      return;
    }
    const chip = bank.find((c) => c.id === selectedChip);
    if (!chip) return;
    setPlaced(placed.map((c, i) => (i === blankIndex ? chip : c)));
    setBank(bank.filter((c) => c.id !== chip.id));
    setSelectedChip(null);
  }

  let inputCount = 0;

  return (
    <div className="flex flex-1 flex-col items-center gap-6">
      {item.media && <ActivityMedia media={item.media} />}
      {content.credit && (
        <a
          href={content.credit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-fg-secondary hover:text-accent"
        >
          {content.credit.title} – {content.credit.artist}
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      )}

      <form
        className="w-full max-w-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (checked) next();
          else check();
        }}
      >
        <p className="text-center font-display text-3xl leading-[2.2] md:text-4xl">
          {segments.map((segment, i) => {
            if (segment.kind === "text") return <Fragment key={i}>{segment.text}</Fragment>;
            const b = segment.index;
            const correct = results[b];
            const shown = revealed && !correct ? segment.answers[0] : null;
            const width = `${Math.max(...segment.answers.map((a) => a.length), 3) + 2}ch`;
            if (wordBank) {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => placeInto(b)}
                  aria-label={strings.blanks.gap(b + 1, placed[b]?.word)}
                  style={{ minWidth: width }}
                  className={`mx-1 inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-dashed px-3 align-middle font-sans text-xl ${stateClasses(checked, correct)}`}
                >
                  {shown ?? placed[b]?.word ?? " "}
                </button>
              );
            }
            const ref = inputCount++ === 0 ? firstInput : undefined;
            return (
              <span key={i} className="relative mx-1 inline-block align-middle">
                <input
                  ref={ref}
                  aria-label={strings.blanks.gap(b + 1)}
                  value={shown ?? values[b]}
                  readOnly={checked}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  onChange={(event) =>
                    setValues(values.map((v, j) => (j === b ? event.target.value : v)))
                  }
                  style={{ width }}
                  className={`min-h-12 rounded-xl border-2 bg-elevated px-2 text-center font-sans text-xl text-fg ${stateClasses(checked, correct)}`}
                />
                {checked && (
                  <span className="absolute -top-2 -right-2">
                    {correct ? (
                      <Check
                        aria-label={strings.blanks.right}
                        className="size-5 rounded-full bg-success text-primary"
                      />
                    ) : (
                      <X
                        aria-label={strings.blanks.wrong}
                        className="size-5 rounded-full bg-error text-primary"
                      />
                    )}
                  </span>
                )}
              </span>
            );
          })}
        </p>

        {wordBank && !checked && (
          <div
            aria-label={strings.blanks.bank}
            role="group"
            className="mt-6 flex flex-wrap justify-center gap-2"
          >
            {bank.map((chip) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={selectedChip === chip.id}
                onClick={() => setSelectedChip(selectedChip === chip.id ? null : chip.id)}
                className={`min-h-11 rounded-full border px-4 text-lg transition-colors ${
                  selectedChip === chip.id
                    ? "border-accent bg-accent-muted"
                    : "border-border-strong hover:border-accent"
                }`}
              >
                {chip.word}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {item.hint && !checked && (
            <Button variant="ghost" onClick={() => setHint(true)} disabled={hint}>
              <Lightbulb aria-hidden="true" className="size-4" />
              {hint ? item.hint : strings.blanks.showHint}
            </Button>
          )}
          {!checked && <Button type="submit">{strings.quiz.check}</Button>}
          {checked && !revealed && results.some((r) => !r) && (
            <Button variant="secondary" onClick={() => setRevealed(true)}>
              {strings.blanks.showAnswer}
            </Button>
          )}
          {checked && (
            <Button type="submit" autoFocus>
              {last ? strings.quiz.seeResults : strings.quiz.next}
            </Button>
          )}
        </div>
      </form>

      <p role="status" aria-live="polite" className="sr-only">
        {checked ? strings.blanks.score(results.filter(Boolean).length, blanks.length) : ""}
      </p>
    </div>
  );
}

function makeBank(blanks: Blank[], distractors: string[]): Chip[] {
  const words = [...blanks.map((b) => b.answers[0]), ...distractors];
  return shuffled(words.map((word, id) => ({ id, word })));
}
