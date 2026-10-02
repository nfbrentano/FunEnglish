import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/admin-guard";
import { ActivityEditor } from "@/components/admin/activity-editor";
import { parseImageStyle } from "@/lib/admin/missing-images";
import { getPublicImagePaths } from "@/lib/catalog/build-data";

// Read at build time, for "Write prompt from alt" (spec: imagens pelo painel, RF03).
const imageStyle = parseImageStyle(
  readFileSync(join(process.cwd(), "content", "prompts", "image-style.md"), "utf8"),
);

export const metadata: Metadata = { title: "Edit activity", robots: { index: false } };

export default function EditActivityPage() {
  return (
    <AdminGuard>
      <ActivityEditor imagePaths={getPublicImagePaths()} imageStyle={imageStyle} />
    </AdminGuard>
  );
}
