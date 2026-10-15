"use client";

import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { getDatabaseInstance } from "@/lib/firebase";
import { ref, onValue, set, remove, update } from "firebase/database";
import { Eraser, Pencil, Radio, Spline, Trash2, X } from "lucide-react";
import {
  BoardButton,
  Dock,
  DockDivider,
  DockPositionToggle,
  EraserModePicker,
  InkPicker,
  Island,
  StyleSwatch,
  dockPopoverClasses,
} from "@/components/board/board-ui";
import { Popover } from "@/components/ui/popover";
import { BOARD_SURFACES, resolveInk, type BoardInk } from "@/lib/board/ink";
import { setEraserModePreference, useBoardSurface, useDockPosition, useEraserMode } from "@/lib/board/preferences";
import { BOARD_PEN_WIDTHS, type BoardPenWidthKey } from "@/lib/board/types";
import { findLiveStrokesAt } from "@/lib/live/whiteboard-hit-test";
import { strings } from "@/lib/strings";

const s = strings.whiteboard;
const ERASER_SIZE = 20;

/** `color` holds an ink key; strokes synced before ink keys hold a CSS color name. */
interface Stroke {
  id: string;
  points: number[];
  color: string;
  size: number;
  tool: "pen" | "eraser";
}

// Konva strokes from realtime db might lack specific types
type RTDBStrokeData = Record<string, Omit<Stroke, "id">>;

interface InteractiveWhiteboardProps {
  roomCode: string;
  isTeacher: boolean;
  onClose?: () => void;
}

