"use client";

import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/lib/session/session-context";
import { strings } from "@/lib/strings";

export function ResumeSessionBanner() {
  const session = useSessionContext();

  if (!session || !session.resumePromptClass || session.hasActiveSession) {
    return null;
  }

  const { resumePromptClass, resumeSession, dismissResume } = session;

  return (
    <div
      role="region"
      aria-label="Resume class session"
      className="fixed bottom-4 left-4 z-50 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-elevated/95 p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-4"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary">
          <Play className="size-4 fill-current" />
        </span>
        <div className="text-sm">
          <p className="font-semibold text-fg">
            {strings.session.resumeClass(resumePromptClass.className || "Class")}
          </p>
          <p className="text-xs text-muted">
            {Object.keys(resumePromptClass.attendance || {}).length} students enrolled
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={resumeSession} className="bg-accent text-primary hover:bg-accent/90">
          {strings.session.resume}
        </Button>
        <button
          type="button"
          onClick={dismissResume}
          className="rounded-full p-1.5 text-fg-secondary hover:text-fg"
          aria-label={strings.session.discard}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
