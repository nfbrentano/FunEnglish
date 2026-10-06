"use client";

import { Lightbulb, Volume2 } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import type { sentenceOrderContentSchema } from "@/lib/activities/schema/content";
import {
  chunksOf,
  finalPunctuation,
  isCorrectOrder,
  misplaced,
  shuffleChunks,
} from "@/lib/activities/sentence-order";
import { isSpeechSupported, speak } from "@/lib/player/speech";
import type { PluginProps, ReviewItem } from "@/lib/player/types";
import { strings } from "@/lib/strings";
import { ActivityMedia } from "../../media/activity-media";
import { usePreloadNext } from "../../media/use-preload";
import { shuffled } from "../shuffle";

type SentenceOrderContent = z.infer<typeof sentenceOrderContentSchema>;
type Status = "building" | "right" | "wrong" | "revealed";
type Zone = "tray" | "built";

/** What the student built for an item. Only the first try is graded (RF04, RF07). */
export type SentenceOrderAnswer = { itemId: number; given: string[]; correct: boolean };

const t = strings.sentenceOrder;

const pieceClasses =
  "min-h-11 min-w-11 rounded-xl border-2 px-3 text-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Sentence Builder: put shuffled pieces in order (SDD/2026-10-05_15-atividade-ordenar-frases.md). */
