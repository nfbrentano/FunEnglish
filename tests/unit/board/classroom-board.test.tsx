import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClassroomBoard } from "@/components/board/classroom-board";
import type { BoardPage } from "@/lib/board/types";

describe("ClassroomBoard Component (SDD/2026-10-03_07-lousa-virtual.md)", () => {
  it("renders toolbar with tools, thicknesses, colors and controls (RNF06)", () => {
    render(<ClassroomBoard sessionId="toolbar-test" />);

    // Tools
    expect(screen.getByRole("button", { name: "Pen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Highlighter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eraser" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select & Move" })).toBeInTheDocument();

    // Undo / Redo
    const undoBtn = screen.getByRole("button", { name: "Undo" });
    const redoBtn = screen.getByRole("button", { name: "Redo" });
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();

    // Thickness buttons
    expect(screen.getByRole("button", { name: "Thin width" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Medium width" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thick width" })).toBeInTheDocument();

    // Background buttons
    expect(screen.getByRole("button", { name: "Plain" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grid" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lined" })).toBeInTheDocument();

    // Page indicator
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("CT04 / CA04: toggles Expand board and Collapse board", async () => {
    render(<ClassroomBoard sessionId="expand-test" />);

    const expandBtn = screen.getByRole("button", { name: "Expand board" });
    expect(expandBtn).toBeInTheDocument();

    await userEvent.click(expandBtn);
    expect(screen.getByRole("button", { name: "Collapse board" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Collapse board" }));
    expect(screen.getByRole("button", { name: "Expand board" })).toBeInTheDocument();
  });

  it("CT05 / CA05: supports multi-page navigation (add page, previous, next)", async () => {
    render(<ClassroomBoard sessionId="page-nav-test" />);

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();

    // Add page
    const addBtn = screen.getByRole("button", { name: "Add new page" });
    await userEvent.click(addBtn);

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    // Previous page
    const prevBtn = screen.getByRole("button", { name: "Previous page" });
    await userEvent.click(prevBtn);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    // Next page
    const nextBtn = screen.getByRole("button", { name: "Next page" });
    await userEvent.click(nextBtn);

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("CT06 / CA06: 'Send words to students' extracts 'suitcase' and 'boarding pass', confirms and calls callback", async () => {
    const handleSendWords = vi.fn();
    const initialPages: BoardPage[] = [
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
            text: "boarding pass",
            x: 200,
            y: 50,
            width: 150,
            height: 40,
            fontSize: 24,
            color: "#000",
          },
        ],
      },
    ];

    render(
      <ClassroomBoard
        sessionId="words-modal-test"
        initialPages={initialPages}
        onSendWords={handleSendWords}
      />,
    );

    const sendWordsBtn = screen.getByRole("button", { name: "Send words to students" });
    await userEvent.click(sendWordsBtn);

    // Modal opens
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("suitcase")).toBeInTheDocument();
    expect(within(dialog).getByText("boarding pass")).toBeInTheDocument();

    // Confirm button
    const confirmBtn = screen.getByRole("button", { name: /Add to vocabulary/i });
    await userEvent.click(confirmBtn);

    expect(handleSendWords).toHaveBeenCalledTimes(1);
    expect(handleSendWords).toHaveBeenCalledWith(["suitcase", "boarding pass"]);
  });

  it("CT07 / CA07: 'Export PNG' triggers page export", async () => {
    render(<ClassroomBoard sessionId="export-test" />);

    const exportBtn = screen.getByRole("button", { name: "Export PNG" });
    expect(exportBtn).toBeInTheDocument();

    // Clicking export PNG shouldn't crash
    await userEvent.click(exportBtn);
  });

  it("CT09 / CA09: rejects non-image paste and displays 'Only images can be pasted'", async () => {
    render(<ClassroomBoard sessionId="paste-negative-test" />);

    const canvasRegion = screen.getByRole("region", { name: "Whiteboard Canvas" });

    // Mock paste of PDF file
    const pdfFile = new File(["dummy pdf content"], "document.pdf", {
      type: "application/pdf",
    });

    const clipboardData = {
      items: [
        {
          kind: "file",
          getAsFile: () => pdfFile,
        },
      ],
    };

    fireEvent.paste(canvasRegion, { clipboardData });

    // Expect error alert with "Only images can be pasted"
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Only images can be pasted");

    // Dismiss error
    const dismissBtn = screen.getByRole("button", { name: "Dismiss error" });
    await userEvent.click(dismissBtn);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("CT01 / CA01: drawing pointer events on canvas adds stroke to board", () => {
    render(<ClassroomBoard sessionId="pointer-draw-test" />);

    const canvasRegion = screen.getByRole("region", { name: "Whiteboard Canvas" });

    // Pointer down, move, up
    fireEvent.pointerDown(canvasRegion, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvasRegion, { clientX: 150, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(canvasRegion, { pointerId: 1 });

    const undoBtn = screen.getByRole("button", { name: "Undo" });
    expect(undoBtn).not.toBeDisabled();
  });

  it("CT03 / CA03: pasting an image adds an image overlay on the board", async () => {
    render(<ClassroomBoard sessionId="paste-image-test" />);

    const canvasRegion = screen.getByRole("region", { name: "Whiteboard Canvas" });

    const imageFile = new File(["fake-image-bytes"], "photo.png", {
      type: "image/png",
    });

    const clipboardData = {
      items: [
        {
          kind: "file",
          getAsFile: () => imageFile,
        },
      ],
    };

    fireEvent.paste(canvasRegion, { clipboardData });

    // Undo should become available when image is inserted
    const undoBtn = screen.getByRole("button", { name: "Undo" });
    await waitFor(() => {
      expect(undoBtn).not.toBeDisabled();
    });
  });
});
