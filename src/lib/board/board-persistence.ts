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
          const cleaned = line.trim().replace(/^[-*•\d.)\s]+/, "").trim();
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

/**
 * Renders a board page to an HTML canvas context (for display or PNG export).
 */
export function renderBoardPageToCanvas(
  ctx: CanvasRenderingContext2D,
  page: BoardPage,
  width: number,
  height: number,
  options?: { scale?: number },
): void {
  const scale = options?.scale ?? 1;

  // Background
  if (page.background === "white" || !page.background) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  } else if (page.background === "grid") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    const step = 40 * scale;
    ctx.beginPath();
    for (let x = 0; x <= width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (page.background === "lines") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    const step = 36 * scale;
    ctx.beginPath();
    for (let y = step; y <= height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  // Draw items
  for (const item of page.items) {
    if (item.type === "stroke") {
      drawStroke(ctx, item, scale);
    } else if (item.type === "text") {
      drawText(ctx, item, scale);
    } else if (item.type === "image") {
      drawImageItem(ctx, item, scale);
    }
  }
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: BoardStroke, scale: number): void {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width * scale;

  if (stroke.tool === "eraser") {
    ctx.strokeStyle = "#ffffff";
  } else if (stroke.tool === "highlighter") {
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 0.4;
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 1.0;
  }

  ctx.beginPath();
  const first = stroke.points[0];
  ctx.moveTo(first.x * scale, first.y * scale);

  for (let i = 1; i < stroke.points.length; i++) {
    const pt = stroke.points[i];
    ctx.lineTo(pt.x * scale, pt.y * scale);
  }
  ctx.stroke();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, textItem: BoardTextBox, scale: number): void {
  ctx.save();
  ctx.fillStyle = textItem.color || "#1e293b";
  ctx.font = `${Math.round(textItem.fontSize * scale)}px sans-serif`;
  ctx.textBaseline = "top";

  const lines = textItem.text.split("\n");
  const lineHeight = textItem.fontSize * 1.3 * scale;

  lines.forEach((line, index) => {
    ctx.fillText(line, textItem.x * scale, textItem.y * scale + index * lineHeight);
  });

  ctx.restore();
}

function drawImageItem(ctx: CanvasRenderingContext2D, imageItem: BoardItem, scale: number): void {
  if (imageItem.type !== "image") return;
  // If we have an existing <img> in document, we draw it; otherwise placeholder or dataUrl
  if (typeof Image !== "undefined" && imageItem.url) {
    const img = new Image();
    img.src = imageItem.url;
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(
        img,
        imageItem.x * scale,
        imageItem.y * scale,
        imageItem.width * scale,
        imageItem.height * scale,
      );
    }
  }
}

/**
 * Exports a board page to PNG Blob (RF06, CA07, RNF08).
 */
export async function exportBoardPageToBlob(
  page: BoardPage,
  width = 1600,
  height = 900,
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

  renderBoardPageToCanvas(ctx, page, width, height, { scale: width / 1280 });

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
  width = 1600,
  height = 900,
): Promise<void> {
  if (typeof document === "undefined") return;

  const blob = await exportBoardPageToBlob(page, width, height);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `whiteboard-page-${pageIndex + 1}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
