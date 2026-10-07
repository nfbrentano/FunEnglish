import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  clearBoardLocally,
  extractBoardText,
  extractBoardWords,
  loadBoardLocally,
  saveBoardLocally,
} from "@/lib/board/board-persistence";
import type { BoardPage } from "@/lib/board/types";
import { useWhiteboard } from "@/lib/board/use-whiteboard";

describe("Whiteboard Persistence & Text Extraction (RNF01, RNF02, CA06, CA08)", () => {
  it("CT06 / CA06: extracts vocabulary words ('suitcase', 'boarding pass') from text boxes", () => {
    const pages: BoardPage[] = [
      {
        id: "p1",
        background: "white",
        items: [
          {
            id: "t1",
            type: "text",
            text: "suitcase",
            x: 50,
            y: 50,
            width: 100,
            height: 40,
            fontSize: 24,
            color: "#000",
          },
          {
            id: "t2",
            type: "text",
            text: "boarding pass\nairport gate",
            x: 200,
            y: 50,
            width: 150,
            height: 60,
            fontSize: 24,
            color: "#000",
          },
        ],
      },
    ];

    const words = extractBoardWords(pages);
    expect(words).toContain("suitcase");
    expect(words).toContain("boarding pass");
    expect(words).toContain("airport gate");
  });

  it("RNF02: extracts plain text for sessions/{id}.boardText up to 5,000 characters", () => {
    const pages: BoardPage[] = [
      {
        id: "p1",
        background: "white",
        items: [
          {
            id: "t1",
            type: "text",
            text: "Notes for today:\n1. Simple past practice\n2. Irregular verbs",
            x: 10,
            y: 10,
            width: 200,
            height: 100,
            fontSize: 20,
            color: "#000",
          },
        ],
      },
      {
        id: "p2",
        background: "grid",
        items: [
          {
            id: "t2",
            type: "text",
            text: "Review homework page 42",
            x: 20,
            y: 20,
            width: 200,
            height: 60,
            fontSize: 20,
            color: "#000",
          },
        ],
      },
    ];

    const text = extractBoardText(pages);
    expect(text).toContain("Notes for today:");
    expect(text).toContain("[Page 1]");
    expect(text).toContain("[Page 2]");
    expect(text).toContain("Review homework page 42");
    expect(text.length).toBeLessThanOrEqual(5000);
  });

  it("CT08 / CA08: saves and restores whiteboard state in localStorage across page reloads", () => {
    const sessionId = "test-session-123";
    const sampleData = {
      pages: [
        {
          id: "page-1",
          background: "grid" as const,
          items: [
            {
              id: "t1",
              type: "text" as const,
              text: "Persisted vocabulary",
              x: 100,
              y: 100,
              width: 180,
              height: 50,
              fontSize: 24,
              color: "#3b82f6",
            },
          ],
        },
      ],
      currentPageIndex: 0,
    };

    saveBoardLocally(sessionId, sampleData);
    const loaded = loadBoardLocally(sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded?.pages).toHaveLength(1);
    expect(loaded?.pages[0].background).toBe("grid");
    expect(loaded?.pages[0].items[0].type).toBe("text");

    clearBoardLocally(sessionId);
    expect(loadBoardLocally(sessionId)).toBeNull();
  });
});

