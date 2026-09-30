import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "New activities" };

// Placeholder until the category page spec (SDD/2026-09-30_pagina-de-categoria.md, RF06).
export default function NewActivitiesPage() {
  return <PagePlaceholder title="What's New" />;
}
