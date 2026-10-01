import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getBuildCatalog, getPublicImagePaths } from "@/lib/catalog/build-data";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const catalog = await getBuildCatalog();
  return (
    <RequireAuth>
      <DashboardView initial={catalog} imagePaths={getPublicImagePaths()} />
    </RequireAuth>
  );
}