describe("useWhiteboard Hook Actions & Logic (CA01, CA02, CA05)", () => {
  it("CT01 / CA01: drawing with red thick pen records stroke with ink 'red' and width 12", () => {
    const { result } = renderHook(() => useWhiteboard({ sessionId: "draw-test" }));

    act(() => {
      result.current.setActiveColor("red");
      result.current.setActivePenWidthKey("thick");
    });

    expect(result.current.activeColor).toBe("red");
    expect(result.current.activePenWidthKey).toBe("thick");

    act(() => {
      result.current.startDrawing({ x: 10, y: 10 });
      result.current.continueDrawing({ x: 50, y: 50 });
      result.current.finishDrawing();
    });

    const items = result.current.currentPage.items;
    expect(items).toHaveLength(1);
    const stroke = items[0];
    expect(stroke.type).toBe("stroke");
    if (stroke.type === "stroke") {
      expect(stroke.color).toBe("red");
      expect(stroke.width).toBe(12);
      expect(stroke.points).toHaveLength(2);
    }
  });

  it("CT02 / CA02: given 3 strokes drawn, undoing twice and redoing once leaves 2 strokes", () => {
    const { result } = renderHook(() => useWhiteboard({ sessionId: "undo-test" }));

    // Draw Stroke 1
    act(() => {
      result.current.startDrawing({ x: 0, y: 0 });
      result.current.continueDrawing({ x: 10, y: 10 });
      result.current.finishDrawing();
    });

    // Draw Stroke 2
    act(() => {
      result.current.startDrawing({ x: 20, y: 20 });
      result.current.continueDrawing({ x: 30, y: 30 });
      result.current.finishDrawing();
    });

    // Draw Stroke 3
    act(() => {
      result.current.startDrawing({ x: 40, y: 40 });
      result.current.continueDrawing({ x: 50, y: 50 });
      result.current.finishDrawing();
    });

    expect(result.current.currentPage.items).toHaveLength(3);

    // Undo twice
    act(() => {
      result.current.undo();
    });
    expect(result.current.currentPage.items).toHaveLength(2);

    act(() => {
      result.current.undo();
    });
    expect(result.current.currentPage.items).toHaveLength(1);

    // Redo once
    act(() => {
      result.current.redo();
    });
    // Leaves 2 strokes (CA02)
    expect(result.current.currentPage.items).toHaveLength(2);
  });

  it("CT05 / CA05: page 1 with content, create page 2 and return to page 1 -> content intact", () => {
    const { result } = renderHook(() => useWhiteboard({ sessionId: "pages-test" }));

    // Draw stroke on Page 1
    act(() => {
      result.current.startDrawing({ x: 100, y: 100 });
      result.current.continueDrawing({ x: 200, y: 200 });
      result.current.finishDrawing();
    });

    expect(result.current.pages[0].items).toHaveLength(1);

    // Create Page 2
    act(() => {
      result.current.addPage();
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.currentPageIndex).toBe(1);
    expect(result.current.currentPage.items).toHaveLength(0);

    // Return to Page 1
    act(() => {
      result.current.switchPage(0);
    });

    expect(result.current.currentPageIndex).toBe(0);
    expect(result.current.currentPage.items).toHaveLength(1);
    expect(result.current.currentPage.items[0].type).toBe("stroke");
  });

  it("RF04: enforces max 10 pages limit", () => {
    const { result } = renderHook(() => useWhiteboard({ sessionId: "max-pages-test" }));

    // Add up to 10 pages
    for (let i = 0; i < 15; i++) {
      act(() => {
        result.current.addPage();
      });
    }

    expect(result.current.totalPages).toBe(10);
  });

  it("RF01: clear current page and allows undoing the clear", () => {
    const { result } = renderHook(() => useWhiteboard({ sessionId: "clear-test" }));

    act(() => {
      result.current.addTextBox(50, 50, "Sample Word");
    });
    expect(result.current.currentPage.items).toHaveLength(1);

    act(() => {
      result.current.clearCurrentPage();
    });
    expect(result.current.currentPage.items).toHaveLength(0);

    act(() => {
      result.current.undo();
    });
    expect(result.current.currentPage.items).toHaveLength(1);
  });

  it("RF07: allows setting background (white, grid, lines)", () => {
    const { result } = renderHook(() => useWhiteboard({ sessionId: "bg-test" }));

    expect(result.current.currentPage.background).toBe("white");

    act(() => {
      result.current.setBackground("grid");
    });
    expect(result.current.currentPage.background).toBe("grid");

    act(() => {
      result.current.setBackground("lines");
    });
    expect(result.current.currentPage.background).toBe("lines");
  });
});
