"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/lib/session/session-context";
import { strings } from "@/lib/strings";

export function SessionConflictModal() {
  const session = useSessionContext();

  if (
    !session ||
    !session.conflictModalOpen ||
    !session.activeSession ||
    !session.pendingClassToStart
  ) {
    return null;
  }

  const { activeSession, pendingClassToStart } = session;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div className="flex w-full max-w-md flex-col rounded-3xl border border-border-subtle bg-elevated p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
              <AlertTriangle className="size-5" />
            </span>
            <h2 id="conflict-modal-title" className="font-display text-lg font-medium text-fg">
              {strings.session.conflictTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={session.cancelStartConflict}
            className="rounded-full p-1 text-fg-secondary hover:text-fg"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-sm text-fg-secondary">
          {strings.session.conflictDesc(activeSession.className, pendingClassToStart.className)}
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => {
              session.cancelStartConflict();
              session.setIsSidebarOpen(true);
            }}
          >
            {strings.session.resumeExisting} ({activeSession.className})
          </Button>

          <Button variant="secondary" onClick={session.resolveConflictByEnding}>
            {strings.session.endExisting}
          </Button>

          <Button
            variant="ghost"
            onClick={session.resolveConflictByDiscarding}
            className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
          >
            {strings.session.discardExisting}
          </Button>

          <Button variant="ghost" onClick={session.cancelStartConflict} size="sm">
            {strings.classes.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
