import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RollDicePlayer from "@/components/player/plugins/roll-dice/roll-dice-player";
import { testSettings } from "./settings";

function makeContent() {
  const grid = [];
  for (let r = 1; r <= 6; r++) {
    for (let c = 1; c <= 6; c++) {
      grid.push({
        row: r,
        col: c,
        question: `Question for cell (${r}, ${c})?`,
      });
    }
  }
  return {
    instructions: "Roll both dice to choose a question.",
    grid,
  };
}

function setup() {
  const onProgress = vi.fn();
  const onComplete = vi.fn();
  const onScore = vi.fn();
  const content = makeContent();

  const result = render(
    <RollDicePlayer
      content={content}
      settings={testSettings()}
      onProgress={onProgress}
      onComplete={onComplete}
      onScore={onScore}
    />,
  );

  return { ...result, onProgress, onComplete, onScore };
}

describe("RollDicePlayer (SDD/2026-11-04_atividade-jogo-dos-dados.md)", () => {
  it("renders the 6x6 board with 36 cells (CA08)", () => {
    setup();
    // 36 cells should exist with data-row and data-col
    const cell12 = document.querySelector('[data-row="1"][data-col="2"]');
    expect(cell12).not.toBeNull();
    expect(cell12?.textContent).toContain("Question for cell (1, 2)?");

    const cell66 = document.querySelector('[data-row="6"][data-col="6"]');
    expect(cell66).not.toBeNull();
  });

  it("opens modal directly when user clicks any cell manually (CA04)", async () => {
    setup();
    const cell12 = document.querySelector('[data-row="1"][data-col="2"]') as HTMLElement;
    expect(cell12).toBeDefined();

    await userEvent.click(cell12);

    // Modal should now be open displaying the question
    expect(screen.getByRole("heading", { level: 2, name: "Question for cell (1, 2)?" })).toBeInTheDocument();
    expect(screen.getByText("Row 1, Col 2")).toBeInTheDocument();
  });

  it("marks cell as visited and updates progress after closing (CA05)", async () => {
    const { onProgress } = setup();

    const cell23 = document.querySelector('[data-row="2"][data-col="3"]') as HTMLElement;
    await userEvent.click(cell23);

    // Close button
    const closeBtn = screen.getByRole("button", { name: "Back to board" });
    await userEvent.click(closeBtn);

    // Cell should now have visited indicator
    expect(screen.getByText("1 of 36 answered")).toBeInTheDocument();
    expect(onProgress).toHaveBeenCalledWith({ current: 1, total: 36 });
  });

  it("resets visited cells when 'Reset Board' is clicked", async () => {
    setup();

    const cell34 = document.querySelector('[data-row="3"][data-col="4"]') as HTMLElement;
    await userEvent.click(cell34);

    const closeBtn = screen.getByRole("button", { name: "Back to board" });
    await userEvent.click(closeBtn);
    expect(screen.getByText("1 of 36 answered")).toBeInTheDocument();

    const resetBtn = screen.getByRole("button", { name: /Reset Board/i });
    await userEvent.click(resetBtn);

    expect(screen.getByText("0 of 36 answered")).toBeInTheDocument();
  });

  it("has accessible roll button and live region for screen readers (CA10)", () => {
    setup();
    const rollButton = screen.getByRole("button", { name: /Roll Dice/i });
    expect(rollButton).toBeInTheDocument();

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});
