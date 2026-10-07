"use client";

import { useEffect, useRef, type ReactNode } from "react";

type PopoverProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  /** Position classes relative to the anchor wrapper (which must be `relative`). */
  className?: string;
  children: ReactNode;
};

/** Small floating panel anchored to its wrapper. Closes on Esc and on a click outside it. */
export function Popover({ open, onClose, label, className = "", children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const anchor = ref.current?.parentElement;
      if (anchor && !anchor.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Stop here so Esc closes only the popover, not the board's expanded mode too.
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={`absolute z-40 min-w-max rounded-2xl border border-border-subtle bg-elevated p-2 text-fg shadow-xl motion-safe:animate-[board-pop_150ms_ease-out] ${className}`}
    >
      {children}
    </div>
  );
}
