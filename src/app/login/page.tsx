import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage() {
  return <PagePlaceholder title="Log in" />;
}
