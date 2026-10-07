"use client";

import dynamic from "next/dynamic";

// Client-only like the real /lousa, which renders after sign-in: the board reads localStorage.
const WhiteboardPageView = dynamic(
  () => import("@/components/board/whiteboard-page-view").then((m) => m.WhiteboardPageView),
  { ssr: false },
);

/** Dev-only: /lousa without the teacher sign-in, to review the board in every theme. */
export default function DevLousaPage() {
  return <WhiteboardPageView />;
}
