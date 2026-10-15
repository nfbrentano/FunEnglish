import { describe, expect, it } from "vitest";
import { findLiveStrokesAt, flatNumbersToPoints, type LiveStrokeLike } from "@/lib/live/whiteboard-hit-test";

describe("Live Whiteboard Hit Testing (RF04, CA04, CT04)", () => {
  it("converts flat number array to Point objects correctly", () => {
    const flat = [10, 20, 30, 40, 50, 60];
    const points = flatNumbersToPoints(flat);
    expect(points).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ]);
  });

  it("CT04 / CA04: detects strokes touched by eraser point within reach and ignores eraser strokes", () => {
    const strokes: LiveStrokeLike[] = [
      {
        id: "stroke-1",
        points: [100, 100, 200, 100], // Horizontal line from (100,100) to (200,100)
        size: 6,
        tool: "pen",
      },
      {
        id: "stroke-2",
        points: [300, 300, 400, 400], // Far line
        size: 6,
        tool: "pen",
      },
      {
        id: "stroke-eraser",
        points: [150, 95, 150, 105], // Crosses stroke-1, but is an eraser stroke
        size: 20,
        tool: "eraser",
      },
    ];

    // Point right on stroke-1
    const hitsDirect = findLiveStrokesAt(strokes, { x: 150, y: 100 }, 10);
    expect(hitsDirect).toEqual(["stroke-1"]);

    // Point close to stroke-1 (within tolerance)
    const hitsNear = findLiveStrokesAt(strokes, { x: 150, y: 105 }, 10);
    expect(hitsNear).toEqual(["stroke-1"]);

    // Point far away
    const hitsFar = findLiveStrokesAt(strokes, { x: 50, y: 50 }, 10);
    expect(hitsFar).toEqual([]);

    // Eraser stroke should never be returned even if point is directly on it
    const hitsEraserOnly = findLiveStrokesAt(strokes, { x: 150, y: 95 }, 2);
    expect(hitsEraserOnly).not.toContain("stroke-eraser");
  });
});