export default function SentenceOrderPlayer({
  content,
  settings,
  onProgress,
  onScore,
  onComplete,
}: PluginProps<SentenceOrderContent>) {
  const [order] = useState(() => {
    const indexes = content.items.map((_, i) => i);
    return settings.shuffle ? shuffled(indexes) : indexes;
  });
  const [position, setPosition] = useState(0);
  const itemId = order[position];
  const item = content.items[itemId];
  usePreloadNext(content.items[order[position + 1]]);
  const chunks = useMemo(() => chunksOf(item), [item]);
  const punctuation = finalPunctuation(item.sentence);

  const [tray, setTray] = useState<number[]>(() => shuffleChunks(item));
  const [built, setBuilt] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>("building");
  const [tried, setTried] = useState(false);
  const [hint, setHint] = useState(false);
  const totals = useRef({ correct: 0, review: [] as ReviewItem[], answers: [] as SentenceOrderAnswer[] });

  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const checkButton = useRef<HTMLButtonElement>(null);
  const [focusNext, setFocusNext] = useState<{ zone: Zone; chunk: number } | "check" | null>(null);
  const dragging = useRef<{ chunk: number; from: Zone } | null>(null);

  const last = position === content.items.length - 1;
  const texts = built.map((i) => chunks[i]);
  const wrongAt = status === "wrong" ? misplaced(texts, item) : [];
  const readAloud = settings.extra.readAloud === true && isSpeechSupported();

  useEffect(() => {
    onProgress({ current: position + 1, total: content.items.length });
  }, [position, content.items.length, onProgress]);

  // Moving a piece removes its button: keep the focus on a sensible neighbour (RNF02).
  useEffect(() => {
    if (focusNext === null) return;
    if (focusNext === "check") checkButton.current?.focus();
    else buttons.current.get(`${focusNext.zone}-${focusNext.chunk}`)?.focus();
    setFocusNext(null);
  }, [focusNext]);

  const neighbour = (list: number[], index: number) => list[index] ?? list[index - 1];

  function add(chunk: number, at = built.length) {
    if (status !== "building") return;
    const left = tray.filter((c) => c !== chunk);
    const nextBuilt = built.filter((c) => c !== chunk);
    nextBuilt.splice(Math.min(at, nextBuilt.length), 0, chunk);
    setTray(left);
    setBuilt(nextBuilt);
    const next = neighbour(left, tray.indexOf(chunk));
    setFocusNext(next === undefined ? "check" : { zone: "tray", chunk: next });
  }

  function remove(chunk: number) {
    if (status !== "building") return;
    const left = built.filter((c) => c !== chunk);
    setBuilt(left);
    setTray([...tray, chunk]);
    const next = neighbour(left, built.indexOf(chunk));
    setFocusNext(next === undefined ? { zone: "tray", chunk } : { zone: "built", chunk: next });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Backspace" || status !== "building" || built.length === 0) return;
    event.preventDefault();
    remove(built[built.length - 1]);
  }

  function onDragStart(chunk: number, from: Zone) {
    return (event: DragEvent) => {
      dragging.current = { chunk, from };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", chunks[chunk]);
    };
  }

  function dropOnLine(at?: number) {
    return (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const drag = dragging.current;
      dragging.current = null;
      if (drag) add(drag.chunk, at);
    };
  }

  function dropOnTray(event: DragEvent) {
    event.preventDefault();
    const drag = dragging.current;
    dragging.current = null;
    if (drag?.from === "built") remove(drag.chunk);
  }

  function check() {
    if (status !== "building" || tray.length > 0) return;
    const right = isCorrectOrder(texts, item);
    if (!tried) {
      setTried(true);
      totals.current.answers[itemId] = { itemId, given: texts, correct: right };
      if (right) {
        totals.current.correct += 1;
        onScore(1);
      } else {
        totals.current.review.push({
          prompt: item.translation ?? chunks.join(" / "),
          answer: item.sentence,
          chosen: `${texts.join(" ")}${punctuation}`,
        });
      }
    }
    setStatus(right ? "right" : "wrong");
    if (right && readAloud) speak(item.sentence);
  }

  function tryAgain() {
    setStatus("building");
    if (built.length > 0) setFocusNext({ zone: "built", chunk: built[0] });
  }

  function reveal() {
    setBuilt(chunks.map((_, i) => i));
    setTray([]);
    setStatus("revealed");
  }

  function next() {
    if (last) {
      const { correct, review, answers } = totals.current;
      onComplete({
        correct,
        total: content.items.length,
        review,
        rawAnswers: content.items.map((_, i) => answers[i] ?? null),
      });
      return;
    }
    const nextItem = content.items[order[position + 1]];
    setPosition(position + 1);
    setTray(shuffleChunks(nextItem));
    setBuilt([]);
    setStatus("building");
    setTried(false);
    setHint(false);
  }

  const done = status === "right" || status === "revealed";
  const lineState =
    status === "right"
      ? "border-success bg-success/10"
      : status === "revealed"
        ? "border-accent bg-accent-muted/40"
        : "border-border-strong";

  return (
    <div className="flex flex-1 flex-col items-center gap-6" onKeyDown={onKeyDown}>
      {item.media && <ActivityMedia media={item.media} />}

      <div className="space-y-2 text-center">
        <p className="text-fg-secondary">{t.prompt}</p>
        {settings.extra.showTranslation === true && item.translation && (
          <p className="font-display text-2xl">{item.translation}</p>
        )}
      </div>

      <div
        role="group"
        aria-label={t.answerLine}
        onDragOver={(event) => event.preventDefault()}
        onDrop={dropOnLine()}
        className={`flex min-h-20 w-full max-w-3xl flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 ${lineState}`}
      >
        {built.length === 0 && <span className="text-fg-secondary">{t.empty}</span>}
        {built.map((chunk, i) => {
          const wrong = wrongAt[i] === true;
          return (
            <button
              key={chunk}
              ref={(el) => {
                if (el) buttons.current.set(`built-${chunk}`, el);
                else buttons.current.delete(`built-${chunk}`);
              }}
              type="button"
              draggable={status === "building"}
              onDragStart={onDragStart(chunk, "built")}
              onDragOver={(event) => event.preventDefault()}
              onDrop={dropOnLine(i)}
              onClick={() => remove(chunk)}
              aria-disabled={status !== "building"}
              aria-label={`${t.remove(chunks[chunk], i + 1)}${wrong ? `, ${t.wrongPlace}` : ""}`}
              className={`${pieceClasses} ${
                wrong
                  ? "border-error bg-error/15"
                  : done
                    ? "border-transparent bg-transparent"
                    : "border-accent bg-accent-muted"
              }`}
            >
              {chunks[chunk]}
            </button>
          );
        })}
        {built.length > 0 && punctuation && (
          <span aria-hidden="true" className="-ml-1.5 text-2xl">
            {punctuation}
          </span>
        )}
      </div>

      {status === "building" && tray.length > 0 && (
        <div
          role="group"
          aria-label={t.tray}
          onDragOver={(event) => event.preventDefault()}
          onDrop={dropOnTray}
          className="flex w-full max-w-3xl flex-wrap justify-center gap-2"
        >
          {tray.map((chunk) => (
            <button
              key={chunk}
              ref={(el) => {
                if (el) buttons.current.set(`tray-${chunk}`, el);
                else buttons.current.delete(`tray-${chunk}`);
              }}
              type="button"
              draggable
              onDragStart={onDragStart(chunk, "tray")}
              onClick={() => add(chunk)}
              aria-label={t.add(chunks[chunk])}
              className={`${pieceClasses} border-border-strong bg-elevated hover:border-accent`}
            >
              {chunks[chunk]}
            </button>
          ))}
        </div>
      )}

      {status === "right" && <p className="font-display text-2xl text-success">{t.correct}</p>}
      {status === "wrong" && <p className="text-center text-error">{t.wrong}</p>}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {item.hint && status === "building" && (
          <Button variant="ghost" onClick={() => setHint(true)} disabled={hint}>
            <Lightbulb aria-hidden="true" className="size-4" />
            {hint ? item.hint : strings.blanks.showHint}
          </Button>
        )}
        {status === "building" && (
          <Button ref={checkButton} onClick={check} disabled={tray.length > 0}>
            {strings.quiz.check}
          </Button>
        )}
        {status === "wrong" && (
          <>
            <Button variant="secondary" onClick={reveal}>
              {t.showAnswer}
            </Button>
            <Button onClick={tryAgain} autoFocus>
              {t.tryAgain}
            </Button>
          </>
        )}
        {done && isSpeechSupported() && (
          <Button variant="ghost" onClick={() => speak(item.sentence)}>
            <Volume2 aria-hidden="true" className="size-4" />
            {t.readAloud}
          </Button>
        )}
        {done && (
          <Button onClick={next} autoFocus>
            {last ? strings.quiz.seeResults : strings.quiz.next}
          </Button>
        )}
      </div>

      {status === "building" && (
        <p className="hidden text-sm text-fg-secondary md:block">{t.keyboardHint}</p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {status === "right" ? t.correct : status === "wrong" ? t.wrong : ""}
      </p>
    </div>
  );
}
