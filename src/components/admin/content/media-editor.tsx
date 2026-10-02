"use client";

import { Volume2 } from "lucide-react";
import { useContext, useId, useState } from "react";
import { ActivityMedia } from "@/components/player/media/activity-media";
import { Button } from "@/components/ui/button";
import { parseYouTubeInput } from "@/lib/admin/youtube-url";
import { strings } from "@/lib/strings";
import { asText, Field, inputClasses, TextField, type Json } from "./fields";
import { ImagePathsContext } from "./image-paths";
import { pathKey, type Path } from "./form-context";

const t = strings.admin.form;
const KINDS = ["none", "image", "emoji", "tts", "youtube"] as const;
type Kind = (typeof KINDS)[number];

const EMPTY: Record<Exclude<Kind, "none">, Json> = {
  image: { kind: "image", src: "", alt: "", source: "ai" },
  emoji: { kind: "emoji", text: "", label: "" },
  tts: { kind: "tts", text: "" },
  youtube: { kind: "youtube", videoId: "", start: 0 },
};

/** src + alt + source, with a picker of the images already in the site (RF04). */
export function ImageFields({
  value,
  onChange,
  path,
}: {
  value: Json;
  onChange: (value: Json) => void;
  path: Path;
}) {
  const images = useContext(ImagePathsContext);
  const listId = useId();
  const src = asText(value.src);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t.imageSrc} path={[...path, "src"]} hint={t.imageSrcHint}>
          {(props) => (
            <input
              {...props}
              list={listId}
              value={src}
              placeholder="/images/activities/<slug>/1.webp"
              onChange={(e) => onChange({ ...value, src: e.target.value })}
            />
          )}
        </Field>
        <datalist id={listId}>
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
        label={t.imageAlt}
        path={[...path, "alt"]}
        value={asText(value.alt)}
        onChange={(alt) => onChange({ ...value, alt })}
      />
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- preview of any path or URL
        <img
          src={src}
          alt=""
          className="max-h-40 rounded-xl border border-border-subtle object-contain"
        />
      )}
    </div>
  );
}

/** Optional media of a question, blank, clue… (spec: gestão completa, RF04, CA05). */
export function MediaEditor({
  value,
  onChange,
  path,
  label = t.media,
}: {
  value: unknown;
  onChange: (value: Json | undefined) => void;
  path: Path;
  label?: string;
}) {
  const media = value && typeof value === "object" ? (value as Json) : undefined;
  const kind: Kind = media ? ((media.kind as Kind) ?? "none") : "none";
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState(false);
  const kindId = useId();

  return (
    <div className="space-y-3 rounded-xl border border-border-subtle p-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={kindId} className="text-sm font-medium">
          {label}
        </label>
        <select
          id={kindId}
          data-path={pathKey(path)}
          value={kind}
          onChange={(e) => {
            const next = e.target.value as Kind;
            onChange(next === "none" ? undefined : { ...EMPTY[next] });
          }}
          className={`${inputClasses()} w-auto min-w-40`}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t.mediaKinds[k]}
            </option>
          ))}
        </select>
      </div>

      {media && kind === "image" && <ImageFields value={media} onChange={onChange} path={path} />}

      {media && kind === "emoji" && (
        <div className="flex flex-wrap gap-3">
          <TextField
            label={t.emoji}
            path={[...path, "text"]}
            value={asText(media.text)}
            placeholder="🍎 🍌"
            onChange={(text) => onChange({ ...media, text })}
          />
          <TextField
            label={t.emojiLabel}
            path={[...path, "label"]}
            hint={t.emojiLabelHint}
            value={asText(media.label)}
            onChange={(label) => onChange({ ...media, label })}
          />
        </div>
      )}

      {media && kind === "tts" && (
        <div className="flex flex-wrap items-end gap-3">
          <TextField
            label={t.ttsText}
            path={[...path, "text"]}
            multiline
            value={asText(media.text)}
            onChange={(text) => onChange({ ...media, text })}
          />
          <Button
            variant="secondary"
            disabled={!asText(media.text).trim() || typeof speechSynthesis === "undefined"}
            onClick={() => {
              speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(asText(media.text));
              utterance.lang = "en-US";
              speechSynthesis.speak(utterance);
            }}
          >
            <Volume2 aria-hidden="true" className="size-4" />
            {t.listen}
          </Button>
        </div>
      )}

      {media && kind === "youtube" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor={`${kindId}-link`} className="text-sm font-medium">
                {t.youtubeLink}
              </label>
              <input
                id={`${kindId}-link`}
                value={link}
                placeholder="https://www.youtube.com/watch?v=…"
                aria-invalid={linkError || undefined}
                onChange={(e) => {
                  setLink(e.target.value);
                  const parsed = parseYouTubeInput(e.target.value);
                  setLinkError(!parsed && e.target.value.trim() !== "");
                  if (parsed)
                    onChange({ ...media, videoId: parsed.videoId, start: parsed.start ?? 0 });
                }}
                className={inputClasses(linkError ? "x" : undefined)}
              />
              {linkError && <p className="text-sm text-error">{t.youtubeInvalid}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <TextField
              label={t.videoId}
              path={[...path, "videoId"]}
              value={asText(media.videoId)}
              onChange={(videoId) => onChange({ ...media, videoId })}
            />
            <NumberField
              label={t.start}
              path={[...path, "start"]}
              value={media.start}
              onChange={(start) => onChange({ ...media, start: start ?? 0 })}
            />
            <NumberField
              label={t.end}
              path={[...path, "end"]}
              value={media.end}
              onChange={(end) => {
                const { end: _old, ...rest } = media;
                void _old;
                onChange(end === undefined ? rest : { ...rest, end });
              }}
            />
          </div>
        </div>
      )}

      {media && kind !== "image" && <MediaPreview media={media} />}
    </div>
  );
}

function NumberField({
  label,
  path,
  value,
  onChange,
}: {
  label: string;
  path: Path;
  value: unknown;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <Field label={label} path={path}>
      {(props) => (
        <input
          {...props}
          type="number"
          min={0}
          inputMode="numeric"
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            onChange(
              e.target.value === "" ? undefined : Math.max(0, Math.round(Number(e.target.value))),
            )
          }
          className={`${props.className} sm:w-32`}
        />
      )}
    </Field>
  );
}

/** The player's own media component, so authors see what students will see. */
function MediaPreview({ media }: { media: Json }) {
  const ready =
    (media.kind === "youtube" && /^[\w-]{11}$/.test(asText(media.videoId))) ||
    (media.kind !== "youtube" && asText(media.text).trim() !== "");
  if (!ready) return null;
  return (
    <div className="rounded-xl bg-primary p-3">
      <p className="mb-2 text-xs tracking-widest text-muted uppercase">{t.mediaPreview}</p>
      <ActivityMedia media={media as never} />
    </div>
  );
}
