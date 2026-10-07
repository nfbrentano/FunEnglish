import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassroomBoard } from "@/components/board/classroom-board";
import { exportBoardPageToBlob } from "@/lib/board/board-persistence";
import {
  BOARD_INKS,
  BOARD_SURFACES,
  contrastRatio,
  resolveBoardSurface,
  resolveInk,
  toBoardInk,
} from "@/lib/board/ink";
import type { BoardPage } from "@/lib/board/types";
import { useWhiteboard } from "@/lib/board/use-whiteboard";
import { setThemePreference } from "@/lib/theme";

/** SDD/2026-10-06_redesign-ux-ui-lousa.md */

describe("Ink and surfaces (RF04, RF05)", () => {
  it("CT04 / CA06: maps legacy colors to ink keys and keeps unknown colors", () => {
    expect(toBoardInk("#1e293b")).toBe("ink");
    expect(toBoardInk("#EF4444")).toBe("red");
    expect(toBoardInk("black")).toBe("ink");
    expect(toBoardInk("violet")).toBe("violet");
    expect(toBoardInk("#123456")).toBeNull();
    expect(resolveInk("#123456", "dark")).toBe("#123456");
    expect(resolveInk("#1e293b", "dark")).toBe(BOARD_SURFACES.dark.ink.ink);
    expect(resolveInk("#1e293b", "light")).toBe(BOARD_SURFACES.light.ink.ink);
  });

  it("RNF02: every ink has at least 3:1 contrast on its surface; grid and rules stay subtle", () => {
    for (const surface of ["light", "dark"] as const) {
      const palette = BOARD_SURFACES[surface];
      for (const ink of BOARD_INKS) {
        expect(
          contrastRatio(palette.ink[ink], palette.background),
          `${surface}/${ink}`,
        ).toBeGreaterThanOrEqual(3);
      }
      expect(contrastRatio(palette.grid, palette.background)).toBeLessThan(1.5);
    }
  });

  it("D05: auto follows the site theme (sepia uses the light surface)", () => {
    expect(resolveBoardSurface("auto", "dark")).toBe("dark");
    expect(resolveBoardSurface("auto", "light")).toBe("light");
    expect(resolveBoardSurface("auto", "sepia")).toBe("light");
    expect(resolveBoardSurface("dark", "light")).toBe("dark");
  });
});

