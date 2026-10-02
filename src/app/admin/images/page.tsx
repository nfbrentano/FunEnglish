import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/admin-guard";
import { MissingImagesView } from "@/components/admin/missing-images-view";
import { parseImageStyle } from "@/lib/admin/missing-images";
import { getPublicImagePaths } from "@/lib/catalog/build-data";

export const metadata: Metadata = { title: "Missing images", robots: { index: false } };

// Read at build time: the list of images in public/ and the style guide for the prompts.
const style = parseImageStyle(
  readFileSync(join(process.cwd(), "content", "prompts", "image-style.md"), "utf8"),
);

export default function MissingImagesPage() {
  return (
    <AdminGuard>
      <MissingImagesView imagePaths={getPublicImagePaths()} style={style} />
    </AdminGuard>
  );
}
