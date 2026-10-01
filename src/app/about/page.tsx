import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { loadMarkdownPage } from "@/lib/pages/content";

const page = loadMarkdownPage("about");

export const metadata: Metadata = { title: page.title, description: page.description };

export default function AboutPage() {
  return <ProsePage title={page.title} updated={page.updated} html={page.html} />;
}
