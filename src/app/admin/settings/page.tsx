import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/admin-guard";
import { SettingsView } from "@/components/admin/settings-view";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <AdminGuard>
      <SettingsView />
    </AdminGuard>
  );
}
