import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { loadMarkdownPage } from "@/lib/pages/content";
import { pageMetadata } from "@/lib/seo";

const page = loadMarkdownPage("terms");

export const metadata: Metadata = pageMetadata({
  title: page.title,
  description: page.description,
  path: "/terms",
});

export default function TermsPage() {
  return <ProsePage title={page.title} updated={page.updated} html={page.html} />;
}
