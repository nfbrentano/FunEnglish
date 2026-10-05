"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { renderBoardPageToCanvas } from "@/lib/board/board-persistence";
import {
  BOARD_WHITE,
  type BoardImage,
  type BoardItem,
  type BoardTextBox,
  type Point,
} from "@/lib/board/types";
import type { WhiteboardInstance } from "@/lib/board/use-whiteboard";

export interface BoardCanvasProps {
  board: WhiteboardInstance;
  className?: string;
}

export function BoardCanvas({ board, className = "" }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    currentPage,
    activeTool,
    selectedItemId,
    isDrawing,
    currentStroke,
    startDrawing,
    continueDrawing,
    finishDrawing,
    setSelectedItemId,
    addTextBox,
    updateTextBox,
    updateItemPosition,
    updateItemDimensions,
    deleteItem,
    pasteOrDropFile,
    undo,
    redo,
  } = board;

  // Dragging / resizing state for selected items
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

  // Editing text box state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Get canvas coordinates from mouse/touch event
  const getCanvasPoint = useCallback((e: ReactPointerEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }, []);

  // Redraw canvas whenever items or currentStroke change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render base page
    renderBoardPageToCanvas(ctx, currentPage, canvas.width, canvas.height);

    // If currently drawing, render the active in-progress stroke
    if (currentStroke && currentStroke.points.length > 0) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = currentStroke.width;

      if (currentStroke.tool === "eraser") {
        ctx.strokeStyle = BOARD_WHITE;
      } else if (currentStroke.tool === "highlighter") {
        ctx.strokeStyle = currentStroke.color;
        ctx.globalAlpha = 0.4;
      } else {
        ctx.strokeStyle = currentStroke.color;
        ctx.globalAlpha = 1.0;
      }

      ctx.beginPath();
      const first = currentStroke.points[0];
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < currentStroke.points.length; i++) {
        const pt = currentStroke.points[i];
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [currentPage, currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer event handlers
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // If target is inside an overlay input or handle, don't start drawing
    const target = e.target as HTMLElement;
    if (target.dataset.boardControl) return;

    const pt = getCanvasPoint(e);

    if (activeTool === "pen" || activeTool === "highlighter" || activeTool === "eraser") {
      setSelectedItemId(null);
      setEditingTextId(null);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      startDrawing(pt);
    } else if (activeTool === "text") {
      // Place new text box
      const newId = addTextBox(pt.x, pt.y, "");
      setEditingTextId(newId);
    } else if (activeTool === "select") {
      // Deselect if clicking on empty canvas
      setSelectedItemId(null);
      setEditingTextId(null);
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDrawing) {
      const pt = getCanvasPoint(e);
      continueDrawing(pt);
      return;
    }

    if (dragState) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const deltaX = (e.clientX - dragState.startX) * scaleX;
      const deltaY = (e.clientY - dragState.startY) * scaleY;

      if (dragState.type === "move") {
        const newX = Math.round(dragState.initialX + deltaX);
        const newY = Math.round(dragState.initialY + deltaY);
        updateItemPosition(dragState.itemId, newX, newY);
      } else if (dragState.type === "resize") {
        const newWidth = Math.max(40, Math.round(dragState.initialWidth + deltaX));
        const newHeight = Math.max(30, Math.round(dragState.initialHeight + deltaY));
        updateItemDimensions(dragState.itemId, newWidth, newHeight);
      }
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDrawing) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture release ignore
      }
      finishDrawing();
    }
    if (dragState) {
      setDragState(null);
    }
  };

  // Keyboard navigation & shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Check for undo/redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }

    // Delete selected item
    if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId && !editingTextId) {
      e.preventDefault();
      deleteItem(selectedItemId);
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

  // Drag and drop handler (RF02, CA03, CA09)
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const pt = getCanvasPoint(e as unknown as ReactPointerEvent);
      await pasteOrDropFile(file, pt.x, pt.y);
    }
  };

  // Start moving item
  const startMoveItem = (e: ReactPointerEvent, item: BoardItem) => {
    e.stopPropagation();
    setSelectedItemId(item.id);

    if (item.type === "text" || item.type === "image") {
      setDragState({
        type: "move",
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

  // Start resizing item
  const startResizeItem = (e: ReactPointerEvent, item: BoardItem) => {
    e.stopPropagation();
    if (item.type === "text" || item.type === "image") {
      setDragState({
        type: "resize",
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

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Whiteboard Canvas"
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-full select-none overflow-hidden touch-none focus:outline-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="w-full h-full block bg-white cursor-crosshair"
      />

      {/* Interactive Overlay for Text Boxes and Images */}
      {currentPage.items.map((item) => {
        if (item.type === "text") {
          return (
            <TextBoxOverlay
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              isEditing={editingTextId === item.id}
              onSelect={() => setSelectedItemId(item.id)}
              onStartEdit={() => setEditingTextId(item.id)}
              onFinishEdit={() => setEditingTextId(null)}
              onChangeText={(text) => updateTextBox(item.id, text)}
              onStartMove={(e) => startMoveItem(e, item)}
              onStartResize={(e) => startResizeItem(e, item)}
            />
          );
        }

        if (item.type === "image") {
          return (
            <ImageOverlay
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              onSelect={() => setSelectedItemId(item.id)}
              onStartMove={(e) => startMoveItem(e, item)}
              onStartResize={(e) => startResizeItem(e, item)}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// Text Box Overlay
// ----------------------------------------------------------------------
interface TextBoxOverlayProps {
  item: BoardTextBox;
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
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onFinishEdit,
  onChangeText,
  onStartMove,
  onStartResize,
}: TextBoxOverlayProps) {
  // Convert 1280x720 canvas coordinates to percentages for responsive scaling
  const leftPct = (item.x / 1280) * 100;
  const topPct = (item.y / 720) * 100;
  const widthPct = (item.width / 1280) * 100;

  return (
    <div
      data-board-control="true"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
      }}
      className={`absolute z-10 p-1.5 transition-shadow ${
        isSelected
          ? "ring-2 ring-blue-500 rounded bg-blue-50/20"
          : "hover:ring-1 hover:ring-slate-300 rounded"
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
      {/* Move handle */}
      {isSelected && (
        <div
          data-board-control="true"
          onPointerDown={onStartMove}
          title="Drag to move"
          className="absolute -top-3.5 left-0 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-medium cursor-move select-none"
        >
          Move
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
          placeholder="Type text…"
          style={{ color: item.color }}
          className="w-full bg-white/95 rounded p-1 text-base outline-none resize-none border border-blue-400 font-sans shadow-sm"
        />
      ) : (
        <div
          style={{ color: item.color }}
          className="whitespace-pre-wrap break-words text-base font-sans select-none cursor-pointer min-h-[1.5em]"
        >
          {item.text || <span className="text-slate-400 italic">Empty text box</span>}
        </div>
      )}

      {/* Resize handle */}
      {isSelected && (
        <div
          data-board-control="true"
          onPointerDown={onStartResize}
          title="Drag to resize"
          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 rounded-full cursor-se-resize shadow"
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Image Overlay
// ----------------------------------------------------------------------
interface ImageOverlayProps {
  item: BoardImage;
  isSelected: boolean;
  onSelect: () => void;
  onStartMove: (e: ReactPointerEvent) => void;
  onStartResize: (e: ReactPointerEvent) => void;
}

function ImageOverlay({
  item,
  isSelected,
  onSelect,
  onStartMove,
  onStartResize,
}: ImageOverlayProps) {
  const leftPct = (item.x / 1280) * 100;
  const topPct = (item.y / 720) * 100;
  const widthPct = (item.width / 1280) * 100;
  const heightPct = (item.height / 720) * 100;

  return (
    <div
      data-board-control="true"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
      }}
      className={`absolute z-10 transition-shadow ${
        isSelected
          ? "ring-2 ring-blue-500 rounded bg-blue-500/10 cursor-move"
          : "hover:ring-1 hover:ring-slate-300 rounded cursor-pointer"
      }`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        onStartMove(e);
      }}
    >
      {/* Visual Image Render */}
      {item.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt="Whiteboard pasted media"
          className="w-full h-full object-contain pointer-events-none select-none rounded"
          draggable={false}
        />
      )}

      {/* Resize handle */}
      {isSelected && (
        <div
          data-board-control="true"
          onPointerDown={onStartResize}
          title="Drag to resize image"
          className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-600 rounded-full cursor-se-resize shadow ring-2 ring-white"
        />
      )}
    </div>
  );
}
