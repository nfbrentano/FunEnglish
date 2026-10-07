"use client";

import { AlertCircle, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { PrintableReportView } from "@/components/reports/printable-report-view";
import { getPublicReport } from "@/lib/reports/repository";
import type { ProgressReportSnapshot } from "@/lib/reports/types";

export function PublicReportClient({
  paramsPromise,
}: {
  paramsPromise: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [report, setReport] = useState<ProgressReportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    paramsPromise
      .then((params) => {
        if (!active) return;
        let actualToken = params.token;
        if ((!actualToken || actualToken === "_") && typeof window !== "undefined") {
          const match = window.location.pathname.match(/\/report\/([^/?#]+)/);
          if (match?.[1]) {
            actualToken = match[1];
          }
        }
        setToken(actualToken);
        if (actualToken === "_") {
          return null;
        }
        return getPublicReport(actualToken);
      })
      .then((foundReport) => {
        if (!active) return;
        if (!foundReport) {
          setError("This report link is no longer available");
        } else {
          setReport(foundReport);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load public report:", err);
        setError("This report link is no longer available");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [paramsPromise]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary text-xs text-muted">
        Loading progress report…
      </div>
    );
  }

  if (error || !report) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-primary p-4">
        <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-elevated p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <Lock className="size-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-fg">
            Report Unavailable
          </h1>
          <p className="text-xs text-muted">
            This report link is no longer available
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-primary py-8 sm:py-12 px-4 sm:px-6">
      <PrintableReportView report={report} showPrintButton={true} />
    </main>
  );
}
