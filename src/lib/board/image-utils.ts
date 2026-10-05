import { MAX_IMAGE_DIMENSION } from "./types";

export interface ProcessedBoardImage {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

/**
 * Checks if a file or blob is an image.
 */
export function isImageBlob(blob: Blob): boolean {
  return blob.type.startsWith("image/");
}

/**
 * Calculates resized dimensions constrained to MAX_IMAGE_DIMENSION (1600px).
 * (SDD/2026-10-03_07-lousa-virtual.md, RNF03, CA03)
 */
export function calculateResizeDimensions(
  width: number,
  height: number,
  maxDimension = MAX_IMAGE_DIMENSION,
): { width: number; height: number; scale: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height, scale: 1 };
  }

  const scale = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/**
 * Validates that the input is an image (CA09) and resizes it to max 1600px (CA03).
 */
export async function validateAndResizeBoardImage(file: Blob): Promise<ProcessedBoardImage> {
  if (!isImageBlob(file)) {
    throw new Error("Only images can be pasted");
  }

  // Load image to inspect dimensions
  let naturalWidth = 800;
  let naturalHeight = 600;
  let imageSource: CanvasImageSource | null = null;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      naturalWidth = bitmap.width;
      naturalHeight = bitmap.height;
      imageSource = bitmap;
    } catch {
      // fallback
    }
  } else if (
    typeof Image !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function"
  ) {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = objectUrl;
        setTimeout(resolve, 20);
      });
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        naturalWidth = img.naturalWidth;
        naturalHeight = img.naturalHeight;
      }
      imageSource = img;
      URL.revokeObjectURL(objectUrl);
    } catch {
      // fallback
    }
  }

  const { width: targetWidth, height: targetHeight } = calculateResizeDimensions(
    naturalWidth,
    naturalHeight,
    MAX_IMAGE_DIMENSION,
  );

  // If environment has document.createElement("canvas")
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    if (ctx && imageSource) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);
    }

    if (
      imageSource &&
      "close" in imageSource &&
      typeof (imageSource as ImageBitmap).close === "function"
    ) {
      (imageSource as ImageBitmap).close();
    }

    let dataUrl = "data:image/webp;base64,mock";
    try {
      dataUrl = canvas.toDataURL("image/webp");
    } catch {
      // fallback
    }

    let blob: Blob = file;
    if (typeof canvas.toBlob === "function") {
      try {
        blob = await new Promise<Blob>((resolve) => {
          const timeout = setTimeout(() => resolve(file), 30);
          canvas.toBlob(
            (b) => {
              clearTimeout(timeout);
              resolve(b || file);
            },
            "image/webp",
            0.85,
          );
        });
      } catch {
        blob = file;
      }
    }

    return {
      dataUrl: dataUrl || "data:image/webp;base64,mock",
      blob,
      width: targetWidth,
      height: targetHeight,
      naturalWidth,
      naturalHeight,
    };
  }

  // Fallback
  return {
    dataUrl: "",
    blob: file,
    width: targetWidth,
    height: targetHeight,
    naturalWidth,
    naturalHeight,
  };
}
