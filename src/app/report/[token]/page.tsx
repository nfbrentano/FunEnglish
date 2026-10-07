import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicReportClient } from "./report-client";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ token: "_" }];
}

export const metadata: Metadata = {
  title: "Fun English Progress Report",
  description: "Student progress report and learning evaluation.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-primary text-xs text-muted">
          Loading progress report…
        </div>
      }
    >
      <PublicReportClient paramsPromise={params} />
    </Suspense>
  );
}
