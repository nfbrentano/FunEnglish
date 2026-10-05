import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveStudentPageClient } from "./live-client";

export const metadata: Metadata = {
  title: "Fun English Live",
  description: "Join your teacher's live classroom session and participate in real time.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-xs text-muted">
          Loading live class…
        </div>
      }
    >
      <LiveStudentPageClient />
    </Suspense>
  );
}
