"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { strings } from "@/lib/strings";

type Toast = { id: number; message: string; action?: { label: string; onClick: () => void } };
type ShowToast = (message: string, action?: Toast["action"]) => void;

const ToastContext = createContext<ShowToast>(() => {});
const DURATION_MS = 5000;

/** Short messages at the bottom of the screen, announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  );
  const show = useCallback<ShowToast>(
    (message, action) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-2), { id, message, action }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full border border-border-strong bg-elevated py-2 pr-2 pl-5 text-sm shadow-lg"
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="min-h-9 rounded-full px-3 font-medium text-accent hover:bg-accent-muted"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label={strings.settings.close}
              onClick={() => dismiss(toast.id)}
              className="flex size-9 items-center justify-center rounded-full text-muted hover:text-fg"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
