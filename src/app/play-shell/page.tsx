import type { Metadata } from "next";
import { PlayerShell } from "@/components/player/player-shell";

// Served by Firebase Hosting for /play/<slug> pages that don't exist as files yet
// (activities published after the last build). The URL keeps the real slug.
export const metadata: Metadata = { robots: { index: false } };

export default function PlayShellPage() {
  return <PlayerShell />;
}
