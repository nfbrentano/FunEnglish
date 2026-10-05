import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeworkPageClient } from "./homework-client";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Fun English Homework",
  description: "Complete your assigned English homework and send results directly to your teacher.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomeworkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-primary text-xs text-muted">
          Loading homework…
        </div>
      }
    >
      <HomeworkPageClient />
    </Suspense>
  );
}
