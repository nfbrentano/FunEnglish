import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminList } from "@/components/admin/admin-list";

export const metadata: Metadata = { title: "Content admin", robots: { index: false } };

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminList />
    </AdminGuard>
  );
}
