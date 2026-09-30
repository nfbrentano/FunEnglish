import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PagePlaceholder title="About Fun English">
      Fun English is a collection of interactive activities for ESL teachers.
    </PagePlaceholder>
  );
}
