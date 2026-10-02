"use client";

import { ArrowLeft, Check, ClipboardCopy, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listActivities } from "@/lib/admin/activities-admin";
import { srcForFileName } from "@/lib/admin/image-processing";
import { findMissingImages, type MissingImage } from "@/lib/admin/missing-images";
import { useImageUpload } from "@/lib/admin/use-image-upload";
import { strings } from "@/lib/strings";
import { editHref } from "./admin-list";
import { UploadStatus } from "./content/image-fields";

const t = strings.admin.images;
const u = strings.admin.upload;

/** Images to generate, with prompts, file names and uploads (spec: imagens pelo painel, RF06, RF09). */
export function MissingImagesView({ imagePaths, style }: { imagePaths: string[]; style: string }) {
  const [missing, setMissing] = useState<MissingImage[] | null>(null);
  const [uploaded, setUploaded] = useState<ReadonlyMap<string, string>>(new Map());
  const [skipped, setSkipped] = useState<string[]>([]);
  const several = useImageUpload();
  const severalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listActivities()
      .then((items) => setMissing(findMissingImages(items, new Set(imagePaths), style)))
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

  async function uploadSeveral(files: FileList) {
    const wanted = new Set(missing?.map((m) => m.src));
    const items: { file: File; src: string }[] = [];
    const unknown: string[] = [];
    for (const file of Array.from(files)) {
      const src = srcForFileName(file.name);
      if (src && wanted.has(src)) items.push({ file, src });
      else unknown.push(file.name);
    }
    setSkipped(unknown);
    if (items.length === 0) return;
    const slugs = [...new Set(items.map((i) => i.src.split("/")[3]))];
    markUploaded(await several.upload(items, `${items.length} images (${slugs.join(", ")})`));
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-10">
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
      {missing === null ? (
        <Skeleton className="h-64 w-full" />
      ) : missing.length === 0 ? (
        <p className="text-fg-secondary">{t.none}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-subtle bg-secondary p-4">
            <p className="text-sm text-fg-secondary">{t.count(missing.length)}</p>
            <Button
              variant="secondary"
              disabled={several.state.phase === "working"}
              onClick={() => severalRef.current?.click()}
            >
              <Upload aria-hidden="true" className="size-4" />
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
            <p className="w-full text-xs text-muted">{u.severalHint}</p>
            <UploadStatus state={several.state} />
            {skipped.length > 0 && <p className="text-sm text-error">{u.unknownFiles(skipped)}</p>}
          </div>
          <ul className="space-y-3">
            {missing.map((image) => (
              <MissingItem
                key={image.src}
                image={image}
                uploadedPreview={uploaded.get(image.src)}
                onUploaded={markUploaded}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function MissingItem({
  image,
  uploadedPreview,
  onUploaded,
}: {
  image: MissingImage;
  uploadedPreview?: string;
  onUploaded: (done: { src: string; blob: Blob }[] | null) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { state, upload } = useImageUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <li className="space-y-3 rounded-2xl border border-border-subtle bg-elevated p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link href={editHref(image.activityId)} className="font-display text-xl hover:text-accent">
          {image.title}
        </Link>
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
        <Button
          variant="secondary"
          aria-label={`${u.upload}: ${image.fileName}`}
          disabled={state.phase === "working"}
          onClick={() => fileRef.current?.click()}
        >
          <Upload aria-hidden="true" className="size-4" />
          {uploadedPreview ? u.uploaded : u.upload}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          aria-label={`${u.upload} ${image.fileName}`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file)
              onUploaded(
                await upload(
                  [{ file, src: image.src }],
                  image.src.replace("/images/activities/", ""),
                ),
              );
          }}
        />
      </div>
      <UploadStatus state={state} />
      {uploadedPreview && (
        // eslint-disable-next-line @next/next/no-img-element -- local preview until the deploy
        <img
          src={uploadedPreview}
          alt=""
          className="max-h-32 rounded-xl border border-border-subtle"
        />
      )}
    </li>
  );
}
