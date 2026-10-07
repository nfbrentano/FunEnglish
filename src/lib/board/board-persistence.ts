import { BOARD_SURFACES, resolveInk, type BoardSurface } from "./ink";
import {
  BOARD_STORAGE_KEY_PREFIX,
  MAX_BOARD_TEXT_CHARS,
  type BoardData,
  type BoardItem,
  type BoardPage,
  type BoardStroke,
  type BoardTextBox,
} from "./types";

/**
 * Saves whiteboard state to localStorage (offline copy, RNF01, CA08).
 */
export function saveBoardLocally(sessionId: string, data: BoardData): void {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    const key = `${BOARD_STORAGE_KEY_PREFIX}${sessionId}`;
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save whiteboard to localStorage", err);
  }
}

/**
 * Loads whiteboard state from localStorage (RNF01, CA08).
 */
export function loadBoardLocally(sessionId: string): BoardData | null {
  if (typeof window === "undefined" || !sessionId) return null;
  try {
    const key = `${BOARD_STORAGE_KEY_PREFIX}${sessionId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.pages)) {
      return parsed as BoardData;
    }
    return null;
  } catch (err) {
    console.error("Failed to load whiteboard from localStorage", err);
    return null;
  }
}

/**
 * Clears whiteboard state from localStorage.
 */
export function clearBoardLocally(sessionId: string): void {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    window.localStorage.removeItem(`${BOARD_STORAGE_KEY_PREFIX}${sessionId}`);
  } catch (err) {
    console.error("Failed to clear whiteboard from localStorage", err);
  }
}

/**
 * Extracts candidate vocabulary terms from text boxes across all pages (RF05, CA06).
 * Handles multiline text, comma-separated lists, and individual text entries.
 */
export function extractBoardWords(pages: BoardPage[]): string[] {
  const wordsSet = new Set<string>();
  const terms: string[] = [];

  for (const page of pages) {
    for (const item of page.items) {
      if (item.type === "text" && item.text) {
        // Split by lines or commas/semicolons
        const lines = item.text.split(/[\n,;]+/);
        for (const line of lines) {
          const cleaned = line
            .trim()
            .replace(/^[-*•\d.)\s]+/, "")
            .trim();
          if (cleaned.length >= 2 && cleaned.length <= 80) {
            const lower = cleaned.toLowerCase();
            if (!wordsSet.has(lower)) {
              wordsSet.add(lower);
              terms.push(cleaned);
            }
          }
        }
      }
    }
  }

  return terms;
}

/**
 * Extracts plain text from all text boxes, up to 5,000 characters,
 * for saving to sessions/{id}.boardText for the session summary (RNF02).
 */
export function extractBoardText(pages: BoardPage[]): string {
  const sections: string[] = [];

  pages.forEach((page, index) => {
    const textItems = page.items.filter((i): i is BoardTextBox => i.type === "text");
    if (textItems.length > 0) {
      const pageTexts = textItems
        .map((t) => t.text.trim())
        .filter(Boolean)
        .join("\n");

      if (pageTexts) {
        if (pages.length > 1) {
          sections.push(`[Page ${index + 1}]\n${pageTexts}`);
        } else {
          sections.push(pageTexts);
        }
      }
    }
  });

  const fullText = sections.join("\n\n").trim();
  if (fullText.length > MAX_BOARD_TEXT_CHARS) {
    return fullText.slice(0, MAX_BOARD_TEXT_CHARS);
  }
  return fullText;
}

/** Logical page size: every item is stored in these coordinates (RNF03). */
export const BOARD_PAGE_WIDTH = 1280;
export const BOARD_PAGE_HEIGHT = 720;

export const BOARD_TEXT_LINE_HEIGHT = 1.3;
export const BOARD_TEXT_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Paints the page fill and its grid or ruled lines. Drawn on its own layer so the eraser
 * (destination-out on the ink layer) never removes the background.
 */
export function renderBoardBackground(
  ctx: CanvasRenderingContext2D,
  background: BoardPage["background"],
  surface: BoardSurface,
  width: number,
  height: number,
  scale = 1,
): void {
  const palette = BOARD_SURFACES[surface];
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  if (background === "grid") {
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    const step = 40 * scale;
    ctx.beginPath();
    for (let x = step; x < width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = step; y < height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (background === "lines") {
    ctx.strokeStyle = palette.rule;
    ctx.lineWidth = 1.5;
    const step = 36 * scale;
    ctx.beginPath();
    for (let y = step; y < height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }
}

/**
 * Paints strokes on a transparent ink layer. Eraser strokes cut through the ink only
 * (RF06): the background and images live on other layers.
 */
export function renderBoardInk(
  ctx: CanvasRenderingContext2D,
  items: BoardItem[],
  surface: BoardSurface,
  options: { scale?: number; fadedIds?: ReadonlySet<string> } = {},
): void {
  const scale = options.scale ?? 1;
  for (const item of items) {
    if (item.type === "stroke") {
      drawBoardStroke(ctx, item, surface, scale, options.fadedIds?.has(item.id) ? 0.25 : 1);
    }
  }
}

export function drawBoardStroke(
  ctx: CanvasRenderingContext2D,
  stroke: BoardStroke,
  surface: BoardSurface,
  scale = 1,
  opacity = 1,
): void {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width * scale;

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
  } else {
    ctx.strokeStyle = resolveInk(stroke.color, surface);
    ctx.globalAlpha = (stroke.tool === "highlighter" ? 0.4 : 1) * opacity;
  }

  ctx.beginPath();
  const [first, ...rest] = stroke.points;
  ctx.moveTo(first.x * scale, first.y * scale);
  // A single tap still leaves a dot.
  if (rest.length === 0) ctx.lineTo(first.x * scale + 0.01, first.y * scale);
  for (const pt of rest) ctx.lineTo(pt.x * scale, pt.y * scale);
  ctx.stroke();
  ctx.restore();
}

/** Splits text into lines that fit `maxWidth`, keeping the user's line breaks. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  textItem: BoardTextBox,
  surface: BoardSurface,
  scale: number,
): void {
  ctx.save();
  ctx.fillStyle = resolveInk(textItem.color, surface);
  ctx.font = `${Math.round(textItem.fontSize * scale)}px ${BOARD_TEXT_FONT}`;
  ctx.textBaseline = "top";

  const lineHeight = textItem.fontSize * BOARD_TEXT_LINE_HEIGHT * scale;
  wrapText(ctx, textItem.text, textItem.width * scale).forEach((line, index) => {
    ctx.fillText(line, textItem.x * scale, textItem.y * scale + index * lineHeight);
  });

  ctx.restore();
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined" || !url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Composites a whole page for PNG export: background, images, ink layer, then text,
 * the same stacking the board shows on screen.
 */
export async function renderBoardPageToCanvas(
  ctx: CanvasRenderingContext2D,
  page: BoardPage,
  width: number,
  height: number,
  options: { scale?: number; surface?: BoardSurface } = {},
): Promise<void> {
  const scale = options.scale ?? 1;
  const surface = options.surface ?? "light";

  renderBoardBackground(ctx, page.background, surface, width, height, scale);

  for (const item of page.items) {
    if (item.type !== "image") continue;
    const img = await loadImage(item.url);
    if (img) {
      ctx.drawImage(img, item.x * scale, item.y * scale, item.width * scale, item.height * scale);
    }
  }

  const inkCanvas = document.createElement("canvas");
  inkCanvas.width = width;
  inkCanvas.height = height;
  const inkCtx = inkCanvas.getContext("2d");
  if (inkCtx) {
    renderBoardInk(inkCtx, page.items, surface, { scale });
    ctx.drawImage(inkCanvas, 0, 0);
  }

  for (const item of page.items) {
    if (item.type === "text") drawText(ctx, item, surface, scale);
  }
}

/**
 * Exports a board page to a PNG Blob (RF06, CA07, RNF08). The surface defaults to light:
 * the PNG kept with the class summary and shown on the student portal is always light (D02);
 * the manual "Export PNG" passes the surface on screen.
 */
export async function exportBoardPageToBlob(
  page: BoardPage,
  width = 1600,
  height = 900,
  surface: BoardSurface = "light",
): Promise<Blob> {
  if (typeof document === "undefined") {
    return new Blob([], { type: "image/png" });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    // In test or headless environments without 2d canvas context:
    return new Blob(["mock-png-data"], { type: "image/png" });
  }

  await renderBoardPageToCanvas(ctx, page, width, height, {
    scale: width / BOARD_PAGE_WIDTH,
    surface,
  });

  if (typeof canvas.toBlob !== "function") {
    return new Blob(["mock-png-data"], { type: "image/png" });
  }

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else resolve(new Blob(["mock-png-data"], { type: "image/png" }));
    }, "image/png");
  });
}

/**
 * Triggers a browser download of the exported PNG file (RF06, CA07).
 */
export async function downloadBoardPageAsPng(
  page: BoardPage,
  pageIndex: number,
  surface: BoardSurface,
  width = 1600,
  height = 900,
): Promise<void> {
  if (typeof document === "undefined") return;

  const blob = await exportBoardPageToBlob(page, width, height, surface);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `whiteboard-page-${pageIndex + 1}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all pages to a single PDF using jsPDF (RF08, CA09).
 * Surface is forced to "light" for PDF export.
 */
export async function downloadBoardAsPdf(pages: BoardPage[]): Promise<void> {
  if (typeof document === "undefined") return;

  // Import jspdf dynamically (D02)
  const { jsPDF } = await import("jspdf");
  
  // Create a PDF with A4 dimensions (landscape: 297x210 mm)
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const width = 1280; // Render at logical width
  const height = 720;
  
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    ctx.clearRect(0, 0, width, height);
    
    await renderBoardPageToCanvas(ctx, page, width, height, {
      scale: 1,
      surface: "light",
    });

    // convert canvas to image data
    const imgData = canvas.toDataURL("image/jpeg", 0.85);

    if (i > 0) {
      pdf.addPage();
    }
    
    // Fill the A4 landscape page (297x210mm)
    pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);
  }

  pdf.save("whiteboard-export.pdf");
}
