"use client";

import type { z } from "zod";
import type { mediaSchema } from "@/lib/activities/schema/common";
import { SpeakButton } from "./speak-button";
import { YouTubeClip } from "./youtube-clip";

export type Media = z.infer<typeof mediaSchema>;

/** Image, read-aloud text or YouTube clip attached to a question or card. */
export function ActivityMedia({ media }: { media: Media }) {
  if (media.kind === "tts") return <SpeakButton text={media.text} />;
  if (media.kind === "emoji") {
    return (
      <p
        role="img"
        aria-label={media.label}
        className="text-7xl leading-none tracking-widest md:text-8xl"
      >
        {media.text}
      </p>
    );
  }
  if (media.kind === "youtube")
    return <YouTubeClip videoId={media.videoId} start={media.start} end={media.end} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export; images are already sized assets
    <img
      src={media.src}
      alt={media.alt}
      className="mx-auto max-h-[45vh] w-auto rounded-2xl object-contain"
    />
  );
}
