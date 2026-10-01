"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import type { promptCardsContentSchema } from "@/lib/activities/schema/content";
import type { PluginProps } from "@/lib/player/types";
import { strings } from "@/lib/strings";
import { shuffled } from "../shuffle";

type PromptCardsContent = z.infer<typeof promptCardsContentSchema>;

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Short beep made in the browser (no audio file). */
function beep() {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.6);
  } catch {
    // Audio is a nice-to-have; the visual alert is what matters.
  }
}

const format = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Speaking timer: start, pause, reset; visual + sound alert at zero. Remount (key) per card. */
function SpeakingTimer({ seconds, sound }: { seconds: number; sound: boolean }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          clearInterval(id);
          setRunning(false);
          if (sound) beep();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, sound]);

  const done = left === 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span
        aria-label={strings.player.timer}
        className={`rounded-full border px-4 py-1 font-display text-2xl tabular-nums ${
          done
            ? "animate-pulse border-error text-error motion-reduce:animate-none"
            : "border-border-strong"
        }`}
      >
        {format(left)}
      </span>
      {done ? (
        <p role="alert" className="font-display text-2xl text-error">
          {strings.quiz.timeUp}
        </p>
      ) : (
        <Button variant="secondary" onClick={() => setRunning(!running)}>
          {running ? (
            <Pause aria-hidden="true" className="size-4" />
          ) : (
            <Play aria-hidden="true" className="size-4" />
          )}
          {running ? strings.cards.pauseTimer : strings.cards.startTimer}
        </Button>
      )}
      <Button
        variant="ghost"
        aria-label={strings.cards.resetTimer}
        onClick={() => {
          setRunning(false);
          setLeft(seconds);
        }}
      >
        <RotateCcw aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}

/** Discussion and writing prompts (SDD/2026-09-30_atividade-cartoes-de-conversa.md). */
export default function PromptCardsPlayer({
  content,
  settings,
  onProgress,
  onComplete,
}: PluginProps<PromptCardsContent>) {
  const [order] = useState(() => {
    const indexes = content.cards.map((_, i) => i);
    return settings.shuffle ? shuffled(indexes) : indexes;
  });
  const [position, setPosition] = useState(0);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [randomSeen, setRandomSeen] = useState<number[]>([]);
  const [allShown, setAllShown] = useState(false);
  // Writing stays in this tab only: never stored or sent (spec CA07).
  const [texts, setTexts] = useState<Record<number, string>>({});
  const visited = useRef(new Set<number>([0]));

  const timerSeconds = Number(settings.extra.timer ?? 0);
  const sound = settings.extra.sound !== false;
  const cardIndex = order[position];
  const card = content.cards[cardIndex];
  const last = position === order.length - 1;

  useEffect(() => {
    onProgress({ current: position + 1, total: order.length });
  }, [position, order.length, onProgress]);

  function show(nextPosition: number) {
    visited.current.add(nextPosition);
    setPosition(nextPosition);
    setShowFollowUps(false);
    setShowVocabulary(false);
    setAllShown(false);
  }

  function random() {
    const remaining = order.map((_, p) => p).filter((p) => !randomSeen.includes(p));
    if (remaining.length === 0) {
      setAllShown(true);
      return;
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    setRandomSeen([...randomSeen, pick]);
    show(pick);
  }

  function finish() {
    const seen = visited.current.size;
    onComplete({
      correct: seen,
      total: order.length,
      headline: content.writing ? strings.cards.written(seen) : strings.cards.discussed(seen),
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      {card.image && (
        // eslint-disable-next-line @next/next/no-img-element -- static export; images are pre-sized assets
        <img
          src={card.image.src}
          alt={card.image.alt}
          className="max-h-[60vh] w-auto rounded-2xl object-contain"
        />
      )}
      {card.prompt && (
        <h2 className="max-w-3xl font-display text-4xl leading-snug font-medium md:text-5xl">
          {card.prompt}
        </h2>
      )}

      {card.options && (
        <div className="flex w-full max-w-3xl flex-col items-center gap-3 sm:flex-row">
          <p className="w-full flex-1 rounded-2xl border-2 border-border-strong bg-elevated p-6 font-display text-3xl">
            {card.options[0]}
          </p>
          <span className="font-display text-2xl text-accent italic">{strings.cards.or}</span>
          <p className="w-full flex-1 rounded-2xl border-2 border-border-strong bg-elevated p-6 font-display text-3xl">
            {card.options[1]}
          </p>
        </div>
      )}

      {timerSeconds > 0 && <SpeakingTimer key={position} seconds={timerSeconds} sound={sound} />}

      {((card.followUps?.length ?? 0) > 0 || (card.vocabulary?.length ?? 0) > 0) && (
        <div className="flex w-full max-w-3xl flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {card.followUps && card.followUps.length > 0 && (
              <Button
                variant="ghost"
                aria-expanded={showFollowUps}
                onClick={() => setShowFollowUps(!showFollowUps)}
              >
                {strings.cards.followUps}
              </Button>
            )}
            {card.vocabulary && card.vocabulary.length > 0 && (
              <Button
                variant="ghost"
                aria-expanded={showVocabulary}
                onClick={() => setShowVocabulary(!showVocabulary)}
              >
                {strings.cards.vocabulary}
              </Button>
            )}
          </div>
          {showFollowUps && (
            <ul className="space-y-1 text-lg text-fg-secondary">
              {card.followUps?.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          )}
          {showVocabulary && (
            <ul
              aria-label={strings.cards.vocabulary}
              className="flex flex-wrap justify-center gap-2"
            >
              {card.vocabulary?.map((word) => (
                <li key={word} className="rounded-full bg-accent-muted px-3 py-1 text-accent">
                  {word}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {content.writing && (
        <div className="w-full max-w-3xl space-y-1 text-left">
          <label htmlFor={`writing-${cardIndex}`} className="sr-only">
            {strings.cards.writeHere}
          </label>
          <textarea
            id={`writing-${cardIndex}`}
            value={texts[cardIndex] ?? ""}
            onChange={(event) => setTexts({ ...texts, [cardIndex]: event.target.value })}
            placeholder={strings.cards.writeHere}
            rows={7}
            className="w-full rounded-2xl border border-border-strong bg-elevated p-4 text-lg text-fg placeholder:text-muted focus:border-accent"
          />
          <p aria-live="polite" className="text-right text-sm text-fg-secondary">
            {strings.cards.words(countWords(texts[cardIndex] ?? ""))}
          </p>
        </div>
      )}

      {allShown && (
        <div role="status" className="flex items-center gap-3">
          <span>{strings.cards.allShown}</span>
          <Button
            variant="secondary"
            onClick={() => {
              setRandomSeen([]);
              setAllShown(false);
            }}
          >
            {strings.cards.startOver}
          </Button>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="secondary"
          onClick={() => show(position - 1)}
          disabled={position === 0}
          aria-label={strings.flashcards.previous}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Button>
        <Button variant="ghost" onClick={random}>
          <Shuffle aria-hidden="true" className="size-4" />
          {strings.cards.random}
        </Button>
        {last ? (
          <Button onClick={finish}>{strings.cards.finish}</Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => show(position + 1)}
            aria-label={strings.flashcards.next}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
