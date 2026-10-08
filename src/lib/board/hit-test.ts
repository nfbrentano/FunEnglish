import { BOARD_TEXT_LINE_HEIGHT } from "./board-persistence";
import type { BoardItem, Point } from "./types";

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Whether the point (page coordinates) touches the item, with `radius` of tolerance. */
export function itemContainsPoint(item: BoardItem, pt: Point, radius = 0): boolean {
  if (item.type === "stroke") {
    if (item.tool === "eraser") return false;
    const reach = radius + item.width / 2;
    const [first, ...rest] = item.points;
    if (!first) return false;
    if (rest.length === 0) return Math.hypot(pt.x - first.x, pt.y - first.y) <= reach;
    let previous = first;
    for (const current of rest) {
      if (distanceToSegment(pt, previous, current) <= reach) return true;
      previous = current;
    }
    return false;
  }

  if (item.type === "shape") {
    // simplified hit test for shape: check bounding box
    const half = item.strokeWidth / 2;
    const reach = radius + half;
    return (
      pt.x >= item.x - reach &&
      pt.x <= item.x + item.width + reach &&
      pt.y >= item.y - reach &&
      pt.y <= item.y + item.height + reach
    );
  }

  const height =
    item.type === "text"
      ? Math.max(item.height, item.text.split("\n").length * item.fontSize * BOARD_TEXT_LINE_HEIGHT)
      : item.height;
  return (
    pt.x >= item.x - radius &&
    pt.x <= item.x + item.width + radius &&
    pt.y >= item.y - radius &&
    pt.y <= item.y + height + radius
  );
}

/** Ids of the items under the point, used by the whole-stroke eraser (RF06). */
export function findItemsAt(items: BoardItem[], pt: Point, radius = 0): string[] {
  return items.filter((item) => itemContainsPoint(item, pt, radius)).map((item) => item.id);
}

/** Axis-aligned rectangle in page coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Normalized rectangle between two corners, in any drag direction. */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/** Bounding box of an item, including half the stroke width (SDD/2026-10-07_melhorias-da-lousa.md). */
export function getItemBounds(item: BoardItem): Rect {
  if (item.type === "stroke") {
    if (item.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of item.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const half = item.width / 2;
    return { x: minX - half, y: minY - half, width: maxX - minX + item.width, height: maxY - minY + item.width };
  }
  if (item.type === "shape") {
    const half = item.strokeWidth / 2;
    return { x: item.x - half, y: item.y - half, width: item.width + item.strokeWidth, height: item.height + item.strokeWidth };
  }
  const height =
    item.type === "text"
      ? Math.max(item.height, item.text.split("\n").length * item.fontSize * BOARD_TEXT_LINE_HEIGHT)
      : item.height;
  return { x: item.x, y: item.y, width: item.width, height };
}

/** Union of the bounds of several items, or null when there are none. */
export function getItemsBounds(items: BoardItem[]): Rect | null {
  if (items.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    const b = getItemBounds(item);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;
}

function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const cross = (o: Point, p: Point, q: Point) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 <= 0 && d3 * d4 <= 0;
}

function segmentIntersectsRect(a: Point, b: Point, r: Rect): boolean {
  if (pointInRect(a, r) || pointInRect(b, r)) return true;
  const tl = { x: r.x, y: r.y };
  const tr = { x: r.x + r.width, y: r.y };
  const br = { x: r.x + r.width, y: r.y + r.height };
  const bl = { x: r.x, y: r.y + r.height };
  return (
    segmentsCross(a, b, tl, tr) ||
    segmentsCross(a, b, tr, br) ||
    segmentsCross(a, b, br, bl) ||
    segmentsCross(a, b, bl, tl)
  );
}

/**
 * Whether the item touches the rectangle (RF02). Ink strokes count when any part of the line,
 * widened by half its width, crosses the rectangle. Eraser cuts are only picked up when they lie
 * entirely inside it, so a drawing and its own corrections move together without dragging along
 * cuts made on other strokes.
 */
export function itemIntersectsRect(item: BoardItem, rect: Rect): boolean {
  const bounds = getItemBounds(item);
  if (item.type !== "stroke") return rectsOverlap(bounds, rect);
  if (item.tool === "eraser") return item.points.length > 0 && rectContainsRect(rect, bounds);
  if (!rectsOverlap(bounds, rect)) return false;

  const half = item.width / 2;
  const grown = { x: rect.x - half, y: rect.y - half, width: rect.width + item.width, height: rect.height + item.width };
  const [first, ...rest] = item.points;
  if (!first) return false;
  if (rest.length === 0) return pointInRect(first, grown);
  let previous = first;
  for (const current of rest) {
    if (segmentIntersectsRect(previous, current, grown)) return true;
    previous = current;
  }
  return false;
}

/** Ids of the items touched by a marquee rectangle (RF02, CT03). */
export function findItemsInRect(items: BoardItem[], rect: Rect): string[] {
  return items.filter((item) => itemIntersectsRect(item, rect)).map((item) => item.id);
}

/** Topmost item under the point (last drawn wins), ignoring eraser cuts. */
export function findTopItemAt(items: BoardItem[], pt: Point, radius = 0): BoardItem | null {
  for (let i = items.length - 1; i >= 0; i--) {
    if (itemContainsPoint(items[i], pt, radius)) return items[i];
  }
  return null;
}

/** Copy of the item moved by (dx, dy); strokes move every point (RF03). */
export function translateItem<T extends BoardItem>(item: T, dx: number, dy: number): T {
  if (item.type === "stroke") {
    return { ...item, points: item.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  }
  return { ...item, x: item.x + dx, y: item.y + dy };
}
