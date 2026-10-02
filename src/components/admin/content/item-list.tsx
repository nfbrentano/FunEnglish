"use client";

import { ArrowDown, ArrowUp, Copy, Plus, X } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { cloneItem, insertItem, moveItem, removeItem, replaceItem } from "@/lib/admin/list-ops";
import { strings } from "@/lib/strings";
import { ListError } from "./fields";
import type { Path } from "./form-context";

const t = strings.admin.form;
const iconButton =
  "flex size-9 shrink-0 items-center justify-center rounded-full text-fg-secondary hover:bg-secondary hover:text-fg disabled:pointer-events-none disabled:opacity-30";

type ItemListProps<T> = {
  /** "Questions" */
  label: string;
  /** (2) → "Question 3": names each item for headings and button labels. */
  itemLabel: (index: number) => string;
  /** "Add question" */
  addLabel: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  path: Path;
  min?: number;
  max?: number;
  /** Rows (quiz options, follow-ups) instead of cards. */
  compact?: boolean;
  /** Content of each item; `update` replaces it. */
  render: (item: T, index: number, update: (item: T) => void) => React.ReactNode;
  /** Controls shown before the item's own buttons (e.g. the "correct" radio). */
  leading?: (item: T, index: number, update: (item: T) => void) => React.ReactNode;
};

/**
 * Add, remove, duplicate and reorder with ↑ ↓ buttons, all keyboard-reachable, with focus kept
 * where the author expects it (spec: gestão completa, RF01–RF03, RNF04, D02).
 */
export function ItemList<T>({
  label,
  itemLabel,
  addLabel,
  items,
  onChange,
  create,
  path,
  min = 0,
  max = Infinity,
  compact,
  render,
  leading,
}: ItemListProps<T>) {
  const listRef = useRef<HTMLOListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  // After a change, where focus should go (applied once the list re-renders).
  const pendingFocus = useRef<{ index: number; control?: string } | "add" | null>(null);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === "add") return addRef.current?.focus();
    const item = listRef.current?.children[target.index];
    const control = target.control
      ? item?.querySelector<HTMLElement>(`[data-control="${target.control}"]`)
      : item?.querySelector<HTMLElement>("input, textarea, select");
    control?.focus();
  });

  const update = (index: number) => (item: T) => onChange(replaceItem(items, index, item));
  const move = (index: number, to: number, control: string) => {
    pendingFocus.current = {
      index: to,
      // At the edge the button disables, so focus its sibling.
      control: to === 0 ? "down" : to === items.length - 1 ? "up" : control,
    };
    onChange(moveItem(items, index, to));
  };

  const controls = (index: number) => {
    const name = itemLabel(index);
    return (
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          data-control="up"
          aria-label={t.moveUp(name)}
          disabled={index === 0}
          onClick={() => move(index, index - 1, "up")}
          className={iconButton}
        >
          <ArrowUp aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          data-control="down"
          aria-label={t.moveDown(name)}
          disabled={index === items.length - 1}
          onClick={() => move(index, index + 1, "down")}
          className={iconButton}
        >
          <ArrowDown aria-hidden="true" className="size-4" />
        </button>
        {!compact && (
          <button
            type="button"
            aria-label={t.duplicate(name)}
            disabled={items.length >= max}
            onClick={() => {
              pendingFocus.current = { index: index + 1 };
              onChange(insertItem(items, index + 1, cloneItem(items[index])));
            }}
            className={iconButton}
          >
            <Copy aria-hidden="true" className="size-4" />
          </button>
        )}
        <button
          type="button"
          aria-label={t.remove(name)}
          disabled={items.length <= min}
          onClick={() => {
            pendingFocus.current =
              items.length > 1 ? { index: Math.min(index, items.length - 2) } : "add";
            onChange(removeItem(items, index));
          }}
          className={`${iconButton} hover:text-error`}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  };

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className={compact ? "mb-2 text-sm font-medium" : "mb-3 font-display text-2xl"}>
        {label}
      </legend>
      <ListError path={path} />
      <ol ref={listRef} className={compact ? "space-y-2" : "space-y-4"}>
        {items.map((item, index) =>
          compact ? (
            <li key={index} className="flex items-start gap-2">
              {leading?.(item, index, update(index))}
              <div className="min-w-0 flex-1">{render(item, index, update(index))}</div>
              {controls(index)}
            </li>
          ) : (
            <li
              key={index}
              className="space-y-4 rounded-2xl border border-border-subtle bg-elevated p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium tracking-wide text-fg-secondary uppercase">
                  {itemLabel(index)}
                </h3>
                {controls(index)}
              </div>
              {render(item, index, update(index))}
            </li>
          ),
        )}
      </ol>
      <button
        ref={addRef}
        type="button"
        disabled={items.length >= max}
        onClick={() => {
          pendingFocus.current = { index: items.length };
          onChange([...items, create()]);
        }}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-dashed border-border-strong px-4 text-sm text-fg-secondary hover:border-accent hover:text-fg disabled:opacity-40"
      >
        <Plus aria-hidden="true" className="size-4" />
        {addLabel}
      </button>
    </fieldset>
  );
}
