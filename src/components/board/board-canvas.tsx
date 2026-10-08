"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BOARD_PAGE_HEIGHT,
  BOARD_PAGE_WIDTH,
  BOARD_TEXT_LINE_HEIGHT,
  drawBoardStroke,
  renderBoardBackground,
  renderBoardInk,
  drawBoardShape,
} from "@/lib/board/board-persistence";
import { BOARD_SURFACES, resolveInk, type BoardSurface } from "@/lib/board/ink";
import {
  BOARD_ERASER_WIDTH,
  BOARD_HIGHLIGHTER_WIDTH,
  BOARD_PEN_WIDTHS,
  type BoardImage,
  type BoardItem,
  type BoardTextBox,
  type Point,
} from "@/lib/board/types";
import { findItemsInRect } from "@/lib/board/hit-test";
import type { WhiteboardInstance } from "@/lib/board/use-whiteboard";
import { strings } from "@/lib/strings";

export interface BoardCanvasProps {
  board: WhiteboardInstance;
  surface: BoardSurface;
  className?: string;
}

const s = strings.whiteboard;
/** Space between the page and the board edge. */
const PAGE_MARGIN = 12;

/** Sizes the canvas buffer for the device pixel ratio (capped at 2) and returns page → buffer scale. */
function fitCanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number): number {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return width / BOARD_PAGE_WIDTH;
}

/**
 * The page: a 16:9 sheet scaled to fit ("contain") and centered, drawn in layers so the eraser cuts
 * ink only (SDD/2026-10-06_redesign-ux-ui-lousa.md, RF06, RNF03):
 * background canvas → images → ink canvas → text and selection overlays.
 */
