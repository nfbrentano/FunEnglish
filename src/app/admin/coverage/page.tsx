import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/admin-guard";
import { CoverageView } from "@/components/admin/coverage-view";
import { getPublicImagePaths } from "@/lib/catalog/build-data";

export const metadata: Metadata = { title: "Coverage", robots: { index: false } };

export default function CoveragePage() {
  return (
    <AdminGuard>
      <CoverageView imagePaths={getPublicImagePaths()} />
    </AdminGuard>
  );
}
