import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  clearBoardLocally,
  extractBoardText,
  extractBoardWords,
  loadBoardLocally,
  saveBoardLocally,
} from "@/lib/board/board-persistence";
import type { BoardPage, BoardStroke, BoardTextBox } from "@/lib/board/types";
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

  it("CT01 / CA01: default eraser mode is object; clicking once on a stroke erases whole stroke", () => {
    const stroke1: BoardStroke = {
      id: "s1",
      type: "stroke",
      tool: "pen",
      color: "ink",
      width: 6,
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
      ],
    };
    const stroke2: BoardStroke = {
      id: "s2",
      type: "stroke",
      tool: "pen",
      color: "ink",
      width: 6,
      points: [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
    };

    const initialPages: BoardPage[] = [
      { id: "p1", background: "white", items: [stroke1, stroke2] },
    ];

    const { result } = renderHook(() =>
      useWhiteboard({ sessionId: "default-eraser-test", initialPages }),
    );

    // Verify default eraser mode is "object" (RF01)
    expect(result.current.eraserMode).toBe("object");

    act(() => {
      result.current.setActiveTool("eraser");
    });

    // Click on stroke1
    act(() => {
      result.current.startDrawing({ x: 150, y: 100 });
    });
    expect(result.current.pendingEraseIds.has("s1")).toBe(true);
    act(() => {
      result.current.finishDrawing();
    });

    // s1 should be erased, s2 remains
    expect(result.current.currentPage.items.map((i) => i.id)).toEqual(["s2"]);

    // A single undo restores s1
    act(() => {
      result.current.undo();
    });
    expect(result.current.currentPage.items.map((i) => i.id)).toEqual(["s1", "s2"]);
  });

  it("CT02 / CA02: dragging across 2 strokes in object mode erases both; 1 undo restores both", () => {
    const stroke1: BoardStroke = {
      id: "s1",
      type: "stroke",
      tool: "pen",
      color: "ink",
      width: 6,
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
      ],
    };
    const stroke2: BoardStroke = {
      id: "s2",
      type: "stroke",
      tool: "pen",
      color: "ink",
      width: 6,
      points: [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
    };

    const initialPages: BoardPage[] = [
      { id: "p1", background: "white", items: [stroke1, stroke2] },
    ];

    const { result } = renderHook(() =>
      useWhiteboard({ sessionId: "multi-erase-test", initialPages }),
    );

    act(() => {
      result.current.setActiveTool("eraser");
    });

    // Drag crossing both lines
    act(() => {
      result.current.startDrawing({ x: 150, y: 100 });
      result.current.continueDrawing({ x: 150, y: 150 });
      result.current.continueDrawing({ x: 150, y: 200 });
    });
    expect(result.current.pendingEraseIds.has("s1")).toBe(true);
    expect(result.current.pendingEraseIds.has("s2")).toBe(true);

    act(() => {
      result.current.finishDrawing();
    });

    // Both should be erased
    expect(result.current.currentPage.items).toHaveLength(0);

    // A single undo restores both
    act(() => {
      result.current.undo();
    });
    expect(result.current.currentPage.items.map((i) => i.id)).toEqual(["s1", "s2"]);
  });

  it("CT08 / CA07: setSelectedTextSize updates font size of all selected texts and ignores strokes", () => {
    const text1: BoardTextBox = {
      id: "t1",
      type: "text",
      text: "hello",
      x: 50,
      y: 50,
      width: 200,
      height: 50,
      fontSize: 24,
      color: "ink",
    };
    const text2: BoardTextBox = {
      id: "t2",
      type: "text",
      text: "world",
      x: 50,
      y: 150,
      width: 200,
      height: 50,
      fontSize: 24,
      color: "ink",
    };
    const stroke1: BoardStroke = {
      id: "s1",
      type: "stroke",
      tool: "pen",
      color: "ink",
      width: 6,
      points: [{ x: 10, y: 10 }],
    };

    const initialPages: BoardPage[] = [
      { id: "p1", background: "white", items: [text1, text2, stroke1] },
    ];

    const { result } = renderHook(() =>
      useWhiteboard({ sessionId: "format-text-test", initialPages }),
    );

    // Select text1, text2 and stroke1
    act(() => {
      result.current.setSelectedItemIds(["t1", "t2", "s1"]);
    });

    expect(result.current.selectedTexts.map((t) => t.id)).toEqual(["t1", "t2"]);

    // Change to size 'l' (36px)
    act(() => {
      result.current.setSelectedTextSize("l");
    });

    const items = result.current.currentPage.items;
    const updatedT1 = items.find((i) => i.id === "t1") as BoardTextBox;
    const updatedT2 = items.find((i) => i.id === "t2") as BoardTextBox;
    const unchangedS1 = items.find((i) => i.id === "s1") as BoardStroke;

    expect(updatedT1.fontSize).toBe(36);
    expect(updatedT2.fontSize).toBe(36);
    expect(unchangedS1.width).toBe(6);

    // Single undo reverts both texts back to 24px
    act(() => {
      result.current.undo();
    });
    const revertedT1 = result.current.currentPage.items.find((i) => i.id === "t1") as BoardTextBox;
    const revertedT2 = result.current.currentPage.items.find((i) => i.id === "t2") as BoardTextBox;
    expect(revertedT1.fontSize).toBe(24);
    expect(revertedT2.fontSize).toBe(24);
  });

  it("CT09 / CA08: setSelectedTextColor changes color of selected texts", () => {
    const text1: BoardTextBox = {
      id: "t1",
      type: "text",
      text: "colored text",
      x: 50,
      y: 50,
      width: 200,
      height: 50,
      fontSize: 24,
      color: "ink",
    };

    const { result } = renderHook(() =>
      useWhiteboard({
        sessionId: "color-text-test",
        initialPages: [{ id: "p1", background: "white", items: [text1] }],
      }),
    );

    act(() => {
      result.current.setSelectedItemIds(["t1"]);
    });

    act(() => {
      result.current.setSelectedTextColor("red");
    });

    const updated = result.current.currentPage.items[0] as BoardTextBox;
    expect(updated.color).toBe("red");
  });

  it("CT13 / CA12: toggleSelectedTextBold toggles bold, and new text boxes inherit active formatting", () => {
    const text1: BoardTextBox = {
      id: "t1",
      type: "text",
      text: "bold test",
      x: 50,
      y: 50,
      width: 200,
      height: 50,
      fontSize: 24,
      color: "ink",
    };

    const { result } = renderHook(() =>
      useWhiteboard({
        sessionId: "bold-test",
        initialPages: [{ id: "p1", background: "white", items: [text1] }],
      }),
    );

    act(() => {
      result.current.setSelectedItemIds(["t1"]);
    });

    // Make bold
    act(() => {
      result.current.toggleSelectedTextBold();
    });
    expect((result.current.currentPage.items[0] as BoardTextBox).bold).toBe(true);

    // Change size to xl
    act(() => {
      result.current.setSelectedTextSize("xl");
    });
    expect((result.current.currentPage.items[0] as BoardTextBox).fontSize).toBe(56);

    // Create a new text box: should inherit bold and 56 (RF12, CA12)
    act(() => {
      result.current.addTextBox(100, 100, "New inherited box");
    });

    const newBox = result.current.currentPage.items[1] as BoardTextBox;
    expect(newBox.fontSize).toBe(56);
    expect(newBox.bold).toBe(true);
  });

  it("CT14 / CA13: loads legacy board saved without bold property without error", () => {
    const legacyJson = JSON.stringify({
      pages: [
        {
          id: "p1",
          background: "white",
          items: [
            {
              id: "legacy-1",
              type: "text",
              text: "Legacy text without bold",
              x: 10,
              y: 10,
              width: 100,
              height: 40,
              fontSize: 24,
              color: "ink",
            },
          ],
        },
      ],
      currentPageIndex: 0,
    });

    localStorage.setItem("fun-english:whiteboard:legacy-session", legacyJson);

    const { result } = renderHook(() =>
      useWhiteboard({ sessionId: "legacy-session" }),
    );

    expect(result.current.currentPage.items).toHaveLength(1);
    const item = result.current.currentPage.items[0] as BoardTextBox;
    expect(item.text).toBe("Legacy text without bold");
    expect(item.bold).toBeUndefined();
  });

  it("CA15: does not create undo entry when stepping font size at the boundary", () => {
    const text1: BoardTextBox = {
      id: "t1",
      type: "text",
      text: "boundary test",
      x: 50,
      y: 50,
      width: 200,
      height: 50,
      fontSize: 96, // Maximum scale value
      color: "ink",
    };

    const { result } = renderHook(() =>
      useWhiteboard({
        sessionId: "boundary-font-test",
        initialPages: [{ id: "p1", background: "white", items: [text1] }],
      }),
    );

    act(() => {
      result.current.setSelectedItemIds(["t1"]);
    });

    expect(result.current.canUndo).toBe(false);

    // Try to increase font size beyond 96
    act(() => {
      result.current.stepSelectedFontSize(1);
    });

    // Should stay 96 and canUndo should still be false (no undo entry recorded)
    expect((result.current.currentPage.items[0] as BoardTextBox).fontSize).toBe(96);
    expect(result.current.canUndo).toBe(false);
  });
});