export function BoardCanvas({ board, surface, className = "" }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const {
    currentPage,
    activeTool,
    activeColor,
    activePenWidthKey,
    eraserMode,
    pendingEraseIds,
    selectedItemIds,
    isDrawing,
    currentStroke,
    currentShape,
    startDrawing,
    continueDrawing,
    finishDrawing,
    setSelectedItemIds,
    addTextBox,
    updateTextBox,
    updateItemPosition,
    updateItemDimensions,
    deleteItem,
    pasteOrDropFile,
  } = board;

  // Fit the page into the available area, keeping 16:9.
  const [frame, setFrame] = useState({ width: BOARD_PAGE_WIDTH, height: BOARD_PAGE_HEIGHT });
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setFrame({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const pageScale = Math.max(
    0.05,
    Math.min(
      (frame.width - PAGE_MARGIN * 2) / BOARD_PAGE_WIDTH,
      (frame.height - PAGE_MARGIN * 2) / BOARD_PAGE_HEIGHT,
    ),
  );
  const pageWidth = BOARD_PAGE_WIDTH * pageScale;
  const pageHeight = BOARD_PAGE_HEIGHT * pageScale;
  const palette = BOARD_SURFACES[surface];

  const [dragState, setDragState] = useState<{
    type: "move" | "resize";
    itemId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [lasso, setLasso] = useState<{ start: Point; end: Point } | null>(null);

  // Background layer: only changes with the page background, surface or size.
  useEffect(() => {
    const canvas = backgroundRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = fitCanvas(canvas, pageWidth, pageHeight);
    renderBoardBackground(ctx, currentPage.background, surface, canvas.width, canvas.height, scale);
  }, [currentPage.background, surface, pageWidth, pageHeight]);

  // Ink layer: strokes, eraser cuts and the stroke being drawn.
  useEffect(() => {
    const canvas = inkRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = fitCanvas(canvas, pageWidth, pageHeight);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderBoardInk(ctx, currentPage.items, surface, { scale, fadedIds: pendingEraseIds });
    if (currentStroke) drawBoardStroke(ctx, currentStroke, surface, scale);
    if (currentShape) drawBoardShape(ctx, currentShape, surface, scale);
  }, [currentPage.items, currentStroke, currentShape, pendingEraseIds, surface, pageWidth, pageHeight]);

  /** Client position → page coordinates (1280×720). */
  const toPagePoint = useCallback((clientX: number, clientY: number): Point => {
    const rect = pageRef.current?.getBoundingClientRect();
    const width = rect?.width || BOARD_PAGE_WIDTH;
    const height = rect?.height || BOARD_PAGE_HEIGHT;
    return {
      x: Math.round(((clientX - (rect?.left ?? 0)) / width) * BOARD_PAGE_WIDTH),
      y: Math.round(((clientY - (rect?.top ?? 0)) / height) * BOARD_PAGE_HEIGHT),
    };
  }, []);

  const drawsInk = activeTool === "pen" || activeTool === "highlighter" || activeTool === "eraser";
  const toolWidth =
    activeTool === "highlighter"
      ? BOARD_HIGHLIGHTER_WIDTH
      : activeTool === "eraser"
        ? BOARD_ERASER_WIDTH
        : BOARD_PEN_WIDTHS[activePenWidthKey];

  // Brush-size cursor that follows the mouse (RF10). Moved through the DOM to avoid re-renders.
  const moveCursor = (e: ReactPointerEvent) => {
    const cursor = cursorRef.current;
    const container = containerRef.current;
    if (!cursor || !container) return;
    if (!drawsInk || e.pointerType !== "mouse") {
      cursor.style.opacity = "0";
      return;
    }
    const rect = container.getBoundingClientRect();
    cursor.style.opacity = "1";
    cursor.style.transform = `translate(${e.clientX - rect.left}px, ${e.clientY - rect.top}px) translate(-50%, -50%)`;
  };

  const hideCursor = () => {
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-board-control]")) return;

    const pt = toPagePoint(e.clientX, e.clientY);

    if (drawsInk) {
      setSelectedItemIds([]);
      setEditingTextId(null);
      target.setPointerCapture?.(e.pointerId);
      startDrawing(pt);
    } else if (activeTool === "text") {
      // Keep the focus on the new text box instead of the board region.
      e.preventDefault();
      const newId = addTextBox(pt.x, pt.y, "");
      setEditingTextId(newId);
    } else if (activeTool === "select") {
      setSelectedItemIds([]);
      setEditingTextId(null);
      target.setPointerCapture?.(e.pointerId);
      setLasso({ start: pt, end: pt });
    } else {
      setSelectedItemIds([]);
      setEditingTextId(null);
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    moveCursor(e);

    if (isDrawing) {
      continueDrawing(toPagePoint(e.clientX, e.clientY), { shiftKey: e.shiftKey });
      return;
    }

    if (lasso) {
      setLasso(prev => prev ? { ...prev, end: toPagePoint(e.clientX, e.clientY) } : null);
    } else if (dragState) {
      const rect = pageRef.current?.getBoundingClientRect();
      const ratio = BOARD_PAGE_WIDTH / (rect?.width || BOARD_PAGE_WIDTH);
      const deltaX = (e.clientX - dragState.startX) * ratio;
      const deltaY = (e.clientY - dragState.startY) * ratio;

      if (dragState.type === "move") {
        if (selectedItemIds.length > 1) {
           board.moveSelectedItems(Math.round(deltaX), Math.round(deltaY), false);
           // We need to keep dragging, so we shouldn't accumulate deltaX.
           // Actually, moveSelectedItems applies relative movement! So we must use the delta since *last* frame, not initial.
           // Wait, we can track lastX and lastY.
           // Since we don't have lastX, let's update dragState.
           setDragState({ ...dragState, startX: e.clientX, startY: e.clientY });
        } else {
           updateItemPosition(
             dragState.itemId,
             Math.round(dragState.initialX + deltaX),
             Math.round(dragState.initialY + deltaY),
           );
        }
      } else {
        updateItemDimensions(
          dragState.itemId,
          Math.max(40, Math.round(dragState.initialWidth + deltaX)),
          Math.max(30, Math.round(dragState.initialHeight + deltaY)),
          false
        );
      }
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (isDrawing) {
      finishDrawing();
    }
    if (lasso) {
      const rect = {
        x: Math.min(lasso.start.x, lasso.end.x),
        y: Math.min(lasso.start.y, lasso.end.y),
        width: Math.abs(lasso.end.x - lasso.start.x),
        height: Math.abs(lasso.end.y - lasso.start.y),
      };
      if (rect.width > 2 || rect.height > 2) {
        const hits = findItemsInRect(currentPage.items, rect);
        setSelectedItemIds(hits);
      }
      setLasso(null);
    }
    if (dragState) {
       // if we moved multiple items or resized, commit history
       if (dragState.type === "move" && selectedItemIds.length > 1) {
         board.pushToUndo();
       } else if (dragState.type === "resize") {
         board.pushToUndo();
       }
       setDragState(null);
    }
  };

  // Paste handler (RF02, CA03, CA09)
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await pasteOrDropFile(file, 120, 100);
            return;
          }
        }
      }
    },
    [pasteOrDropFile],
  );

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const pt = toPagePoint(e.clientX, e.clientY);
      await pasteOrDropFile(file, pt.x, pt.y);
    }
  };

  const startDrag = (e: ReactPointerEvent, item: BoardItem, type: "move" | "resize") => {
    e.stopPropagation();
    if (!selectedItemIds.includes(item.id)) {
      setSelectedItemIds([item.id]);
    }
    if (item.type === "text" || item.type === "image" || item.type === "shape") {
      setDragState({
        type,
        itemId: item.id,
        startX: e.clientX,
        startY: e.clientY,
        initialX: item.x,
        initialY: item.y,
        initialWidth: item.width,
        initialHeight: item.height,
      });
    }
  };

  const isEmpty = currentPage.items.length === 0 && !currentStroke && !currentShape;
  const inkColor = resolveInk(activeColor, surface);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label={s.canvasLabel}
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={handleDrop}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={hideCursor}
      className={`absolute inset-0 touch-none overflow-hidden select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-inset ${
        drawsInk ? "cursor-crosshair" : activeTool === "text" ? "cursor-text" : "cursor-default"
      } ${className}`}
    >
      <div
        ref={pageRef}
        style={{
          width: pageWidth,
          height: pageHeight,
          left: (frame.width - pageWidth) / 2,
          top: (frame.height - pageHeight) / 2,
          backgroundColor: palette.background,
        }}
        className="absolute overflow-hidden rounded-xl shadow-[0_1px_3px_rgb(0_0_0/0.12),0_8px_24px_rgb(0_0_0/0.10)] ring-1 ring-border-subtle transition-colors duration-300"
      >
        <canvas ref={backgroundRef} aria-hidden="true" className="absolute inset-0 size-full" />

        {isEmpty && (
          <div
            aria-hidden="true"
            style={{ color: palette.ink.ink }}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center opacity-40"
          >
            <p className="font-display text-2xl @3xl:text-3xl">{s.emptyHint}</p>
            <p className="hidden text-xs tracking-wide @3xl:block">{s.emptyShortcuts}</p>
          </div>
        )}

        {/* Images sit under the ink so the highlighter can mark them. */}
        {currentPage.items.map((item) =>
          item.type === "image" && item.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.url}
              alt={s.pastedImageAlt}
              draggable={false}
              style={{
                left: `${(item.x / BOARD_PAGE_WIDTH) * 100}%`,
                top: `${(item.y / BOARD_PAGE_HEIGHT) * 100}%`,
                width: `${(item.width / BOARD_PAGE_WIDTH) * 100}%`,
                height: `${(item.height / BOARD_PAGE_HEIGHT) * 100}%`,
              }}
              className={`pointer-events-none absolute object-contain transition-opacity select-none ${
                pendingEraseIds.has(item.id) ? "opacity-25" : ""
              }`}
            />
          ) : null,
        )}

        <canvas ref={inkRef} aria-hidden="true" className="absolute inset-0 size-full" />

        {currentPage.items.map((item) => {
          if (item.type === "text") {
            return (
              <TextBoxOverlay
                key={item.id}
                item={item}
                color={resolveInk(item.color, surface)}
                pageScale={pageScale}
                faded={pendingEraseIds.has(item.id)}
                interactive={!drawsInk}
                isSelected={selectedItemIds.includes(item.id)}
                isEditing={editingTextId === item.id}
                onSelect={() => setSelectedItemIds([item.id])}
                onStartEdit={() => setEditingTextId(item.id)}
                onFinishEdit={() => {
                  setEditingTextId(null);
                  // A text box left empty disappears instead of cluttering the page.
                  if (!item.text.trim()) deleteItem(item.id);
                }}
                onChangeText={(text) => updateTextBox(item.id, text)}
                onStartMove={(e) => startDrag(e, item, "move")}
                onStartResize={(e) => startDrag(e, item, "resize")}
              />
            );
          }
          if (item.type === "image") {
            return (
              <ImageOverlay
                key={item.id}
                item={item}
                interactive={!drawsInk}
                isSelected={selectedItemIds.includes(item.id)}
                onSelect={() => setSelectedItemIds([item.id])}
                onStartMove={(e) => startDrag(e, item, "move")}
                onStartResize={(e) => startDrag(e, item, "resize")}
              />
            );
          }
          if (item.type === "shape") {
             return (
              <ShapeOverlay
                key={item.id}
                item={item}
                interactive={!drawsInk}
                isSelected={selectedItemIds.includes(item.id)}
                onSelect={() => setSelectedItemIds([item.id])}
                onStartMove={(e) => startDrag(e, item, "move")}
                onStartResize={(e) => startDrag(e, item, "resize")}
              />
            );
          }
          return null;
        })}

        {lasso && (
          <div
            className="absolute border border-accent bg-accent/10 pointer-events-none z-50"
            style={{
              left: `${(Math.min(lasso.start.x, lasso.end.x) / BOARD_PAGE_WIDTH) * 100}%`,
              top: `${(Math.min(lasso.start.y, lasso.end.y) / BOARD_PAGE_HEIGHT) * 100}%`,
              width: `${(Math.abs(lasso.end.x - lasso.start.x) / BOARD_PAGE_WIDTH) * 100}%`,
              height: `${(Math.abs(lasso.end.y - lasso.start.y) / BOARD_PAGE_HEIGHT) * 100}%`,
            }}
          />
        )}
      </div>

      <div
        ref={cursorRef}
        aria-hidden="true"
        style={{
          width: Math.max(6, toolWidth * pageScale),
          height: Math.max(6, toolWidth * pageScale),
          borderColor: activeTool === "eraser" ? palette.ink.ink : inkColor,
          opacity: 0,
        }}
        className={`pointer-events-none absolute top-0 left-0 rounded-full border-[1.5px] ${
          activeTool === "eraser" && eraserMode === "object" ? "border-dashed" : ""
        }`}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// Text Box Overlay
