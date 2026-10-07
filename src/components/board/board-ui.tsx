"use client";

import { PanelLeft, PanelTop } from "lucide-react";
import type { ReactNode } from "react";
import { BOARD_INKS, BOARD_SURFACES, type BoardInk, type BoardSurface } from "@/lib/board/ink";
import { setDockPosition, type BoardDockPosition } from "@/lib/board/preferences";
import { BOARD_PEN_WIDTH_KEYS, BOARD_PEN_WIDTHS, type BoardPenWidthKey } from "@/lib/board/types";
import { strings } from "@/lib/strings";

/**
 * Building blocks shared by the classroom board and the live board, so both look the same
 * (SDD/2026-10-06_redesign-ux-ui-lousa.md, RF01–RF03, RF14, RF17).
 *
 * Layout reacts to the board's own width (container queries on the board root, `@container`),
 * not the window: the same board sits in a narrow sidebar or fills a page.
 * Below @3xl (768 px) the dock is always a row at the top (RF15).
 */

const s = strings.whiteboard;

export function Island({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-border-subtle bg-elevated/95 p-1 shadow-lg backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export function Divider({ vertical = false }: { vertical?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={vertical ? "mx-0.5 h-5 w-px bg-border-strong" : "my-0.5 h-px w-5 bg-border-strong"}
    />
  );
}

const DOCK_CLASSES: Record<BoardDockPosition, string> = {
  left: "top-16 left-1/2 -translate-x-1/2 flex-row @3xl:top-1/2 @3xl:left-3 @3xl:translate-x-0 @3xl:-translate-y-1/2 @3xl:flex-col",
  top: "top-16 left-1/2 -translate-x-1/2 flex-row @5xl:top-3",
};

/** Where tooltips and popovers open: beside a vertical dock, below a horizontal one. */
const BESIDE_DOCK: Record<BoardDockPosition, string> = {
  left: "top-full mt-2 left-1/2 -translate-x-1/2 @3xl:top-1/2 @3xl:left-full @3xl:mt-0 @3xl:ml-3 @3xl:translate-x-0 @3xl:-translate-y-1/2",
  top: "top-full mt-2 left-1/2 -translate-x-1/2",
};

export function dockPopoverClasses(position: BoardDockPosition): string {
  return BESIDE_DOCK[position];
}

/** Divider that follows the dock direction. */
export function DockDivider({ position }: { position: BoardDockPosition }) {
  return (
    <span
      aria-hidden="true"
      className={`m-0.5 h-5 w-px bg-border-strong ${position === "left" ? "@3xl:h-px @3xl:w-5" : ""}`}
    />
  );
}

export function Dock({
  position,
  label,
  children,
}: {
  position: BoardDockPosition;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      aria-orientation={position === "left" ? "vertical" : "horizontal"}
      className={`pointer-events-auto absolute z-30 flex items-center gap-0.5 rounded-2xl border border-border-subtle bg-elevated/95 p-1 shadow-lg backdrop-blur-md transition-[top,left,translate] duration-150 motion-reduce:transition-none ${DOCK_CLASSES[position]}`}
    >
      {children}
    </div>
  );
}

type BoardButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  /** Shortcut shown in the tooltip, e.g. "P". */
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  /** Tooltip side: beside the dock, or below for top islands. */
  tooltip?: BoardDockPosition | "below" | "above";
  pressed?: boolean;
  expanded?: boolean;
  className?: string;
};

const TOOLTIP_SIDE = {
  ...BESIDE_DOCK,
  below: "top-full mt-2 left-1/2 -translate-x-1/2",
  above: "bottom-full mb-2 left-1/2 -translate-x-1/2",
};

/** Square icon button with a tooltip (name + shortcut). 36 px with a mouse, 44 px on touch. */
export function BoardButton({
  label,
  icon,
  onClick,
  active = false,
  shortcut,
  disabled = false,
  danger = false,
  tooltip = "below",
  pressed,
  expanded,
  className = "",
}: BoardButtonProps) {
  const tone = active
    ? "bg-accent text-primary shadow-sm"
    : danger
      ? "text-fg-secondary hover:bg-error/15 hover:text-error"
      : "text-fg-secondary hover:bg-accent-muted hover:text-fg";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      className={`group relative flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-35 pointer-coarse:size-11 ${tone} ${className}`}
    >
      {icon}
      {!expanded && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute z-50 rounded-lg bg-fg px-2 py-1 text-xs font-medium whitespace-nowrap text-primary opacity-0 shadow-md transition-opacity delay-300 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:hidden ${TOOLTIP_SIDE[tooltip]}`}
        >
          {label}
          {shortcut && <kbd className="ml-1.5 font-sans opacity-60">{shortcut}</kbd>}
        </span>
      )}
    </button>
  );
}

const DOT_SIZE: Record<BoardPenWidthKey, string> = {
  thin: "size-2",
  medium: "size-3",
  thick: "size-[1.125rem]",
};

/** Dock button face: the current ink and width (RF02). */
export function StyleSwatch({
  color,
  widthKey,
  surface,
}: {
  color: BoardInk;
  widthKey: BoardPenWidthKey;
  surface: BoardSurface;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: BOARD_SURFACES[surface].background }}
      className="flex size-6 items-center justify-center rounded-full border border-border-strong"
    >
      <span
        style={{ backgroundColor: BOARD_SURFACES[surface].ink[color] }}
        className={`rounded-full ${DOT_SIZE[widthKey]}`}
      />
    </span>
  );
}

/** Ink swatches and pen widths, previewed on the board surface (RF03). */
export function InkPicker({
  surface,
  color,
  onColor,
  widthKey,
  onWidth,
}: {
  surface: BoardSurface;
  color: BoardInk;
  onColor: (ink: BoardInk) => void;
  widthKey?: BoardPenWidthKey;
  onWidth?: (key: BoardPenWidthKey) => void;
}) {
  const palette = BOARD_SURFACES[surface];
  return (
    <div className="space-y-2 p-1">
      <p className="px-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{s.color}</p>
      <div
        role="radiogroup"
        aria-label={s.color}
        style={{ backgroundColor: palette.background }}
        className="grid grid-cols-6 gap-1.5 rounded-xl border border-border-subtle p-2"
      >
        {BOARD_INKS.map((ink, index) => (
          <button
            key={ink}
            type="button"
            role="radio"
            aria-checked={color === ink}
            aria-label={s.inks[ink]}
            title={`${s.inks[ink]} (${index + 1})`}
            onClick={() => onColor(ink)}
            className={`flex size-8 items-center justify-center rounded-full transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent pointer-coarse:size-11 ${
              color === ink ? "ring-2 ring-accent" : "hover:scale-110"
            }`}
          >
            <span
              style={{ backgroundColor: palette.ink[ink] }}
              className="size-6 rounded-full shadow-inner"
            />
          </button>
        ))}
      </div>

      {widthKey && onWidth && (
        <>
          <p className="px-1 pt-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
            {s.width}
          </p>
          <div role="radiogroup" aria-label={s.width} className="grid grid-cols-3 gap-1.5">
            {BOARD_PEN_WIDTH_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={widthKey === key}
                aria-label={`${s[key]} width`}
                title={`${s[key]} (${BOARD_PEN_WIDTHS[key]} px)`}
                onClick={() => onWidth(key)}
                style={{ backgroundColor: palette.background }}
                className={`flex h-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:h-11 ${
                  widthKey === key
                    ? "border-accent"
                    : "border-border-subtle hover:border-border-strong"
                }`}
              >
                <span
                  style={{ height: BOARD_PEN_WIDTHS[key], backgroundColor: palette.ink[color] }}
                  className="w-8 rounded-full"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Last dock button: moves the dock between the left edge and the top (RF17). */
export function DockPositionToggle({ position }: { position: BoardDockPosition }) {
  const next = position === "left" ? "top" : "left";
  return (
    <BoardButton
      label={next === "top" ? s.moveToolbarTop : s.moveToolbarLeft}
      icon={
        next === "top" ? (
          <PanelTop aria-hidden="true" className="size-4" />
        ) : (
          <PanelLeft aria-hidden="true" className="size-4" />
        )
      }
      tooltip={position}
      onClick={() => setDockPosition(next)}
      className="hidden @3xl:flex"
    />
  );
}

/** Option row inside menus: label on the left, check on the right when selected. */
export function SegmentedOptions<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; preview?: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5 px-1 py-1">
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-secondary p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:min-h-11 ${
              value === option.value
                ? "bg-elevated text-fg shadow-sm"
                : "text-fg-secondary hover:text-fg"
            }`}
          >
            {option.preview}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:min-h-11 ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : danger
            ? "text-error hover:bg-error/10"
            : "text-fg hover:bg-accent-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
