"use client";

import { Check, Copy, Maximize, Share2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ActivityType } from "@/lib/activities/schema/activity";
import { isGroupActivity, studentShareUrl } from "@/lib/share/share-url";
import { strings } from "@/lib/strings";

const t = strings.share;
const COPIED_MS = 2000;

type ShareButtonProps = {
  activity: { title: string; slug: string; type: ActivityType };
  className: string;
  children: ReactNode;
};

/** QR code as an SVG string, generated in the browser (no external service, RNF02). */
function useQrSvg(text: string | null): string | null {
  const [svg, setSvg] = useState<{ text: string; svg: string } | null>(null);
  useEffect(() => {
    if (!text) return;
    let active = true;
    import("qrcode")
      .then((qr) => qr.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" }))
      .then((value) => active && setSvg({ text, svg: value }))
      .catch((error: unknown) => console.warn("Could not create the QR code", error));
    return () => {
      active = false;
    };
  }, [text]);
  return svg?.text === text ? svg.svg : null;
}

function QrCode({
  svg,
  label,
  className,
}: {
  svg: string | null;
  label: string;
  className: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      // Always dark on white, whatever the theme: phones read that best.
      className={`bg-white text-black [&_svg]:size-full ${className}`}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}

/** "Share" for an activity: student link, Copy, QR code (also fullscreen) and the native sheet. */
export function ShareButton({ activity, className, children }: ShareButtonProps) {
  const titleId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fullscreenRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "manual">("idle");
  const [canShare, setCanShare] = useState(false);
  const qr = useQrSvg(url);

  useEffect(() => {
    if (copy !== "copied") return;
    const timer = setTimeout(() => setCopy("idle"), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copy]);

  function open() {
    setUrl(studentShareUrl(activity.slug, window.location.origin));
    setCopy("idle");
    setCanShare(typeof navigator.share === "function");
    dialogRef.current?.showModal();
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopy("copied");
    } catch {
      // No clipboard permission (CA08): leave the link selected for the keyboard shortcut.
      inputRef.current?.focus();
      inputRef.current?.select();
      setCopy("manual");
    }
  }

  function showFullscreen() {
    const dialog = fullscreenRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.requestFullscreen?.().catch(() => {});
  }

  function closeFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    fullscreenRef.current?.close();
  }

  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${strings.catalog.share}: ${activity.title}`}
        aria-haspopup="dialog"
        onClick={open}
        className={className}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border-subtle bg-elevated p-0 text-fg backdrop:bg-black/50"
        onClose={() => {
          setUrl(null); // nothing of the modal stays in the page (cards carry no hidden text)
          buttonRef.current?.focus();
        }}
        onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
      >
        {url && (
          <div className="space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 id={titleId} className="font-display text-2xl font-medium">
                  {t.title}
                </h2>
                <p className="text-sm text-fg-secondary">{t.subtitle}</p>
              </div>
              <button
                type="button"
                aria-label={t.close}
                onClick={() => dialogRef.current?.close()}
                className="-mt-1 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-fg-secondary hover:bg-secondary hover:text-fg"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            {isGroupActivity(activity.type) && (
              <p className="rounded-xl border border-accent/40 bg-accent-muted px-4 py-3 text-sm">
                {t.groupHint}
              </p>
            )}

            <div className="space-y-2">
              <label htmlFor={`${titleId}-url`} className="text-sm font-medium">
                {t.link}
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  id={`${titleId}-url`}
                  readOnly
                  value={url}
                  onFocus={(event) => event.target.select()}
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-border-strong bg-primary px-4 text-sm text-fg focus:border-accent"
                />
                <Button onClick={copyLink} className="shrink-0">
                  {copy === "copied" ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <Copy aria-hidden="true" className="size-4" />
                  )}
                  {copy === "copied" ? t.copied : t.copy}
                </Button>
              </div>
              <p role="status" className="min-h-5 text-sm text-fg-secondary">
                {copy === "manual" ? t.copyHint(mac) : ""}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <QrCode svg={qr} label={t.qr(activity.title)} className="size-48 rounded-xl p-3" />
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={showFullscreen} disabled={!qr}>
                  <Maximize aria-hidden="true" className="size-4" />
                  {t.showFullscreen}
                </Button>
                {canShare && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void navigator.share({ title: activity.title, url }).catch(() => {})
                    }
                  >
                    <Share2 aria-hidden="true" className="size-4" />
                    {t.native}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>

      <dialog
        ref={fullscreenRef}
        aria-label={t.qr(activity.title)}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-white p-0 text-black"
        onClose={() => {
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        }}
      >
        {url && (
          <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
            <p className="text-center font-display text-3xl md:text-5xl">{activity.title}</p>
            {/* At least 60% of the smaller screen side, readable from the back of the room (RNF01). */}
            <QrCode svg={qr} label={t.qr(activity.title)} className="size-[70vmin]" />
            <p className="text-lg">{t.scan}</p>
            <button
              type="button"
              onClick={closeFullscreen}
              className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full border border-black/20 hover:bg-black/5"
              aria-label={t.closeFullscreen}
            >
              <X aria-hidden="true" className="size-6" />
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
