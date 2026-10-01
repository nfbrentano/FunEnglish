"use client";

import { useState } from "react";

/**
 * Shares a page with the native share sheet, or copies the link.
 * Placeholder until the share spec (SDD/2026-09-30_compartilhar-atividade.md) adds the share modal.
 */
export function useShareLink() {
  const [copied, setCopied] = useState(false);

  async function share({ title, path }: { title: string; path: string }) {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return { share, copied };
}
