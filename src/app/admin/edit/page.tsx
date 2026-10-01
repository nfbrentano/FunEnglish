import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/admin-guard";
import { ActivityEditor } from "@/components/admin/activity-editor";

export const metadata: Metadata = { title: "Edit activity", robots: { index: false } };

export default function EditActivityPage() {
  return (
    <AdminGuard>
      <ActivityEditor />
    </AdminGuard>
  );
}
