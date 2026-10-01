"use client";

import { Check, Timer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import type { quizContentSchema } from "@/lib/activities/schema/content";
import type { PluginProps, ReviewItem } from "@/lib/player/types";
import { strings } from "@/lib/strings";
import { ActivityMedia } from "../../media/activity-media";
import { shuffled } from "../shuffle";

type QuizContent = z.infer<typeof quizContentSchema>;
type Question = QuizContent["questions"][number];

const LETTERS = "ABCDEF";

function prepare(questions: Question[], shuffle: boolean): Question[] {
  if (!shuffle) return questions;
  return shuffled(questions).map((q) => ({ ...q, options: shuffled(q.options) }));
}

const correctIndexes = (q: Question) => q.options.flatMap((o, i) => (o.correct ? [i] : []));

type Answer = { chosen: number[]; correct: boolean; timedOut: boolean };

/** Counts down one question; remount it (key) for the next one. */
function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [left, setLeft] = useState(seconds);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    const id = setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          clearInterval(id);
          expire.current();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p
      aria-label={strings.player.timer}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm tabular-nums ${
        left <= 5 ? "border-error text-error" : "border-border-strong text-fg-secondary"
      }`}
    >
      <Timer aria-hidden="true" className="size-4" />
      {strings.quiz.secondsLeft(left)}
    </p>
  );
}

/** Multiple-choice quiz (SDD/2026-09-30_atividade-quiz-multipla-escolha.md). */
export default function QuizPlayer({
  content,
  settings,
  onProgress,
  onScore,
  onComplete,
}: PluginProps<QuizContent>) {
  const [questions] = useState(() => prepare(content.questions, settings.shuffle));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const history = useRef<{ question: Question; answer: Answer }[]>([]);

  const question = questions[index];
  const correct = correctIndexes(question);
  const multiple = correct.length > 1;
  const teams = settings.teams;
  const team = teams > 1 ? index % teams : 0;
  const last = index === questions.length - 1;

  useEffect(() => {
    onProgress({
      current: index + 1,
      total: questions.length,
      activeTeam: teams > 1 ? team : undefined,
    });
  }, [index, questions.length, teams, team, onProgress]);

  function submit(chosen: number[], timedOut = false) {
    if (answer) return;
    const isCorrect =
      !timedOut && chosen.length === correct.length && chosen.every((i) => correct.includes(i));
    const result = { chosen, correct: isCorrect, timedOut };
    setAnswer(result);
    history.current.push({ question, answer: result });
    if (isCorrect) onScore(1, team);
  }

  function next() {
    if (!answer) return;
    if (last) {
      const wrong = history.current.filter((h) => !h.answer.correct);
      const review: ReviewItem[] = wrong.map(({ question: q, answer: a }) => ({
        prompt: q.prompt,
        answer: correctIndexes(q)
          .map((i) => q.options[i].text)
          .join(", "),
        chosen: a.chosen.length ? a.chosen.map((i) => q.options[i].text).join(", ") : undefined,
      }));
      onComplete({
        correct: history.current.length - wrong.length,
        total: questions.length,
        review,
      });
      return;
    }
    setIndex((i) => i + 1);
    setSelected([]);
    setAnswer(null);
  }

  function choose(i: number) {
    if (answer || i >= question.options.length) return;
    if (!multiple) submit([i]);
    else
      setSelected((current) =>
        current.includes(i) ? current.filter((x) => x !== i) : [...current, i],
      );
  }

  // Keyboard: 1–6 or A–F choose, Enter checks / continues, → and Space continue.
  const handlers = useRef({ choose, submit, next, selected, answer, multiple });
  useEffect(() => {
    handlers.current = { choose, submit, next, selected, answer, multiple };
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement).closest("input, textarea, select")) return;
      const h = handlers.current;
      const key = event.key.toLowerCase();
      const option = /^[1-6]$/.test(key) ? Number(key) - 1 : "abcdef".indexOf(key);
      if (option >= 0 && key.length === 1 && !h.answer) {
        event.preventDefault();
        h.choose(option);
      } else if (h.answer && (key === "enter" || key === "arrowright" || key === " ")) {
        event.preventDefault();
        h.next();
      } else if (!h.answer && h.multiple && key === "enter" && h.selected.length > 0) {
        event.preventDefault();
        h.submit(h.selected);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center gap-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {teams > 1 && (
          <p className="rounded-full bg-accent-muted px-3 py-1 text-sm text-accent">
            {strings.quiz.turn(settings.teamNames[team] ?? strings.player.team(team + 1))}
          </p>
        )}
        {settings.timerSeconds && !answer && (
          <Countdown
            key={index}
            seconds={settings.timerSeconds}
            onExpire={() => submit([], true)}
          />
        )}
      </div>

      <h2 className="max-w-3xl text-center font-display text-3xl leading-snug font-medium md:text-4xl">
        {question.prompt}
      </h2>
      {question.media && <ActivityMedia media={question.media} />}
      {multiple && !answer && <p className="text-sm text-fg-secondary">{strings.quiz.chooseAll}</p>}

      <ul className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {question.options.map((option, i) => {
          const isCorrect = option.correct;
          const isChosen = answer ? answer.chosen.includes(i) : selected.includes(i);
          const state = !answer
            ? isChosen
              ? "border-accent bg-accent-muted"
              : "border-border-strong hover:border-accent"
            : isCorrect
              ? "border-success bg-success/15"
              : isChosen
                ? "border-error bg-error/15"
                : "border-border-subtle opacity-60";
          return (
            <li key={`${index}-${i}`}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={answer !== null}
                aria-pressed={multiple ? isChosen : undefined}
                className={`flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 bg-elevated px-5 py-3 text-left text-lg transition-colors duration-200 disabled:cursor-default ${state}`}
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong text-sm font-semibold"
                >
                  {LETTERS[i]}
                </span>
                <span className="flex-1">{option.text}</span>
                {answer && isCorrect && (
                  <>
                    <Check aria-hidden="true" className="size-6 text-success" />
                    <span className="sr-only">({strings.player.correctAnswer})</span>
                  </>
                )}
                {answer && isChosen && !isCorrect && (
                  <>
                    <X aria-hidden="true" className="size-6 text-error" />
                    <span className="sr-only">({strings.player.yourAnswer})</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {multiple && !answer && (
        <Button onClick={() => submit(selected)} disabled={selected.length === 0}>
          {strings.quiz.check}
        </Button>
      )}

      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-3xl flex-col items-center gap-4 text-center"
      >
        {answer && (
          <>
            <p
              className={`font-display text-3xl ${answer.correct ? "text-success" : "text-error"}`}
            >
              {answer.correct
                ? strings.quiz.correct
                : answer.timedOut
                  ? strings.quiz.timeUp
                  : strings.quiz.notQuite}
            </p>
            {question.explanation && (
              <p className="text-lg text-fg-secondary">{question.explanation}</p>
            )}
            <Button onClick={next} autoFocus>
              {last ? strings.quiz.seeResults : strings.quiz.next}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
