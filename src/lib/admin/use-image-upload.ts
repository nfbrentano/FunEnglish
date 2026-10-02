"use client";

import { useState } from "react";
import { strings } from "@/lib/strings";
import { commitFiles, readToken, repoPathFor } from "./github";
import { blobToBase64, kindForSrc, toWebp } from "./image-processing";

const t = strings.admin.upload;

export type UploadState =
  | { phase: "idle" }
  | { phase: "working"; message: string }
  | { phase: "done"; commitUrl: string }
  | { phase: "error"; message: string; needsConnection?: boolean };

export type UploadItem = { file: Blob; src: string };

/**
 * Picked files → WebP → one commit on main (spec: imagens pelo painel, RF04–RF07). Returns the
 * processed blobs so callers can show them before the deploy.
 */
export function useImageUpload() {
  const [state, setState] = useState<UploadState>({ phase: "idle" });

  async function upload(items: readonly UploadItem[], label: string) {
    const token = readToken();
    if (!token) {
      setState({ phase: "error", message: t.notConnected, needsConnection: true });
      return null;
    }
    try {
      setState({ phase: "working", message: t.processing(items.length) });
      const processed = [];
      for (const item of items) {
        processed.push({ src: item.src, blob: await toWebp(item.file, kindForSrc(item.src)) });
      }
      setState({ phase: "working", message: t.committing });
      const commitUrl = await commitFiles(
        token,
        await Promise.all(
          processed.map(async (p) => ({
            path: repoPathFor(p.src),
            base64: await blobToBase64(p.blob),
          })),
        ),
        `content(images): ${label} (via admin panel)`,
      );
      setState({ phase: "done", commitUrl });
      return processed;
    } catch (error) {
      console.warn("Upload failed", error);
      // createImageBitmap's own message ("could not be decoded") means little to an author.
      const unreadable = error instanceof DOMException && error.name === "InvalidStateError";
      setState({
        phase: "error",
        message: unreadable ? t.unreadable : error instanceof Error ? error.message : t.failed,
      });
      return null;
    }
  }

  return { state, upload, reset: () => setState({ phase: "idle" }) };
}
