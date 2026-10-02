import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/admin-guard";
import { CoverageView } from "@/components/admin/coverage-view";

export const metadata: Metadata = { title: "Coverage", robots: { index: false } };

export default function CoveragePage() {
  return (
    <AdminGuard>
      <CoverageView />
    </AdminGuard>
  );
}
