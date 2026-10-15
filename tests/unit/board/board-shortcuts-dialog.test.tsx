import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ClassroomBoard } from "@/components/board/classroom-board";
import { BoardShortcutsDialog } from "@/components/board/board-shortcuts-dialog";

describe("BoardShortcutsDialog & Shortcuts Guide (SDD/2026-10-14_guia-de-atalhos-lousa.md)", () => {
  it("CT01 / CA01: renders the help shortcuts button and more-menu item in ClassroomBoard", async () => {
    render(<ClassroomBoard sessionId="shortcuts-help-btn-test" />);

    // Top-right help button
    const helpBtn = screen.getByRole("button", { name: "Keyboard shortcuts" });
    expect(helpBtn).toBeInTheDocument();

    // In more options menu
    await userEvent.click(screen.getByRole("button", { name: "More options" }));
    const menuItems = screen.getAllByRole("button", { name: "Keyboard shortcuts" });
    expect(menuItems.length).toBeGreaterThanOrEqual(2);
  });

  it("CT02 / CA04: opens the dialog with all shortcut categories when help button is clicked", async () => {
    render(<ClassroomBoard sessionId="shortcuts-modal-open-test" />);

    const helpBtn = screen.getByRole("button", { name: "Keyboard shortcuts" });
    await userEvent.click(helpBtn);

    // Dialog title
    expect(screen.getByRole("heading", { name: "Keyboard Shortcuts & Guide" })).toBeInTheDocument();

    // Check categories
    expect(screen.getByText("Text & Typography")).toBeInTheDocument();
    expect(screen.getByText("Drawing & Tools")).toBeInTheDocument();
    expect(screen.getByText("Colors & Stroke")).toBeInTheDocument();
    expect(screen.getByText("Editing & History")).toBeInTheDocument();

    // Check key entries
    expect(screen.getByText("Decrease font size")).toBeInTheDocument();
    expect(screen.getByText("Increase font size")).toBeInTheDocument();
    expect(screen.getByText("Bold text")).toBeInTheDocument();
    expect(screen.getByText("Toggle stroke / area eraser")).toBeInTheDocument();
  });

  it("CT03 / CA03 / CA05: opens with ? key and closes with Escape", async () => {
    render(<ClassroomBoard sessionId="shortcuts-key-toggle-test" />);

    // Press ?
    fireEvent.keyDown(window, { key: "?", shiftKey: true });
    expect(screen.getByRole("heading", { name: "Keyboard Shortcuts & Guide" })).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("heading", { name: "Keyboard Shortcuts & Guide" })).not.toBeInTheDocument();
  });

  it("CT04: does not open shortcuts dialog when ? is typed in an active textarea or input", () => {
    render(
      <div>
        <input data-testid="test-input" type="text" />
        <ClassroomBoard sessionId="shortcuts-input-test" />
      </div>,
    );

    const input = screen.getByTestId("test-input");
    input.focus();

    fireEvent.keyDown(input, { key: "?", shiftKey: true });
    expect(screen.queryByRole("heading", { name: "Keyboard Shortcuts & Guide" })).not.toBeInTheDocument();
  });

  it("CT05 / CA06: renders standalone BoardShortcutsDialog with close button and tip", async () => {
    let closed = false;
    render(
      <BoardShortcutsDialog
        open={true}
        onClose={() => {
          closed = true;
        }}
      />,
    );

    expect(screen.getByText(/Speed up your whiteboard workflow during class/i)).toBeInTheDocument();
    expect(screen.getByText(/Tip: font size and bold shortcuts work directly/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close" });
    await userEvent.click(closeBtn);
    expect(closed).toBe(true);
  });
});
