"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { strings } from "@/lib/strings";
import { commitFiles, readToken, repoPathFor } from "./github";
import {
  calculateQueueBytes,
  clearQueuedImages,
  getAllQueuedImages,
  removeQueuedImage,
  saveQueuedImage,
  type QueuedImageRecord,
} from "./image-queue-storage";
import { blobToBase64, kindForSrc, toWebp, versionOf } from "./image-processing";
import type { UploadState } from "./use-image-upload";

const u = strings.admin.upload;

export type QueuedItem = QueuedImageRecord & {
  previewUrl: string;
};

export type ProcessedUploadResult = {
  src: string;
  versionedSrc: string;
  blob: Blob;
};

/**
 * Manages the persistent local image upload queue (spec: fila de imagens no painel).
 * Items are saved in IndexedDB as WebP blobs, previewed locally, and committed together in 1 commit.
 */
export function useImageQueue() {
  const [items, setItems] = useState<QueuedItem[]>([]);
  const [storageAvailable, setStorageAvailable] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sendState, setSendState] = useState<UploadState>({ phase: "idle" });

  // Store current blob object URLs to revoke them when replaced, removed or unmounted
  const previewUrlsRef = useRef<Map<string, string>>(new Map());

  // Load from IndexedDB on initial mount (RF08, CA03)
  useEffect(() => {
    let active = true;

    getAllQueuedImages()
      .then(({ items: loaded, storageAvailable: avail }) => {
        if (!active) return;
        setStorageAvailable(avail);
        const mapped = loaded.map((rec) => {
          const url = URL.createObjectURL(rec.blob);
          previewUrlsRef.current.set(rec.src, url);
          return { ...rec, previewUrl: url };
        });
        setItems(mapped);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Could not load image queue:", err);
        if (active) {
          setStorageAvailable(false);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      for (const url of previewUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current.clear();
    };
  }, []);

  const totalBytes = calculateQueueBytes(items);

  /**
   * Attaches an image file: processes to WebP and adds to local queue (RF01, CA01).
   */
  const attachImage = useCallback(
    async (
      src: string,
      file: File | Blob,
      meta?: { fileName?: string; title?: string },
    ): Promise<boolean> => {
      const cleanSrc = src.split("?")[0];
      const blob = await toWebp(file, kindForSrc(cleanSrc));
      const record: QueuedImageRecord = {
        src: cleanSrc,
        blob,
        size: blob.size,
        addedAt: Date.now(),
        fileName: meta?.fileName ?? cleanSrc.split("/").pop() ?? "image.webp",
        title: meta?.title,
      };

      const { storageAvailable: avail } = await saveQueuedImage(record);
      setStorageAvailable(avail);

      // Create new object URL and clean up previous if exists
      const oldUrl = previewUrlsRef.current.get(cleanSrc);
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      const previewUrl = URL.createObjectURL(blob);
      previewUrlsRef.current.set(cleanSrc, previewUrl);

      setItems((prev) => {
        const next = prev.filter((i) => i.src !== cleanSrc);
        next.push({ ...record, previewUrl });
        next.sort((a, b) => a.addedAt - b.addedAt);
        return next;
      });

      return true;
    },
    [],
  );

  /**
   * Removes an item from the queue (RF02, CA04).
   */
  const removeItem = useCallback(async (src: string) => {
    const cleanSrc = src.split("?")[0];
    await removeQueuedImage(cleanSrc);

    const oldUrl = previewUrlsRef.current.get(cleanSrc);
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
      previewUrlsRef.current.delete(cleanSrc);
    }

    setItems((prev) => prev.filter((i) => i.src !== cleanSrc));
  }, []);

  /**
   * Clears the entire queue (RF03).
   */
  const clearQueue = useCallback(async () => {
    await clearQueuedImages();

    for (const url of previewUrlsRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    previewUrlsRef.current.clear();

    setItems([]);
  }, []);

  /**
   * Commits all eligible queued images to main in a single GitHub commit (RF04, RF05, RF06, CA02).
   */
  const sendAll = useCallback(
    async (
      missingSrcs?: Set<string>,
    ): Promise<ProcessedUploadResult[] | null> => {
      const token = readToken();
      if (!token) {
        setSendState({ phase: "error", message: u.notConnected, needsConnection: true });
        return null;
      }

      // Filter out items that are already on the site (RF09, CA06)
      const toSend = missingSrcs
        ? items.filter((item) => missingSrcs.has(item.src))
        : items;

      if (toSend.length === 0) {
        return null;
      }

      try {
        setSendState({ phase: "working", message: u.processing(toSend.length) });

        const processed: ProcessedUploadResult[] = [];
        for (const item of toSend) {
          const file = item.src.split("?")[0];
          processed.push({
            src: file,
            versionedSrc: `${file}?v=${await versionOf(item.blob)}`,
            blob: item.blob,
          });
        }

        const slugs = [
          ...new Set(
            toSend
              .map((i) => {
                const parts = i.src.split("/");
                return parts[3] || "site";
              })
              .filter(Boolean),
          ),
        ];

        const label =
          toSend.length === 1
            ? `1 image (${slugs.join(", ")})`
            : `${toSend.length} images (${slugs.join(", ")})`;

        const repoFiles = await Promise.all(
          processed.map(async (p) => ({
            path: repoPathFor(p.src),
            base64: await blobToBase64(p.blob),
          })),
        );

        setSendState({
          phase: "working",
          message: u.uploadProgress(0, toSend.length),
        });

        const commitUrl = await commitFiles(
          token,
          repoFiles,
          `content(images): ${label} (via admin panel)`,
          fetch,
          (completed, total) => {
            if (completed < total) {
              setSendState({
                phase: "working",
                message: u.uploadProgress(completed, total),
              });
            } else {
              setSendState({
                phase: "working",
                message: u.committing,
              });
            }
          },
        );

        // Success: empty the queue (RF06, CA02)
        await clearQueue();
        setSendState({ phase: "done", commitUrl });
        return processed;
      } catch (error) {
        console.warn("Send all failed", error);
        setSendState({
          phase: "error",
          message: error instanceof Error ? error.message : u.failed,
        });
        // On failure: do NOT clear the queue (RF07, CA05)
        return null;
      }
    },
    [clearQueue, items],
  );

  return {
    items,
    totalBytes,
    storageAvailable,
    isLoading,
    sendState,
    attachImage,
    removeItem,
    clearQueue,
    sendAll,
    resetSendState: () => setSendState({ phase: "idle" }),
  };
}
