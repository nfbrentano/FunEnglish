import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Activities" };

// Placeholder until the catalog spec (SDD/2026-09-30_catalogo-de-atividades.md).
export default function ActivitiesPage() {
  return (
    <div id="search">
      <PagePlaceholder title="Fun English Activities">
        Interactive activities for ESL teachers, organized in 9 categories.
      </PagePlaceholder>
    </div>
  );
}