describe("Eraser modes (RF06, CA20)", () => {
  const stroke = (id: string, y: number) => ({
    id,
    type: "stroke" as const,
    tool: "pen" as const,
    color: "ink",
    width: 6,
    points: [
      { x: 100, y },
      { x: 400, y },
    ],
  });
  const initialPages: BoardPage[] = [
    { id: "p1", background: "white", items: [stroke("a", 100), stroke("b", 300)] },
  ];

  it("CT20: whole-stroke mode removes only the touched stroke, and undo restores it", () => {
    const { result } = renderHook(() => useWhiteboard({ sessionId: "erase-object", initialPages }));
    act(() => {
      result.current.setActiveTool("eraser");
      result.current.setEraserMode("object");
    });
    act(() => result.current.startDrawing({ x: 250, y: 102 }));
    expect(result.current.pendingEraseIds.has("a")).toBe(true);
    act(() => result.current.finishDrawing());

    expect(result.current.currentPage.items.map((i) => i.id)).toEqual(["b"]);
    act(() => result.current.undo());
    expect(result.current.currentPage.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("CT20: area mode adds an eraser stroke and keeps the strokes", () => {
    const { result } = renderHook(() => useWhiteboard({ sessionId: "erase-area", initialPages }));
    act(() => result.current.setActiveTool("eraser"));
    act(() => {
      result.current.startDrawing({ x: 250, y: 100 });
      result.current.continueDrawing({ x: 260, y: 100 });
    });
    act(() => result.current.finishDrawing());

    const items = result.current.currentPage.items;
    expect(items).toHaveLength(3);
    expect(items[2]).toMatchObject({ type: "stroke", tool: "eraser" });
  });
});

describe("Theme tokens only (RNF01, CA15)", () => {
  const root = join(__dirname, "../../../src");
  const files = [
    ...readdirSync(join(root, "components/board")).map((f) => join(root, "components/board", f)),
    join(root, "components/live/interactive-whiteboard.tsx"),
  ];
  const forbidden =
    /\b(?:bg-surface|border-border(?!-(?:subtle|strong))|text-fg-muted|[a-z]+-danger|bg-white|text-white|[a-z]+-neutral-\d+|[a-z]+-(?:blue|emerald|red|slate)-\d+)\b|#[0-9a-fA-F]{3,8}\b/;

  it("CT14: board components use no undefined tokens, fixed palette classes or hex literals", () => {
    for (const file of files) {
      const offending = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => forbidden.test(line));
      expect(offending, file).toEqual([]);
    }
  });

  it("CT14: the check catches a forbidden class", () => {
    expect(forbidden.test('className="bg-white text-blue-600"')).toBe(true);
    expect(forbidden.test('className="border border-border text-fg-muted"')).toBe(true);
    expect(forbidden.test('className="bg-elevated border-border-subtle text-accent"')).toBe(false);
  });
});

describe("Board layout and preferences", () => {
  afterEach(() => vi.restoreAllMocks());

  it("CT01 / CA02: the dock is a vertical toolbar on the left by default", () => {
    render(<ClassroomBoard sessionId="dock-default" />);
    const dock = screen.getByRole("toolbar", { name: "Board tools" });
    expect(dock).toHaveAttribute("aria-orientation", "vertical");
    expect(dock).toContainElement(screen.getByRole("button", { name: "Pen" }));
    // Secondary actions are not in the dock
    expect(screen.queryByRole("button", { name: "Export PNG" })).not.toBeInTheDocument();
  });

  it("CT19 / CA19: moving the toolbar to the top is remembered by the next board", async () => {
    const { unmount } = render(<ClassroomBoard sessionId="dock-toggle" />);
    await userEvent.click(screen.getByRole("button", { name: "Pen" }));
    await userEvent.click(screen.getByRole("button", { name: "Move toolbar to top" }));

    expect(screen.getByRole("toolbar", { name: "Board tools" })).toHaveAttribute(
      "aria-orientation",
      "horizontal",
    );
    expect(screen.getByRole("button", { name: "Pen" })).toHaveAttribute("aria-pressed", "true");
    unmount();

    render(<ClassroomBoard sessionId="dock-toggle-2" />);
    expect(screen.getByRole("toolbar", { name: "Board tools" })).toHaveAttribute(
      "aria-orientation",
      "horizontal",
    );
    expect(screen.getByRole("button", { name: "Move toolbar to left" })).toBeInTheDocument();
  });

  it("CT03 / CA04: the surface follows the site theme while the board is open", () => {
    act(() => setThemePreference("light"));
    const { container } = render(<ClassroomBoard sessionId="theme-follow" />);
    const board = container.querySelector("[data-board-surface]");
    expect(board).toHaveAttribute("data-board-surface", "light");

    act(() => setThemePreference("dark"));
    expect(board).toHaveAttribute("data-board-surface", "dark");

    act(() => setThemePreference("sepia"));
    expect(board).toHaveAttribute("data-board-surface", "light");
  });

  it("CT06 / CA07: shortcuts switch tools and width, but not while typing in a text box", async () => {
    render(<ClassroomBoard sessionId="shortcuts" />);

    fireEvent.keyDown(document.body, { key: "e" });
    expect(screen.getByRole("button", { name: "Eraser" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(document.body, { key: "p" });
    fireEvent.keyDown(document.body, { key: "]" });
    fireEvent.keyDown(document.body, { key: "2" });
    await userEvent.click(screen.getByRole("button", { name: "Color and width" }));
    expect(screen.getByRole("radio", { name: "Thick width" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Red" })).toHaveAttribute("aria-checked", "true");

    // Text tool: a new text box gets focus; typing "e" writes the letter instead of switching tools
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.keyDown(document.body, { key: "t" });
    fireEvent.pointerDown(screen.getByRole("region", { name: "Whiteboard Canvas" }), {
      clientX: 200,
      clientY: 200,
      pointerId: 1,
    });
    const textarea = screen.getByPlaceholderText("Type text here…");
    await userEvent.type(textarea, "e");
    expect(textarea).toHaveValue("e");
    expect(screen.getByRole("button", { name: "Text" })).toHaveAttribute("aria-pressed", "true");
  });

  it("CT07 / CA08: clear page asks for confirmation and Cancel keeps the page", async () => {
    const initialPages: BoardPage[] = [
      {
        id: "p1",
        background: "white",
        items: [
          {
            id: "s1",
            type: "stroke",
            tool: "pen",
            color: "ink",
            width: 6,
            points: [{ x: 1, y: 1 }],
          },
        ],
      },
    ];
    render(<ClassroomBoard sessionId="clear-confirm" initialPages={initialPages} />);

    await userEvent.click(screen.getByRole("button", { name: "More options" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear board" }));
    expect(screen.getByRole("dialog", { name: "Clear board" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Clear board" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("CT08 / CA09: the page picker jumps to a page and hides + at the limit", async () => {
    render(<ClassroomBoard sessionId="page-picker" />);
    await userEvent.click(screen.getByRole("button", { name: "Add new page" }));
    await userEvent.click(screen.getByRole("button", { name: "Add new page" }));

    await userEvent.click(screen.getByRole("button", { name: "Page 3 of 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Go to page 1" }));
    expect(screen.getByRole("button", { name: "Page 1 of 3" })).toBeInTheDocument();

    for (let i = 0; i < 7; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Add new page" }));
    }
    expect(screen.getByRole("button", { name: "Page 10 of 10" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add new page" })).not.toBeInTheDocument();
  });
});

describe("PNG export surface (RNF08, CA18, CA21)", () => {
  afterEach(() => vi.restoreAllMocks());

  /** Fake 2D context that records the first fill color (the page background). */
  function recordBackground() {
    const fills: string[] = [];
    const ctx = new Proxy({ measureText: () => ({ width: 0 }) } as Record<string, unknown>, {
      get: (target, prop) => (prop in target ? target[prop as string] : () => {}),
      set: (target, prop, value) => {
        if (prop === "fillStyle") fills.push(value);
        target[prop as string] = value;
        return true;
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    // jsdom never calls the toBlob callback.
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback(null),
    );
    return fills;
  }

  const page: BoardPage = { id: "p", background: "white", items: [] };

  it("CT21: the summary PNG is light by default", async () => {
    const fills = recordBackground();
    await exportBoardPageToBlob(page);
    expect(fills[0]).toBe(BOARD_SURFACES.light.background);
  });

  it("CT17: the manual export uses the surface on screen", async () => {
    const fills = recordBackground();
    await exportBoardPageToBlob(page, 1600, 900, "dark");
    expect(fills[0]).toBe(BOARD_SURFACES.dark.background);
  });
});