// ----------------------------------------------------------------------
interface TextBoxOverlayProps {
  item: BoardTextBox;
  color: string;
  pageScale: number;
  faded: boolean;
  interactive: boolean;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onFinishEdit: () => void;
  onChangeText: (text: string) => void;
  onStartMove: (e: ReactPointerEvent) => void;
  onStartResize: (e: ReactPointerEvent) => void;
}

function TextBoxOverlay({
  item,
  color,
  pageScale,
  faded,
  interactive,
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onFinishEdit,
  onChangeText,
  onStartMove,
  onStartResize,
}: TextBoxOverlayProps) {
  // Same font metrics as the PNG export, so what you see is what gets exported.
  const textStyle = {
    color,
    fontSize: item.fontSize * pageScale,
    lineHeight: BOARD_TEXT_LINE_HEIGHT,
  };

  return (
    <div
      data-board-control={interactive || isEditing ? "true" : undefined}
      style={{
        left: `${(item.x / BOARD_PAGE_WIDTH) * 100}%`,
        top: `${(item.y / BOARD_PAGE_HEIGHT) * 100}%`,
        width: `${(item.width / BOARD_PAGE_WIDTH) * 100}%`,
      }}
      className={`absolute z-10 rounded-sm transition-opacity ${faded ? "opacity-25" : ""} ${
        interactive || isEditing ? "" : "pointer-events-none"
      } ${
        isSelected
          ? "outline-2 outline-offset-4 outline-accent"
          : interactive
            ? "hover:outline-1 hover:outline-offset-4 hover:outline-accent/50"
            : ""
      }`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
    >
      {isSelected && !isEditing && (
        <div
          data-board-control="true"
          onPointerDown={onStartMove}
          title={s.dragToMove}
          className="absolute -top-8 left-0 cursor-move rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary shadow-sm select-none"
        >
          {s.move}
        </div>
      )}

      {isEditing ? (
        <textarea
          data-board-control="true"
          autoFocus
          rows={Math.max(1, item.text.split("\n").length)}
          value={item.text}
          onChange={(e) => onChangeText(e.target.value)}
          onBlur={onFinishEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.blur();
          }}
          placeholder={s.typeTextHere}
          style={textStyle}
          className="block w-full resize-none overflow-hidden bg-transparent p-0 font-sans caret-accent outline-none placeholder:opacity-50"
        />
      ) : (
        <div
          style={textStyle}
          className="min-h-[1.3em] cursor-pointer font-sans whitespace-pre-wrap select-none wrap-break-word"
        >
          {item.text || <span className="italic opacity-50">{s.emptyTextBox}</span>}
        </div>
      )}

      {isSelected && (
        <div
          data-board-control="true"
          onPointerDown={onStartResize}
          title={s.dragToResize}
          className="absolute -right-2.5 -bottom-2.5 size-3.5 cursor-se-resize rounded-full bg-accent shadow ring-2 ring-elevated"
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Image Overlay: selection box and handles over the image drawn below the ink.
// ----------------------------------------------------------------------
interface ImageOverlayProps {
  item: BoardImage;
  interactive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onStartMove: (e: ReactPointerEvent) => void;
  onStartResize: (e: ReactPointerEvent) => void;
}

function ImageOverlay({
  item,
  interactive,
  isSelected,
  onSelect,
  onStartMove,
  onStartResize,
}: ImageOverlayProps) {
  return (
    <div
      data-board-control={interactive ? "true" : undefined}
      style={{
        left: `${(item.x / BOARD_PAGE_WIDTH) * 100}%`,
        top: `${(item.y / BOARD_PAGE_HEIGHT) * 100}%`,
        width: `${(item.width / BOARD_PAGE_WIDTH) * 100}%`,
        height: `${(item.height / BOARD_PAGE_HEIGHT) * 100}%`,
      }}
      className={`absolute z-10 rounded-sm ${interactive ? "" : "pointer-events-none"} ${
        isSelected
          ? "cursor-move outline-2 outline-offset-2 outline-accent"
          : interactive
            ? "cursor-pointer hover:outline-1 hover:outline-offset-2 hover:outline-accent/50"
            : ""
      }`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        onStartMove(e);
      }}
    >
      {isSelected && (
        <div
          data-board-control="true"
          onPointerDown={onStartResize}
          title={s.dragToResize}
          className="absolute -right-2 -bottom-2 size-4 cursor-se-resize rounded-full bg-accent shadow ring-2 ring-elevated"
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Shape Overlay: selection box and handles over the shape drawn below the ink.
// ----------------------------------------------------------------------
interface ShapeOverlayProps {
  item: BoardItem; // Should be BoardShape
  interactive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onStartMove: (e: ReactPointerEvent) => void;
  onStartResize: (e: ReactPointerEvent) => void;
}

function ShapeOverlay({
  item,
  interactive,
  isSelected,
  onSelect,
  onStartMove,
  onStartResize,
}: ShapeOverlayProps) {
  if (item.type !== "shape") return null;
  // Account for negative width/height (drawn backwards)
  const left = item.width < 0 ? item.x + item.width : item.x;
  const top = item.height < 0 ? item.y + item.height : item.y;
  const width = Math.abs(item.width);
  const height = Math.abs(item.height);

  return (
    <div
      data-board-control={interactive ? "true" : undefined}
      style={{
        left: `${(left / BOARD_PAGE_WIDTH) * 100}%`,
        top: `${(top / BOARD_PAGE_HEIGHT) * 100}%`,
        width: `${(width / BOARD_PAGE_WIDTH) * 100}%`,
        height: `${(height / BOARD_PAGE_HEIGHT) * 100}%`,
      }}
      className={`absolute z-10 rounded-sm ${interactive ? "" : "pointer-events-none"} ${
        isSelected
          ? "cursor-move outline-2 outline-offset-2 outline-accent"
          : interactive
            ? "cursor-pointer hover:outline-1 hover:outline-offset-2 hover:outline-accent/50"
            : ""
      }`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        onStartMove(e);
      }}
    >
      {isSelected && (
        <div
          data-board-control="true"
          onPointerDown={onStartResize}
          title={s.dragToResize}
          className="absolute -right-2 -bottom-2 size-4 cursor-se-resize rounded-full bg-accent shadow ring-2 ring-elevated"
        />
      )}
    </div>
  );
}
