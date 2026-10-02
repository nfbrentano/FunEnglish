"use client";

import { X } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { listRevisions, type Revision } from "@/lib/admin/activities-admin";
import { diffActivities } from "@/lib/admin/revisions";
import { strings } from "@/lib/strings";

const t = strings.admin.history;
const MAX_CHANGES_SHOWN = 30;

type HistoryDialogProps = {
  activityId: string;
  /** What the editor shows now, to compare a version against. */
  current: unknown;
  open: boolean;
  onRestore: (revision: Revision) => void;
  onClose: () => void;
};

/** Version history with what changed and Restore (spec: gestão completa, RF11, CA10). */
export const HistoryDialog = forwardRef<HTMLDialogElement, HistoryDialogProps>(
  function HistoryDialog({ activityId, current, open, onRestore, onClose }, ref) {
    const [revisions, setRevisions] = useState<Revision[] | null>(null);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
      if (!open) return;
      let active = true;
      listRevisions(activityId)
        .then((list) => active && setRevisions(list))
        .catch((error: unknown) => {
          console.warn("Could not load the history", error);
          if (active) setRevisions([]);
        });
      return () => {
        active = false;
      };
    }, [open, activityId]);

    const revision = revisions?.find((r) => r.id === selected) ?? null;
    const changes = revision ? diffActivities(current, revision.data) : [];

    return (
      <dialog
        ref={ref}
        aria-labelledby="history-title"
        onClose={() => {
          setSelected(null);
          setRevisions(null);
          onClose();
        }}
        className="m-auto w-[min(48rem,calc(100%-2rem))] rounded-2xl border border-border-subtle bg-elevated p-0 text-fg backdrop:bg-black/50"
      >
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 id="history-title" className="font-display text-3xl">
              {t.title}
            </h2>
            <button
              type="button"
              aria-label={strings.share.close}
              onClick={() => (ref as React.RefObject<HTMLDialogElement | null>).current?.close()}
              className="flex size-10 items-center justify-center rounded-full text-fg-secondary hover:bg-secondary"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          {revisions === null ? (
            <p role="status" className="text-sm text-fg-secondary">
              {t.loading}
            </p>
          ) : revisions.length === 0 ? (
            <p className="text-sm text-fg-secondary">{t.empty}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <ol aria-label={t.versions} className="max-h-[60vh] space-y-1 overflow-auto">
                {revisions.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-pressed={selected === r.id}
                      onClick={() => setSelected(r.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                        selected === r.id ? "bg-accent-muted" : "hover:bg-secondary"
                      }`}
                    >
                      <span className="block font-medium">
                        {r.savedAt?.toLocaleString("en-US") ?? "—"}
                        {i === 0 && <span className="ml-2 text-xs text-accent">{t.latest}</span>}
                      </span>
                      <span className="block text-xs text-fg-secondary">
                        {r.summary}
                        {r.savedBy ? ` · ${r.savedBy.name}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="space-y-3">
                {!revision ? (
                  <p className="text-sm text-fg-secondary">{t.pick}</p>
                ) : (
                  <>
                    <p className="text-sm text-fg-secondary">
                      {changes.length === 0 ? t.same : t.differences(changes.length)}
                    </p>
                    {changes.length > 0 && (
                      <ul className="max-h-[45vh] space-y-2 overflow-auto font-mono text-xs">
                        {changes.slice(0, MAX_CHANGES_SHOWN).map((c) => (
                          <li key={c.path} className="rounded-lg bg-primary p-2">
                            <p className="text-fg">{c.path}</p>
                            <p className="text-error line-through decoration-error/40">
                              {c.before ?? "—"}
                            </p>
                            <p className="text-success">{c.after ?? "—"}</p>
                          </li>
                        ))}
                        {changes.length > MAX_CHANGES_SHOWN && (
                          <li className="text-fg-secondary">
                            {t.more(changes.length - MAX_CHANGES_SHOWN)}
                          </li>
                        )}
                      </ul>
                    )}
                    <Button
                      disabled={changes.length === 0}
                      onClick={() => {
                        if (window.confirm(t.restoreConfirm)) onRestore(revision);
                      }}
                    >
                      {t.restore}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </dialog>
    );
  },
);
