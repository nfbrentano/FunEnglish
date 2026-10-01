"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

type Question = { question: string; html: string };

/** Accessible accordion: each question opens and closes on its own (spec: FAQ, RNF03). */
export function FaqAccordion({ questions }: { questions: Question[] }) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());

  const toggle = (i: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  return (
    <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-elevated">
      {questions.map(({ question, html }, i) => {
        const expanded = open.has(i);
        const panelId = `${baseId}-answer-${i}`;
        return (
          <li key={question}>
            <h2>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(i)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-2xl text-fg hover:text-accent"
              >
                {question}
                <ChevronDown
                  aria-hidden="true"
                  className={`size-5 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                />
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-label={question}
              hidden={!expanded}
              className="prose px-5 pb-5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </li>
        );
      })}
    </ul>
  );
}
