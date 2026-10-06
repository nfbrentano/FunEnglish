"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

const t = strings.sentenceOrder;

/**
 * Sentence Builder in the live room (spec 15, RF07): tap the pieces in order and send the
 * sentence. The teacher's reveal grades it like the player does.
 */
export function LiveSentenceBuilder({
  chunks,
  punctuation = "",
  disabled,
  onSubmit,
}: {
  /** Already shuffled by the teacher's screen. */
  chunks: string[];
  punctuation?: string;
  disabled: boolean;
  onSubmit: (sentence: string) => void;
}) {
  const [built, setBuilt] = useState<number[]>([]);
  const tray = chunks.map((_, i) => i).filter((i) => !built.includes(i));
  const piece =
    "min-h-12 rounded-xl border-2 px-3 text-base font-semibold transition-colors disabled:opacity-60";

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label={t.answerLine}
        className="flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong p-3"
      >
        {built.length === 0 && <span className="text-sm text-muted">{t.empty}</span>}
        {built.map((i, position) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => setBuilt(built.filter((b) => b !== i))}
            aria-label={t.remove(chunks[i], position + 1)}
            className={`${piece} border-accent bg-accent/20 text-accent`}
          >
            {chunks[i]}
          </button>
        ))}
        {built.length > 0 && punctuation && (
          <span aria-hidden="true" className="-ml-1.5 text-xl">
            {punctuation}
          </span>
        )}
      </div>

      {!disabled && tray.length > 0 && (
        <div role="group" aria-label={t.tray} className="flex flex-wrap justify-center gap-2">
          {tray.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setBuilt([...built, i])}
              aria-label={t.add(chunks[i])}
              className={`${piece} border-border-strong bg-primary/30 text-fg hover:border-accent`}
            >
              {chunks[i]}
            </button>
          ))}
        </div>
      )}

      {!disabled && (
        <Button
          className="w-full min-h-12 text-sm font-bold"
          disabled={tray.length > 0}
          onClick={() => onSubmit(built.map((i) => chunks[i]).join(" "))}
        >
          Submit Answer
        </Button>
      )}
    </div>
  );
}
