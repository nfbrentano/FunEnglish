"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardCopy,
  FolderSync,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listActivities } from "@/lib/admin/activities-admin";
import { kindForSrc, srcForFileName } from "@/lib/admin/image-processing";
import {
  findMissingImages,
  findMissingSiteImages,
  type MissingImage,
} from "@/lib/admin/missing-images";
import { SITE_IMAGES } from "@/lib/site-images";
import { useImageQueue, type QueuedItem } from "@/lib/admin/use-image-queue";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { strings } from "@/lib/strings";
import { editHref } from "./admin-list";
import { UploadStatus } from "./content/image-fields";

const t = strings.admin.images;
const u = strings.admin.upload;

type FilterMode = "all" | "missing" | "queued";

/** Images to generate, with prompts, file names and batch upload queue (spec: fila de imagens no painel). */
export function MissingImagesView({
  imagePaths,
  style,
}: {
  imagePaths: string[];
  style: string;
}) {
  const [missing, setMissing] = useState<MissingImage[] | null>(null);
  const [uploaded, setUploaded] = useState<ReadonlyMap<string, string>>(new Map());
  const [skipped, setSkipped] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [thumbnailsOnly, setThumbnailsOnly] = useState<boolean>(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const severalRef = useRef<HTMLInputElement>(null);

  const {
    items: queuedItems,
    totalBytes,
    storageAvailable,
    sendState,
    attachImage,
    removeItem,
    clearQueue,
    sendAll,
    resetSendState,
  } = useImageQueue();

  // Warn if leaving or reloading the page with unsent queued images (RF12, CA08)
  useUnsavedChanges(queuedItems.length > 0, u.unsavedWarning(queuedItems.length));

  useEffect(() => {
    listActivities()
      .then((items) =>
        setMissing([
          ...findMissingImages(items, new Set(imagePaths), style),
          ...findMissingSiteImages(SITE_IMAGES, new Set(imagePaths), style),
        ]),
      )
      .catch((error: unknown) => {
        console.warn("Could not list activities", error);
        setMissing([]);
      });
  }, [imagePaths, style]);

  const markUploaded = (done: { src: string; blob: Blob }[] | null) => {
    if (!done) return;
    setUploaded((m) => {
      const next = new Map(m);
      for (const d of done) next.set(d.src, URL.createObjectURL(d.blob));
      return next;
    });
  };

  const imagePathsSet = useMemo(() => new Set(imagePaths), [imagePaths]);

  // Map of queued items by cleaned src for quick lookup
  const queuedMap = useMemo(() => {
    const map = new Map<string, QueuedItem>();
    for (const item of queuedItems) {
      map.set(item.src, item);
    }
    return map;
  }, [queuedItems]);

  // "Upload several" (multiple file selection by filename): adds to the queue instead of committing immediately (RF10, CA07)
  async function uploadSeveral(files: FileList) {
    const wanted = new Set(missing?.map((m) => m.src));
    const unknown: string[] = [];
    setAttachError(null);

    for (const file of Array.from(files)) {
      const src = srcForFileName(file.name);
      if (src && wanted.has(src)) {
        try {
          await attachImage(src, file, { fileName: file.name });
        } catch (err) {
          setAttachError(err instanceof Error ? err.message : u.failed);
        }
      } else {
        unknown.push(file.name);
      }
    }
    setSkipped(unknown);
  }

  // Items from missing + any queued item that is no longer missing (e.g. was deployed / already on site) (RF09, CA06)
  const allCandidateImages = useMemo(() => {
    if (!missing) return null;
    const list: MissingImage[] = [...missing];
    const presentSrcs = new Set(missing.map((m) => m.src));

    for (const queued of queuedItems) {
      if (!presentSrcs.has(queued.src)) {
        list.push({
          activityId: "",
          title: queued.title ?? queued.fileName,
          src: queued.src,
          alt: "",
          fileName: queued.fileName,
          prompt: "",
        });
      }
    }
    return list;
  }, [missing, queuedItems]);

  // Filtered items to display
  const displayedItems = useMemo(() => {
    if (!allCandidateImages) return [];

    return allCandidateImages.filter((image) => {
      const isQueued = queuedMap.has(image.src);
      const isUploaded = uploaded.has(image.src);

      if (thumbnailsOnly && kindForSrc(image.src) !== "thumb") {
        return false;
      }

      if (filterMode === "queued") {
        return isQueued;
      }
      if (filterMode === "missing") {
        return !isQueued && !isUploaded;
      }
      return true;
    });
  }, [allCandidateImages, queuedMap, uploaded, thumbnailsOnly, filterMode]);

  async function handleSendAll() {
    resetSendState();
    const wanted = new Set(missing?.map((m) => m.src) ?? []);
    // Send only items that are actually still missing from the site (RF09, CA06)
    const activeMissing = new Set<string>();
    for (const src of wanted) {
      if (!imagePathsSet.has(src)) {
        activeMissing.add(src);
      }
    }

    const done = await sendAll(activeMissing);
    if (done) {
      markUploaded(done);
    }
  }

  const queuedKb = Math.round(totalBytes / 1024);

  return (
    <div className="mx-auto w-full max-w-300 space-y-8 px-4 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {strings.admin.back}
      </Link>

      <header className="space-y-2">
        <h1 className="font-display text-5xl font-medium">{t.title}</h1>
        <p className="max-w-3xl text-fg-secondary">{t.subtitle}</p>
      </header>

      {/* Warning banner if storage is unavailable (e.g. private mode) (RNF05, CA10) */}
      {!storageAvailable && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-fg">
          <AlertTriangle aria-hidden="true" className="size-5 shrink-0 text-warning" />
          <p>{u.storageUnavailableWarning}</p>
        </div>
      )}

      {/* Sticky queue summary bar (RF03, CA02) */}
      <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-elevated/95 p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={queuedItems.length > 0 ? "accent" : "outline"}>
            <FolderSync aria-hidden="true" className="size-3.5" />
            <span>{u.queuedSummary(queuedItems.length, queuedKb)}</span>
          </Badge>
          {attachError && (
            <span className="text-xs text-error font-medium">{attachError}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {queuedItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={sendState.phase === "working"}
              onClick={() => {
                if (window.confirm(u.clearQueueConfirm)) {
                  void clearQueue();
                }
              }}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {u.clearQueue}
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={queuedItems.length === 0 || sendState.phase === "working"}
            onClick={handleSendAll}
          >
            <Upload aria-hidden="true" className="size-4" />
            {u.sendAll(queuedItems.length)}
          </Button>

          {sendState.phase === "error" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendAll}
            >
              {u.tryAgain}
            </Button>
          )}
        </div>

        <div className="w-full">
          <UploadStatus state={sendState} />
        </div>
      </div>

      {missing === null ? (
        <Skeleton className="h-64 w-full" />
      ) : missing.length === 0 ? (
        <p className="text-fg-secondary">{t.none}</p>
      ) : (
        <>
          {/* Controls & Bulk Attach */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-secondary p-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-fg-secondary">{t.count(missing.length)}</p>
              <Button
                variant="secondary"
                size="sm"
                disabled={sendState.phase === "working"}
                onClick={() => severalRef.current?.click()}
              >
                <Paperclip aria-hidden="true" className="size-4" />
                {u.several}
              </Button>
              <input
                ref={severalRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                aria-label={u.several}
                onChange={(e) => {
                  if (e.target.files?.length) void uploadSeveral(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Filters (RF11) */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-border-subtle bg-primary p-0.5 text-xs">
                <button
                  type="button"
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                    filterMode === "all" ? "bg-accent text-primary" : "text-fg-secondary hover:text-fg"
                  }`}
                  onClick={() => setFilterMode("all")}
                >
                  {u.filterAll}
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                    filterMode === "missing" ? "bg-accent text-primary" : "text-fg-secondary hover:text-fg"
                  }`}
                  onClick={() => setFilterMode("missing")}
                >
                  {u.filterMissing}
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                    filterMode === "queued" ? "bg-accent text-primary" : "text-fg-secondary hover:text-fg"
                  }`}
                  onClick={() => setFilterMode("queued")}
                >
                  {u.filterQueued} ({queuedItems.length})
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-fg-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={thumbnailsOnly}
                  onChange={(e) => setThumbnailsOnly(e.target.checked)}
                  className="rounded border-border-subtle text-accent focus:ring-accent"
                />
                <span>{u.filterThumbnailsOnly}</span>
              </label>
            </div>

            <p className="w-full text-xs text-muted">{u.severalHint}</p>
            {skipped.length > 0 && <p className="text-sm text-error">{u.unknownFiles(skipped)}</p>}
          </div>

          {/* Missing Images List */}
          <ul className="space-y-3">
            {displayedItems.map((image) => (
              <MissingItemRow
                key={image.src}
                image={image}
                queuedItem={queuedMap.get(image.src)}
                isAlreadyOnSite={imagePathsSet.has(image.src)}
                uploadedPreview={uploaded.get(image.src)}
                onAttach={async (file) => {
                  setAttachError(null);
                  try {
                    await attachImage(image.src, file, {
                      fileName: image.fileName,
                      title: image.title,
                    });
                  } catch (err) {
                    setAttachError(err instanceof Error ? err.message : u.failed);
                  }
                }}
                onRemove={() => removeItem(image.src)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function MissingItemRow({
  image,
  queuedItem,
  isAlreadyOnSite,
  uploadedPreview,
  onAttach,
  onRemove,
}: {
  image: MissingImage;
  queuedItem?: QueuedItem;
  isAlreadyOnSite: boolean;
  uploadedPreview?: string;
  onAttach: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewSrc = uploadedPreview || queuedItem?.previewUrl;

  return (
    <li className="space-y-3 rounded-2xl border border-border-subtle bg-elevated p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {image.activityId ? (
            <Link
              href={editHref(image.activityId)}
              className="font-display text-xl hover:text-accent"
            >
              {image.title}
            </Link>
          ) : (
            <p className="font-display text-xl">
              {image.title} <span className="text-sm text-fg-secondary">· {t.siteImage}</span>
            </p>
          )}

          {/* Status badges (RF02, RF09) */}
          {isAlreadyOnSite ? (
            <Badge variant="outline">{u.alreadyOnSite}</Badge>
          ) : uploadedPreview ? (
            <Badge variant="accent">{u.uploadedLiveAfterDeploy}</Badge>
          ) : queuedItem ? (
            <Badge variant="accent">{u.queued}</Badge>
          ) : null}
        </div>

        <p className="text-sm">
          <span className="text-fg-secondary">{t.fileName}: </span>
          <code className="rounded bg-primary px-1.5 py-0.5">{image.fileName}</code>
        </p>
      </div>

      <p className="rounded-xl bg-primary p-3 font-mono text-xs text-fg-secondary">
        {image.prompt}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-label={`${t.copyPrompt}: ${image.fileName}`}
          onClick={async () => {
            await navigator.clipboard.writeText(image.prompt).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <ClipboardCopy aria-hidden="true" className="size-4" />
          )}
          {copied ? t.copied : t.copyPrompt}
        </Button>

        {/* Attach or Replace button (RF01, RF02, CA01, CA04) */}
        {!isAlreadyOnSite && (
          <Button
            variant="secondary"
            size="sm"
            aria-label={`${queuedItem ? u.replace : u.attach}: ${image.fileName}`}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip aria-hidden="true" className="size-4" />
            {queuedItem ? u.replace : u.attach}
          </Button>
        )}

        {/* Remove from queue button (RF02, CA04) */}
        {queuedItem && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${u.remove}: ${image.fileName}`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {u.remove}
          </Button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          aria-label={`${queuedItem ? u.replace : u.attach} ${image.fileName}`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) {
              await onAttach(file);
            }
          }}
        />
      </div>

      {/* Local preview (RF02, CA01) */}
      {previewSrc && (
        <div className="pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt=""
            className="max-h-32 rounded-xl border border-border-subtle object-cover shadow-xs"
          />
        </div>
      )}
    </li>
  );
}
