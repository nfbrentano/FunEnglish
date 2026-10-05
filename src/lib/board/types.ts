/**
 * Types and constants for the Virtual Classroom Whiteboard (SDD/2026-10-03_07-lousa-virtual.md).
 */

export type BoardTool = "pen" | "highlighter" | "eraser" | "text" | "select";

export type BoardBackground = "white" | "grid" | "lines";

export interface Point {
  x: number;
  y: number;
}

export interface BoardStroke {
  id: string;
  type: "stroke";
  tool: "pen" | "highlighter" | "eraser";
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

export type BoardItem = BoardStroke | BoardTextBox | BoardImage;

export interface BoardPage {
  id: string;
  items: BoardItem[];
  background: BoardBackground;
}

export interface BoardData {
  pages: BoardPage[];
  currentPageIndex: number;
}

export const BOARD_COLORS = [
  "#1e293b", // Black / Dark slate
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow / Amber
  "#8b5cf6", // Purple
] as const;

export const BOARD_WHITE = "#ffffff";

export type BoardColor = (typeof BOARD_COLORS)[number];

export const BOARD_PEN_WIDTHS = {
  thin: 3,
  medium: 6,
  thick: 12,
} as const;

export type BoardPenWidthKey = keyof typeof BOARD_PEN_WIDTHS;

export const BOARD_HIGHLIGHTER_WIDTH = 24;
export const BOARD_ERASER_WIDTH = 24;

export const MAX_PAGES = 10;
export const MAX_UNDO_STEPS = 50;
export const MAX_IMAGE_DIMENSION = 1600;
export const MAX_BOARD_TEXT_CHARS = 5000;

export const BOARD_STORAGE_KEY_PREFIX = "fun-english:whiteboard:";
