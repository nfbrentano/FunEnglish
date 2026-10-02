"use client";

import type { z } from "zod";
import type { mediaSchema } from "@/lib/activities/schema/common";
import { ActivityImage, usePlayerCategory } from "./activity-image";
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
  return <MediaImage src={media.src} alt={media.alt} />;
}

/** A question's, blank's or clue's picture: at most 45% of the height when projected (RNF06). */
function MediaImage({ src, alt }: { src: string; alt: string }) {
  const category = usePlayerCategory();
  return (
    <ActivityImage
      src={src}
      alt={alt}
      width={960}
      height={600}
      fallback={category ? { kind: "category", category } : { kind: "hide" }}
      className="mx-auto max-h-[45vh] w-auto max-w-full rounded-2xl object-contain"
    />
  );
}
