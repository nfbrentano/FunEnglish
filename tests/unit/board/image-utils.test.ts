import { describe, expect, it } from "vitest";
import {
  calculateResizeDimensions,
  isImageBlob,
  validateAndResizeBoardImage,
} from "@/lib/board/image-utils";
import { MAX_IMAGE_DIMENSION } from "@/lib/board/types";

describe("Whiteboard Image Utils (RNF03, CA03, CA09)", () => {
  it("detects image vs non-image blobs correctly", () => {
    const png = new Blob(["png"], { type: "image/png" });
    const jpeg = new Blob(["jpeg"], { type: "image/jpeg" });
    const webp = new Blob(["webp"], { type: "image/webp" });
    const pdf = new Blob(["pdf"], { type: "application/pdf" });
    const txt = new Blob(["txt"], { type: "text/plain" });

    expect(isImageBlob(png)).toBe(true);
    expect(isImageBlob(jpeg)).toBe(true);
    expect(isImageBlob(webp)).toBe(true);
    expect(isImageBlob(pdf)).toBe(false);
    expect(isImageBlob(txt)).toBe(false);
  });

  describe("calculateResizeDimensions (CA03: max 1600px)", () => {
    it("preserves dimensions when both width and height are <= 1600", () => {
      const result = calculateResizeDimensions(800, 600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.scale).toBe(1);
    });

    it("scales down proportionally when width is 4000px (CA03)", () => {
      const result = calculateResizeDimensions(4000, 2000);
      expect(result.width).toBe(MAX_IMAGE_DIMENSION); // 1600
      expect(result.height).toBe(800); // 2000 * (1600 / 4000) = 800
      expect(result.scale).toBe(0.4);
    });

    it("scales down proportionally when height is larger than width", () => {
      const result = calculateResizeDimensions(1000, 3200);
      expect(result.height).toBe(MAX_IMAGE_DIMENSION); // 1600
      expect(result.width).toBe(500); // 1000 * 0.5 = 500
      expect(result.scale).toBe(0.5);
    });

    it("handles square images exceeding 1600px", () => {
      const result = calculateResizeDimensions(2400, 2400);
      expect(result.width).toBe(MAX_IMAGE_DIMENSION);
      expect(result.height).toBe(MAX_IMAGE_DIMENSION);
    });
  });

  describe("validateAndResizeBoardImage (CA09: negative rejection)", () => {
    it("throws 'Only images can be pasted' when given a non-image file (e.g. PDF)", async () => {
      const pdfBlob = new Blob(["fake pdf content"], { type: "application/pdf" });
      await expect(validateAndResizeBoardImage(pdfBlob)).rejects.toThrow(
        "Only images can be pasted",
      );
    });

    it("throws 'Only images can be pasted' when given text file", async () => {
      const txtBlob = new Blob(["hello world"], { type: "text/plain" });
      await expect(validateAndResizeBoardImage(txtBlob)).rejects.toThrow(
        "Only images can be pasted",
      );
    });
  });
});
