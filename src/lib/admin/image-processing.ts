// Resizing and WebP encoding in the browser, with the same rules as `npm run images:import`
// (spec: imagens pelo painel, RF04): thumbnails cropped to 1280×800, other images up to 1600 px
// wide, WebP ≤ 200 KB.

export const MAX_IMAGE_BYTES = 200 * 1024;
export const THUMB = { width: 1280, height: 800 };
export const MAX_CONTENT_WIDTH = 1600;
const QUALITIES = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

export type ImageKind = "thumb" | "content";

export class ImageTooLargeError extends Error {
  constructor() {
    super("This image is too detailed to fit in 200 KB. Try a simpler image.");
  }
}

export class WebpUnsupportedError extends Error {
  constructor() {
    super("This browser can't create WebP images. Use Chrome, Edge or Firefox.");
  }
}

/** Source rectangle (center crop for thumbnails) and output size. */
export function planResize(width: number, height: number, kind: ImageKind) {
  if (kind === "thumb") {
    const target = THUMB.width / THUMB.height;
    const crop =
      width / height > target
        ? { sw: Math.round(height * target), sh: height }
        : { sw: width, sh: Math.round(width / target) };
    return {
      sx: Math.round((width - crop.sw) / 2),
      sy: Math.round((height - crop.sh) / 2),
      ...crop,
      width: THUMB.width,
      height: THUMB.height,
    };
  }
  const scale = Math.min(1, MAX_CONTENT_WIDTH / width);
  return {
    sx: 0,
    sy: 0,
    sw: width,
    sh: height,
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/** Lowers the quality until the file fits; refuses when even the lowest doesn't (CA09). */
export async function encodeUnderLimit(encode: (quality: number) => Promise<Blob>): Promise<Blob> {
  for (const quality of QUALITIES) {
    const blob = await encode(quality);
    if (blob.type !== "image/webp") throw new WebpUnsupportedError();
    if (blob.size <= MAX_IMAGE_BYTES) return blob;
  }
  throw new ImageTooLargeError();
}

/** A picked file → WebP Blob ready to commit. */
export async function toWebp(file: Blob, kind: ImageKind): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const plan = planResize(bitmap.width, bitmap.height, kind);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const context = canvas.getContext("2d");
  if (!context) throw new WebpUnsupportedError();
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, plan.sx, plan.sy, plan.sw, plan.sh, 0, 0, plan.width, plan.height);
  bitmap.close();
  return encodeUnderLimit(
    (quality) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new WebpUnsupportedError())),
          "image/webp",
          quality,
        ),
      ),
  );
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** "/images/activities/<slug>/thumb.webp" is a thumbnail; anything else is content. */
export const kindForSrc = (src: string): ImageKind =>
  /\/thumb\.webp$/.test(src) ? "thumb" : "content";

/** File names like "travel-vocabulary--luggage.png" (RF06) → their src. */
export function srcForFileName(fileName: string): string | null {
  const match =
    /^([a-z0-9]+(?:-[a-z0-9]+)*)--([a-z0-9]+(?:-[a-z0-9]+)*)\.(png|jpe?g|webp|avif)$/i.exec(
      fileName,
    );
  return match
    ? `/images/activities/${match[1].toLowerCase()}/${match[2].toLowerCase()}.webp`
    : null;
}
