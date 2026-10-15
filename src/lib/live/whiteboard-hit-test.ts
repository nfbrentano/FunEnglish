import { strokeContainsPoint } from "@/lib/board/hit-test";
import type { Point } from "@/lib/board/types";

export interface LiveStrokeLike {
  id: string;
  points: number[];
  size: number;
  tool: "pen" | "eraser";
}

/** Converts a flat array of numbers [x0, y0, x1, y1, ...] to Point array. */
export function flatNumbersToPoints(flat: number[]): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < flat.length - 1; i += 2) {
    points.push({ x: flat[i], y: flat[i + 1] });
  }
  return points;
}

/**
 * Returns IDs of live strokes that touch the given point within `radius`.
 * Eraser strokes are ignored (RF04, CT04).
 */
export function findLiveStrokesAt<T extends LiveStrokeLike>(
  strokes: T[],
  pt: Point,
  radius = 0,
): string[] {
  const hits: string[] = [];
  for (const stroke of strokes) {
    if (stroke.tool === "eraser") continue;
    const points = flatNumbersToPoints(stroke.points);
    if (strokeContainsPoint(points, stroke.size, pt, radius)) {
      hits.push(stroke.id);
    }
  }
  return hits;
}
