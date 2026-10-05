import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinView } from "@/components/portal/join-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Join Student Portal",
  robots: { index: false },
};

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md px-4 py-20 space-y-6 text-center">
          <Skeleton className="h-10 w-48 mx-auto rounded-full" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      }
    >
      <JoinView />
    </Suspense>
  );
}
