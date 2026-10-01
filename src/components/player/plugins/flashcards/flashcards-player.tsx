"use client";

import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import type { flashcardsContentSchema } from "@/lib/activities/schema/content";
import type { PluginProps } from "@/lib/player/types";
import { strings } from "@/lib/strings";
import { SpeakButton } from "../../media/speak-button";
import { shuffled } from "../shuffle";

type FlashcardsContent = z.infer<typeof flashcardsContentSchema>;
type Card = FlashcardsContent["cards"][number];
type Rating = "knew" | "learning";

const SWIPE_PX = 50;

function Front({ card }: { card: Card }) {
  return (
    <div className="flex flex-col items-center gap-4">
      {card.front.image && (
        // eslint-disable-next-line @next/next/no-img-element -- static export; images are pre-sized assets
        <img
          src={card.front.image.src}
          alt={card.front.image.alt}
          className="max-h-56 w-auto rounded-xl object-contain md:max-h-72"
        />
      )}
      {card.front.text && <p className="font-display text-4xl md:text-5xl">{card.front.text}</p>}
    </div>
  );
}

function Back({ card }: { card: Card }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="font-display text-5xl font-medium md:text-6xl">{card.back.text}</p>
      {card.back.definition && (
        <p className="max-w-md text-lg text-fg-secondary">{card.back.definition}</p>
      )}
      {card.back.example && (
        <p className="max-w-md text-fg-secondary italic">“{card.back.example}”</p>
      )}
    </div>
  );
}

/** Vocabulary flashcards (SDD/2026-09-30_atividade-flashcards.md). */
export default function FlashcardsPlayer({
  content,
  settings,
  onProgress,
  onComplete,
}: PluginProps<FlashcardsContent>) {
  const startWithWord = settings.extra.startWith === "word";
  const selfCheck = settings.extra.selfCheck === true;
  const [deck, setDeck] = useState(() => {
    const order = content.cards.map((_, i) => i);
    return settings.shuffle ? shuffled(order) : order;
  });
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [ended, setEnded] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const swiped = useRef(false);

  const cardIndex = deck[position];
  const card = content.cards[cardIndex];
  const showingBack = startWithWord ? !flipped : flipped;
  const learning = content.cards.map((_, i) => i).filter((i) => ratings[i] === "learning");
  const knew = Object.values(ratings).filter((r) => r === "knew").length;

  useEffect(() => {
    onProgress({ current: position + 1, total: deck.length });
  }, [position, deck.length, onProgress]);

  function complete(current: Record<number, Rating> = ratings) {
    const total = content.cards.length;
    const knewCount = Object.values(current).filter((r) => r === "knew").length;
    onComplete(
      selfCheck
        ? { correct: knewCount, total, headline: strings.flashcards.knewOf(knewCount, total) }
        : { correct: total, total, headline: strings.flashcards.reviewed(total) },
    );
  }

  function go(step: 1 | -1, current: Record<number, Rating> = ratings) {
    const next = position + step;
    if (next < 0) return;
    if (next >= deck.length) {
      const stillLearning = Object.values(current).some((r) => r === "learning");
      if (selfCheck && stillLearning) setEnded(true);
      else complete(current);
      return;
    }
    setPosition(next);
    setFlipped(false);
  }

  function rate(rating: Rating) {
    const updated = { ...ratings, [cardIndex]: rating };
    setRatings(updated);
    go(1, updated);
  }

  function review() {
    setDeck(learning);
    setPosition(0);
    setFlipped(false);
    setEnded(false);
  }

  // Keyboard: Space/Enter flip, ←/→ move.
  const handlers = useRef({ go, flip: () => setFlipped((f) => !f), ended });
  useEffect(() => {
    handlers.current = { go, flip: () => setFlipped((f) => !f), ended };
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select") || handlers.current.ended) return;
      if (event.key === " " || event.key === "Enter") {
        // A focused button already reacts to Space/Enter with a click.
        if (target.closest("button")) return;
        event.preventDefault();
        handlers.current.flip();
      } else if (event.key === "ArrowRight") handlers.current.go(1);
      else if (event.key === "ArrowLeft") handlers.current.go(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (ended) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-3xl">
          {strings.flashcards.knewOf(knew, content.cards.length)}
        </p>
        <Button onClick={review} autoFocus>
          {strings.flashcards.review(learning.length)}
        </Button>
        <Button variant="secondary" onClick={() => complete()}>
          {strings.quiz.seeResults}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6">
      {/* Descendants also hide their back face: Chrome may put an <img> on its own layer. */}
      <div className="w-full max-w-2xl [perspective:1600px]">
        <button
          type="button"
          aria-label={showingBack ? strings.flashcards.showFront : strings.flashcards.showBack}
          onClick={() => {
            if (!swiped.current) setFlipped((f) => !f);
            swiped.current = false;
          }}
          onPointerDown={(event) => {
            pointerStart.current = event.clientX;
          }}
          onPointerUp={(event) => {
            if (pointerStart.current === null) return;
            const dx = event.clientX - pointerStart.current;
            pointerStart.current = null;
            if (Math.abs(dx) > SWIPE_PX) {
              swiped.current = true;
              go(dx < 0 ? 1 : -1);
            }
          }}
          className="relative grid min-h-80 w-full touch-pan-y transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none md:min-h-96"
          style={{ transform: showingBack ? "rotateY(180deg)" : undefined }}
        >
          <span
            aria-hidden={showingBack}
            className="col-start-1 row-start-1 flex items-center justify-center rounded-3xl border border-border-subtle bg-elevated p-8 [backface-visibility:hidden] [&_*]:[backface-visibility:hidden]"
          >
            <Front card={card} />
          </span>
          <span
            aria-hidden={!showingBack}
            className="col-start-1 row-start-1 flex items-center justify-center rounded-3xl border border-accent bg-elevated p-8 [backface-visibility:hidden] [&_*]:[backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <Back card={card} />
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <SpeakButton text={card.speak ?? card.back.text} />
        <Button variant="ghost" onClick={() => setFlipped((f) => !f)}>
          <RotateCw aria-hidden="true" className="size-4" />
          {strings.flashcards.flip}
        </Button>
      </div>

      {selfCheck && showingBack ? (
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => rate("knew")}>{strings.flashcards.knewIt}</Button>
          <Button variant="secondary" onClick={() => rate("learning")}>
            {strings.flashcards.stillLearning}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => go(-1)}
            disabled={position === 0}
            aria-label={strings.flashcards.previous}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <Button variant="secondary" onClick={() => go(1)} aria-label={strings.flashcards.next}>
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
