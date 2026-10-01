"use client";

import { Volume2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { isSpeechSupported, speak } from "@/lib/player/speech";
import { strings } from "@/lib/strings";

const subscribe = () => () => {};

/** Reads text aloud in English. Hidden where the browser has no speech synthesis. */
export function SpeakButton({
  text,
  label = strings.player.listen,
}: {
  text: string;
  label?: string;
}) {
  const supported = useSyncExternalStore(subscribe, isSpeechSupported, () => false);
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => speak(text)}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-4 text-sm text-fg hover:border-accent hover:text-accent"
    >
      <Volume2 aria-hidden="true" className="size-5" />
      {label}
    </button>
  );
}
