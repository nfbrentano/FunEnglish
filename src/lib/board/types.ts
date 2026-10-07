/**
 * Types and constants for the Virtual Classroom Whiteboard (SDD/2026-10-03_07-lousa-virtual.md,
 * SDD/2026-10-06_redesign-ux-ui-lousa.md).
 */

/** "laser" points without drawing: its trail is never saved, exported or undone (RF05). */
export type BoardTool = "pen" | "highlighter" | "eraser" | "text" | "select" | "laser" | "shape" | "reveal";

export type BoardBackground = 
  | "white" 
  | "grid" 
  | "lines" 
  | "timeline" 
  | "conjugation" 
  | "tchart" 
  | "calligraphy";

export interface Point {
  x: number;
  y: number;
}

/** `color` holds an ink key ("ink", "red"…); boards saved before ink keys may hold a hex value. */
export interface BoardStroke {
  id: string;
  type: "stroke";
  tool: "pen" | "highlighter" | "eraser" | "laser";
  color: string;
  width: number;
  points: Point[];
}

export interface BoardTextBox {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  isBold?: boolean;
}

export interface BoardShape {
  id: string;
  type: "shape";
  shapeType: "line" | "arrow" | "rectangle" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
}

export interface BoardImage {
  id: string;
  type: "image";
  url: string;
  storagePath?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

export type BoardItem = BoardStroke | BoardTextBox | BoardImage | BoardShape;

export interface BoardPage {
  id: string;
  items: BoardItem[];
  background: BoardBackground;
}

export interface BoardData {
  pages: BoardPage[];
  currentPageIndex: number;
}

export type { BoardInk as BoardColor } from "./ink";

/** "area" cuts through ink where it passes; "object" removes whole strokes, texts and images (RF06). */
export type BoardEraserMode = "area" | "object";

export const BOARD_PEN_WIDTHS = {
  thin: 3,
  medium: 6,
  thick: 12,
} as const;

export type BoardPenWidthKey = keyof typeof BOARD_PEN_WIDTHS;
export const BOARD_PEN_WIDTH_KEYS: BoardPenWidthKey[] = ["thin", "medium", "thick"];

export const BOARD_HIGHLIGHTER_WIDTH = 24;
export const BOARD_ERASER_WIDTH = 24;

export const MAX_PAGES = 10;
export const MAX_UNDO_STEPS = 50;
export const MAX_IMAGE_DIMENSION = 1600;
export const MAX_BOARD_TEXT_CHARS = 5000;

export const BOARD_STORAGE_KEY_PREFIX = "fun-english:whiteboard:";
