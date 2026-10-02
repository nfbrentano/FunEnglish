"use client";

import { useEffect, useState } from "react";
import { ActivityPlayer } from "@/components/player/activity-player";
import type { PlayableActivity } from "@/lib/player/load-activity";
import { strings } from "@/lib/strings";

const t = strings.admin;
const DEBOUNCE_MS = 300;

/**
 * The real player next to the form on wide screens, restarted as the content changes
 * (spec: gestão completa, RF07, CA06). Smaller screens use the Preview dialog.
 */
export function LivePreview({ activity }: { activity: PlayableActivity | null }) {
  const [width, setWidth] = useState<"desktop" | "phone">("desktop");
  const [shown, setShown] = useState(activity);
  const [version, setVersion] = useState(0);
  const json = activity ? JSON.stringify(activity) : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShown(json ? (JSON.parse(json) as PlayableActivity) : null);
      setVersion((v) => v + 1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [json]);

  return (
    <section
      aria-label={t.livePreview}
      className="hidden rounded-2xl border border-border-subtle bg-elevated p-3 xl:block"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs tracking-widest text-muted uppercase">{t.livePreview}</h2>
        <div
          role="group"
          aria-label={t.previewWidth}
          className="flex rounded-full border border-border-subtle p-0.5"
        >
          {(["desktop", "phone"] as const).map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={width === w}
              onClick={() => setWidth(w)}
              className={`min-h-8 rounded-full px-3 text-xs ${width === w ? "bg-accent-muted text-accent" : "text-fg-secondary"}`}
            >
              {w === "desktop" ? t.previewDesktop : t.previewPhone}
            </button>
          ))}
        </div>
      </div>
      <div
        data-testid="live-preview-frame"
        className="mx-auto max-h-[60vh] overflow-auto rounded-xl border border-border-subtle bg-primary"
        style={{ width: width === "phone" ? 375 : "100%" }}
      >
        {shown ? (
          <ActivityPlayer key={version} editable={false} activity={shown} />
        ) : (
          <p className="p-6 text-sm text-fg-secondary">{t.previewInvalid}</p>
        )}
      </div>
    </section>
  );
}
