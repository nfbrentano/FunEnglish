"use client";

import { createContext, useContext } from "react";

/** Images that exist in public/images (known at build time), for the picker (RF04). */
export const ImagePathsContext = createContext<string[]>([]);

/** What image fields need around them (spec: imagens pelo painel). */
export type ImageTools = {
  /** Slug of the activity being edited: uploads go to /images/activities/<slug>/. */
  slug: string;
  /** The style paragraph of content/prompts/image-style.md, for "Write prompt from alt". */
  style: string;
  /** Uploaded but not deployed yet: src → local object URL, so the preview shows right away. */
  previews: ReadonlyMap<string, string>;
  setPreview: (src: string, url: string) => void;
};

export const ImageToolsContext = createContext<ImageTools>({
  slug: "",
  style: "",
  previews: new Map(),
  setPreview: () => {},
});

export const useImageTools = () => useContext(ImageToolsContext);

/** Subject (the alt text) + the house style with dynamic aspect ratio (CA03). */
export function promptFromAlt(alt: string, style: string, src?: string): string {
  const subject = alt.trim().replace(/\.$/, "");
  const isThumb = src ? src.endsWith("thumb.webp") || src.includes("/categories/") : false;
  const isOption = src ? /-option-\d+\.webp$/i.test(src) : false;
  const ratioSuffix = isThumb
    ? " aspect ratio 16:10"
    : isOption
      ? " square aspect ratio 1:1"
      : "";
  return [subject && `${subject}.`, `${style}${ratioSuffix}`].filter(Boolean).join(" ");
}
