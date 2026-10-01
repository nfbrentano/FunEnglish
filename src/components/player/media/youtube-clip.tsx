"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { strings } from "@/lib/strings";

type YouTubePlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  destroy: () => void;
};
type YouTubeNamespace = {
  Player: new (
    elementId: string,
    options: {
      host: string;
      videoId: string;
      playerVars: Record<string, number | string>;
      events: { onError: (event: { data: number }) => void };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeNamespace> | undefined;

/** Loads the YouTube IFrame API once. */
function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.append(script);
  });
  return apiPromise;
}

/** Errors the IFrame API reports for removed, private or embed-blocked videos. */
const UNPLAYABLE = new Set([2, 5, 100, 101, 150, 153]);

type YouTubeClipProps = { videoId: string; start?: number; end?: number; title?: string };

/**
 * Official YouTube player (privacy-enhanced domain), limited to start..end.
 * If the video can't be embedded, links to it on YouTube instead (motor spec, RF14).
 */
export function YouTubeClip({ videoId, start = 0, end, title = "Video clip" }: YouTubeClipProps) {
  const elementId = `yt-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(elementId, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: { start, ...(end ? { end } : {}), rel: 0, playsinline: 1 },
        events: {
          onError: (event) => {
            if (UNPLAYABLE.has(event.data)) setUnavailable(true);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [elementId, videoId, start, end]);

  if (unavailable) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-secondary p-6 text-center"
      >
        <p>{strings.player.clipUnavailable}</p>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}&t=${start}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-accent hover:underline"
        >
          {strings.player.watchOnYouTube}
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="aspect-video overflow-hidden rounded-2xl bg-black">
        <div id={elementId} title={title} className="size-full" />
      </div>
      <button
        type="button"
        onClick={() => {
          playerRef.current?.seekTo(start, true);
          playerRef.current?.playVideo();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-fg-secondary hover:text-fg"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        {strings.player.replayClip}
      </button>
    </div>
  );
}
