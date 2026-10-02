import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/admin-guard";
import { NewActivity } from "@/components/admin/new-activity";
import { parseGuide } from "@/lib/admin/ai-prompt";

export const metadata: Metadata = { title: "New activity", robots: { index: false } };

// The generation guide is read at build time: "Create with AI" always uses its latest version.
const guide = parseGuide(
  readFileSync(join(process.cwd(), "content", "prompts", "activities.md"), "utf8"),
);

export default function NewActivityPage() {
  return (
    <AdminGuard>
      <NewActivity guide={guide} />
    </AdminGuard>
  );
}
