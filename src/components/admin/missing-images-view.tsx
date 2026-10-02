"use client";

import { ArrowLeft, Check, ClipboardCopy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listActivities } from "@/lib/admin/activities-admin";
import { findMissingImages, type MissingImage } from "@/lib/admin/missing-images";
import { strings } from "@/lib/strings";
import { editHref } from "./admin-list";

const t = strings.admin.images;

/** Images to generate, with file names and prompts (spec: gestão completa, RF16, CA15). */
export function MissingImagesView({ imagePaths, style }: { imagePaths: string[]; style: string }) {
  const [missing, setMissing] = useState<MissingImage[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    listActivities()
      .then((items) => setMissing(findMissingImages(items, new Set(imagePaths), style)))
      .catch((error: unknown) => {
        console.warn("Could not list activities", error);
        setMissing([]);
      });
  }, [imagePaths, style]);

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
          <p className="text-sm text-fg-secondary">{t.count(missing.length)}</p>
          <ul className="space-y-3">
            {missing.map((image) => (
              <li
                key={image.src}
                className="space-y-3 rounded-2xl border border-border-subtle bg-elevated p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={editHref(image.activityId)}
                    className="font-display text-xl hover:text-accent"
                  >
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
                <Button
                  variant="secondary"
                  aria-label={`${t.copyPrompt}: ${image.fileName}`}
                  onClick={async () => {
                    await navigator.clipboard.writeText(image.prompt).catch(() => {});
                    setCopied(image.src);
                    setTimeout(() => setCopied(null), 2000);
                  }}
                >
                  {copied === image.src ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <ClipboardCopy aria-hidden="true" className="size-4" />
                  )}
                  {copied === image.src ? t.copied : t.copyPrompt}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
