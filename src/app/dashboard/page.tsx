import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Placeholder until the dashboard spec (SDD/2026-09-30_dashboard-do-professor.md).
export default function DashboardPage() {
  return (
    <RequireAuth>
      <PagePlaceholder title="Your dashboard" />
    </RequireAuth>
  );
}
