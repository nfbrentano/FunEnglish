"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { strings } from "@/lib/strings";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Where focus goes on close when the opener is gone (e.g. a menu item in a closed menu). */
  returnFocus?: () => HTMLElement | null | undefined;
};

/**
 * Modal dialog on the native <dialog>: the browser traps focus, closes on Esc and returns focus
 * to the control that opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  className = "",
  returnFocus,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement;
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The <dialog> stays mounted so closing it (not removing it) hands focus back to the opener.
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        // Runs for Esc, the close button and `open` turning false.
        const opener = openerRef.current;
        if (!opener?.isConnected || opener === document.body) returnFocus?.()?.focus();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border-subtle bg-elevated p-0 text-fg shadow-2xl backdrop:bg-primary/70 backdrop:backdrop-blur-sm ${className}`}
    >
      {open && (
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="flex items-center gap-2 font-display text-xl text-fg">
              {icon}
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={strings.settings.close}
              className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="text-sm text-fg-secondary">{children}</div>
          {footer && <div className="flex justify-end gap-2 pt-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
