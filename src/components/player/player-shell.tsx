"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublishedActivity, type PlayableActivity } from "@/lib/player/load-activity";
import { strings } from "@/lib/strings";
import { ActivityPlayer } from "./activity-player";
import { PlayerMessage } from "./player-message";

type State =
  | { status: "loading" }
  | { status: "ready"; activity: PlayableActivity }
  | { status: "invalid" | "not-found" };

/** Reads the slug from the URL and loads the activity from Firestore (one read). */
export function PlayerShell() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const slug = decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[1] ?? "");
    let active = true;
    (slug ? fetchPublishedActivity(slug) : Promise.resolve(undefined))
      .then((activity) => {
        if (!active) return;
        if (activity === undefined) setState({ status: "not-found" });
        else if (activity === null) setState({ status: "invalid" });
        else {
          document.title = `${activity.title} | Fun English`;
          setState({ status: "ready", activity });
        }
      })
      .catch(() => active && setState({ status: "not-found" }));
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "ready") return <ActivityPlayer activity={state.activity} />;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
      {state.status === "loading" && (
        <div
          role="status"
          aria-label={strings.player.loading}
          className="mx-auto flex max-w-2xl flex-col items-center gap-5 py-10"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-14 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      )}
      {state.status === "not-found" && (
        <PlayerMessage title={strings.player.notFound}>{strings.player.notFoundHint}</PlayerMessage>
      )}
      {state.status === "invalid" && (
        <PlayerMessage title={strings.player.loadError}>
          {strings.player.loadErrorHint}
        </PlayerMessage>
      )}
    </div>
  );
}
