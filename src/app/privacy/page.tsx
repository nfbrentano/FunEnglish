import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { loadMarkdownPage } from "@/lib/pages/content";
import { pageMetadata } from "@/lib/seo";

const page = loadMarkdownPage("privacy");

export const metadata: Metadata = pageMetadata({
  title: page.title,
  description: page.description,
  path: "/privacy",
});

export default function PrivacyPage() {
  return <ProsePage title={page.title} updated={page.updated} html={page.html} />;
}