export function InteractiveWhiteboard({
  roomCode,
  isTeacher,
  onClose,
}: InteractiveWhiteboardProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState<BoardInk>("ink");
  const [widthKey, setWidthKey] = useState<BoardPenWidthKey>("thin");
  const [showStyle, setShowStyle] = useState(false);
  const eraserMode = useEraserMode();
  const [showEraserMenu, setShowEraserMenu] = useState(false);
  const [pendingEraseIds, setPendingEraseIds] = useState<ReadonlySet<string>>(new Set());
  const pendingEraseRef = useRef<Set<string> | null>(null);

  const surface = useBoardSurface();
  const dockPosition = useDockPosition();
  const palette = BOARD_SURFACES[surface];
  const [isDrawing, setIsDrawing] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const currentStrokeIdRef = useRef<string | null>(null);

  // Sync with Firebase Realtime Database
  useEffect(() => {
    if (!roomCode) return;
    const db = getDatabaseInstance();
    const drawingsRef = ref(db, `liveRooms/${roomCode}/drawings`);

    const unsubscribe = onValue(drawingsRef, (snapshot) => {
      const data = snapshot.val() as RTDBStrokeData | null;
      if (data) {
        // Convert map to array and sort by ID (which has timestamp)
        const strokesArray = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
          }))
          .sort((a, b) => a.id.localeCompare(b.id));
        setStrokes(strokesArray);
      } else {
        setStrokes([]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomCode]);

  // Keyboard shortcuts for teacher (E, Shift+E, P)
  useEffect(() => {
    if (!isTeacher) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === "e") {
        if (e.shiftKey) {
          setEraserModePreference(eraserMode === "area" ? "object" : "area");
        }
        setTool("eraser");
      } else if (key === "p") {
        setTool("pen");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTeacher, eraserMode]);

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (!isTeacher) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    setIsDrawing(true);

    if (tool === "eraser" && eraserMode === "object") {
      pendingEraseRef.current = new Set();
      const hits = findLiveStrokesAt(strokes, { x: pos.x, y: pos.y }, ERASER_SIZE / 2);
      if (hits.length > 0) {
        hits.forEach((id) => pendingEraseRef.current?.add(id));
        setPendingEraseIds(new Set(pendingEraseRef.current));
      }
      return;
    }

    const newStrokeId = `stroke_${Date.now().toString().padStart(15, "0")}_${Math.floor(Math.random() * 1000)}`;
    currentStrokeIdRef.current = newStrokeId;

    const newStroke: Stroke = {
      id: newStrokeId,
      points: [pos.x, pos.y],
      color,
      size: tool === "eraser" ? ERASER_SIZE : BOARD_PEN_WIDTHS[widthKey],
      tool,
    };

    // Optimistic UI update
    setStrokes((prev) => [...prev, newStroke]);
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (!isTeacher || !isDrawing) return;
    const point = e.target.getStage()?.getPointerPosition();
    if (!point) return;

    if (tool === "eraser" && eraserMode === "object") {
      const pending = pendingEraseRef.current;
      if (!pending) return;
      const hits = findLiveStrokesAt(strokes, { x: point.x, y: point.y }, ERASER_SIZE / 2);
      if (hits.some((id) => !pending.has(id))) {
        hits.forEach((id) => pending.add(id));
        setPendingEraseIds(new Set(pending));
      }
      return;
    }

    if (!currentStrokeIdRef.current) return;
    setStrokes((prev) => {
      const lastStroke = prev[prev.length - 1];
      if (!lastStroke || lastStroke.id !== currentStrokeIdRef.current) return prev;

      const updatedStroke = {
        ...lastStroke,
        points: lastStroke.points.concat([point.x, point.y]),
      };

      return prev.slice(0, prev.length - 1).concat([updatedStroke]);
    });
  };

  const handlePointerUp = () => {
    if (!isTeacher || !isDrawing) return;
    setIsDrawing(false);

    if (tool === "eraser" && eraserMode === "object") {
      const erased = pendingEraseRef.current;
      pendingEraseRef.current = null;
      setPendingEraseIds(new Set());
      if (erased && erased.size > 0) {
        setStrokes((prev) => prev.filter((s) => !erased.has(s.id)));
        const db = getDatabaseInstance();
        const updates: Record<string, null> = {};
        erased.forEach((id) => {
          updates[id] = null;
        });
        update(ref(db, `liveRooms/${roomCode}/drawings`), updates).catch((err) =>
          console.error("Failed to delete strokes:", err),
        );
      }
      return;
    }

    if (!currentStrokeIdRef.current) return;

    // Sync to Firebase
    const lastStroke = strokes.find((s) => s.id === currentStrokeIdRef.current);
    if (lastStroke) {
      const db = getDatabaseInstance();
      const strokeRef = ref(db, `liveRooms/${roomCode}/drawings/${lastStroke.id}`);
      set(strokeRef, {
        points: lastStroke.points,
        color: lastStroke.color,
        size: lastStroke.size,
        tool: lastStroke.tool,
      }).catch((err) => console.error("Failed to sync stroke:", err));
    }
  };

  const handleClear = () => {
    if (!isTeacher) return;
    const db = getDatabaseInstance();
    const drawingsRef = ref(db, `liveRooms/${roomCode}/drawings`);
    remove(drawingsRef).catch((err) => console.error("Failed to clear board:", err));
  };

  // Use state for window dimensions to avoid hydration errors
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [isTeacher]);

  if (dimensions.width === 0) return null; // Avoid rendering on server

  // Same islands, dock and inks as the classroom board (SDD/2026-10-06_redesign-ux-ui-lousa.md, RF14).
  return (
    <div
      style={{ backgroundColor: palette.background }}
      className="@container absolute inset-0 z-50 isolate flex flex-col overflow-hidden touch-none transition-colors duration-300"
    >
      {isTeacher ? (
        <>
          <Dock position={dockPosition} label={s.tools}>
            <BoardButton
              label={s.pen}
              tooltip={dockPosition}
              icon={<Pencil aria-hidden="true" className="size-4" />}
              onClick={() => setTool("pen")}
              active={tool === "pen"}
              pressed={tool === "pen"}
            />
            <div className="relative">
              <BoardButton
                label={s.eraser}
                shortcut="E"
                tooltip={dockPosition}
                icon={
                  eraserMode === "area" ? (
                    <Eraser aria-hidden="true" className="size-4" />
                  ) : (
                    <Spline aria-hidden="true" className="size-4" />
                  )
                }
                onClick={() => {
                  if (tool === "eraser") setShowEraserMenu((open) => !open);
                  else {
                    setTool("eraser");
                    setShowEraserMenu(false);
                  }
                }}
                active={tool === "eraser"}
                pressed={tool === "eraser"}
                expanded={showEraserMenu}
              />
              <Popover
                open={showEraserMenu}
                onClose={() => setShowEraserMenu(false)}
                label={s.eraserModes}
                className={`w-56 ${dockPopoverClasses(dockPosition)}`}
              >
                <EraserModePicker
                  mode={eraserMode}
                  onChange={(mode) => {
                    setEraserModePreference(mode);
                    setShowEraserMenu(false);
                  }}
                />
              </Popover>
            </div>
            <DockDivider position={dockPosition} />
            <div className="relative">
              <BoardButton
                label={s.style}
                tooltip={dockPosition}
                icon={<StyleSwatch color={color} widthKey={widthKey} surface={surface} />}
                onClick={() => setShowStyle((open) => !open)}
                expanded={showStyle}
                className={showStyle ? "bg-accent-muted" : ""}
              />
              <Popover
                open={showStyle}
                onClose={() => setShowStyle(false)}
                label={s.style}
                className={`w-64 ${dockPopoverClasses(dockPosition)}`}
              >
                <InkPicker
                  surface={surface}
                  color={color}
                  onColor={(ink) => {
                    setColor(ink);
                    setTool("pen");
                  }}
                  widthKey={widthKey}
                  onWidth={setWidthKey}
                />
              </Popover>
            </div>
            <span className="hidden @3xl:contents">
              <DockDivider position={dockPosition} />
            </span>
            <DockPositionToggle position={dockPosition} />
          </Dock>

          <Island className="absolute top-3 right-3 z-30">
            <BoardButton
              danger
              label={s.clear}
              icon={<Trash2 aria-hidden="true" className="size-4" />}
              onClick={handleClear}
            />
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="ml-0.5 flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent pointer-coarse:h-11"
              >
                <X aria-hidden="true" className="size-4" />
                {s.closeBoard}
              </button>
            )}
          </Island>
        </>
      ) : null}

      <span className="pointer-events-none absolute top-3 left-3 z-30 flex h-9 items-center gap-1.5 rounded-full border border-border-subtle bg-elevated/90 px-3 text-xs font-semibold text-fg shadow-sm backdrop-blur-md">
        <Radio aria-hidden="true" className="size-3.5 text-accent" />
        {s.liveBoard}
      </span>

      <div className="flex-1 overflow-hidden relative cursor-crosshair">
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          ref={stageRef}
        >
          <Layer>
            {strokes.map((stroke) => (
              <Line
                key={stroke.id}
                points={stroke.points}
                stroke={
                  stroke.tool === "eraser" ? palette.ink.ink : resolveInk(stroke.color, surface)
                }
                strokeWidth={stroke.size}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                opacity={pendingEraseIds.has(stroke.id) ? 0.25 : 1}
                globalCompositeOperation={
                  stroke.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
