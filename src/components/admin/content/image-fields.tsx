"use client";

import { Check, ClipboardCopy, ExternalLink, Upload, Wand2 } from "lucide-react";
import Link from "next/link";
import { useContext, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/admin/content-fields";
import { ACTIONS_URL } from "@/lib/admin/github";
import { useImageUpload } from "@/lib/admin/use-image-upload";
import { strings } from "@/lib/strings";
import { asText, Field, TextField, withOptional, type Json } from "./fields";
import { ImagePathsContext, promptFromAlt, useImageTools } from "./image-paths";
import type { Path } from "./form-context";

const t = strings.admin.form;
const u = strings.admin.upload;

/** Where an upload goes: the current src if it's this activity's, else a name from the alt. */
export function uploadSrcFor(slug: string, src: string, alt: string, isThumbnail: boolean) {
  const file = src.split("?")[0];
  const own = new RegExp(`^/images/activities/${slug}/[a-z0-9-]+\\.webp$`);
  if (own.test(file)) return file;
  const name = isThumbnail ? "thumb" : slugify(alt).slice(0, 40).replace(/-+$/, "") || "image";
  return `/images/activities/${slug}/${name}.webp`;
}

/**
 * src + alt + source + prompt, with the picker of the site's images, "Write prompt from alt",
 * "Copy prompt" and "Upload image" (spec: gestão completa RF04; imagens pelo painel RF03–RF07).
 */
export function ImageFields({
  value,
  onChange,
  path,
  srcLabel = t.imageSrc,
  altLabel = t.imageAlt,
}: {
  value: Json;
  onChange: (value: Json) => void;
  path: Path;
  srcLabel?: string;
  altLabel?: string;
}) {
  const images = useContext(ImagePathsContext);
  const tools = useImageTools();
  const ids = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const { state, upload } = useImageUpload();
  const src = asText(value.src);
  const alt = asText(value.alt);
  const prompt = asText(value.prompt);
  const isThumbnail = path.length === 1 && path[0] === "thumbnail";
  const preview = tools.previews.get(src) ?? src;

  async function onFile(file: File) {
    const target = uploadSrcFor(tools.slug, src, alt, isThumbnail);
    const done = await upload([{ file, src: target }], target.replace("/images/activities/", ""));
    if (!done) return;
    const versioned = done[0].versionedSrc;
    tools.setPreview(versioned, URL.createObjectURL(done[0].blob));
    onChange({ ...value, src: versioned });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={srcLabel} path={[...path, "src"]} hint={t.imageSrcHint}>
          {(props) => (
            <input
              {...props}
              list={`${ids}-list`}
              value={src}
              placeholder="/images/activities/<slug>/1.webp"
              onChange={(e) => onChange({ ...value, src: e.target.value })}
            />
          )}
        </Field>
        <datalist id={`${ids}-list`}>
          {images.map((image) => (
            <option key={image} value={image} />
          ))}
        </datalist>
        <Field label={t.imageSource} path={[...path, "source"]}>
          {(props) => (
            <select
              {...props}
              value={asText(value.source) || "ai"}
              onChange={(e) => onChange({ ...value, source: e.target.value })}
              className={`${props.className} sm:w-40`}
            >
              <option value="ai">{t.sourceAi}</option>
              <option value="stock">{t.sourceStock}</option>
              <option value="own">{t.sourceOwn}</option>
            </select>
          )}
        </Field>
      </div>
      <TextField
        label={altLabel}
        path={[...path, "alt"]}
        value={alt}
        onChange={(next) => onChange({ ...value, alt: next })}
      />
      <TextField
        label={u.prompt}
        path={[...path, "prompt"]}
        hint={u.promptHint}
        multiline
        value={prompt}
        onChange={(next) => onChange(withOptional(value, "prompt", next))}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          disabled={!alt.trim() || !tools.style}
          onClick={() => onChange({ ...value, prompt: promptFromAlt(alt, tools.style, src) })}
        >
          <Wand2 aria-hidden="true" className="size-4" />
          {u.writeFromAlt}
        </Button>
        <Button
          variant="ghost"
          disabled={!prompt.trim()}
          onClick={async () => {
            await navigator.clipboard.writeText(prompt).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <ClipboardCopy aria-hidden="true" className="size-4" />
          )}
          {copied ? u.copied : u.copyPrompt}
        </Button>
        <Button
          variant="secondary"
          disabled={!tools.slug || state.phase === "working"}
          title={tools.slug ? undefined : u.needsSlug}
          onClick={() => fileRef.current?.click()}
        >
          <Upload aria-hidden="true" className="size-4" />
          {src && images.includes(src.split("?")[0]) ? u.replace : u.upload}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          aria-label={u.chooseFile}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
            event.target.value = "";
          }}
        />
      </div>
      {!tools.slug && <p className="text-xs text-muted">{u.needsSlug}</p>}
      <UploadStatus state={state} />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- preview of any path, URL or upload
        <img
          src={preview}
          alt=""
          className="max-h-40 rounded-xl border border-border-subtle object-contain"
        />
      )}
    </div>
  );
}

export function UploadStatus({ state }: { state: ReturnType<typeof useImageUpload>["state"] }) {
  if (state.phase === "idle") return <p role="status" className="sr-only" />;
  return (
    <p
      role="status"
      className={`flex flex-wrap items-center gap-2 text-sm ${state.phase === "error" ? "text-error" : "text-fg-secondary"}`}
    >
      {state.phase === "working" && state.message}
      {state.phase === "done" && (
        <>
          <span className="text-success">{u.done}</span>
          <a
            href={ACTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            {u.seeDeploy}
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </>
      )}
      {state.phase === "error" && (
        <>
          {state.message}
          {state.needsConnection && (
            <Link href="/admin/settings" className="underline">
              {u.connect}
            </Link>
          )}
        </>
      )}
    </p>
  );
}
