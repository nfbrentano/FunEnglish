"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPublishedActivity, type PlayableActivity } from "@/lib/player/load-activity";
import { ActivityPlayer } from "./activity-player";

/**
 * Static /play pages hold the activity as it was at build time. After mount we fetch the
 * published version and, if an admin edited it since and no game has started, show the new one
 * (spec: painel admin, CA11), so edits don't wait for the next deploy.
 */
export function LiveActivityPlayer({ activity }: { activity: PlayableActivity }) {
  const [current, setCurrent] = useState(activity);
  const [version, setVersion] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    let active = true;
    fetchPublishedActivity(activity.slug)
      .then((latest) => {
        if (!active || started.current || !latest) return;
        if (JSON.stringify(latest) === JSON.stringify(activity)) return;
        setCurrent(latest);
        setVersion((v) => v + 1);
      })
      .catch((error: unknown) => console.warn("Could not refresh activity", error));
    return () => {
      active = false;
    };
  }, [activity]);

  return (
    <ActivityPlayer
      key={version}
      activity={current}
      onStart={() => {
        started.current = true;
      }}
    />
  );
}
