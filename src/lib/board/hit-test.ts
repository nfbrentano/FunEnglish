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
