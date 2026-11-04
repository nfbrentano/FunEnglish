import { describe, expect, it } from "vitest";
import { validateActivity } from "@/lib/activities/validate";
import { validQuiz } from "./fixtures";

function make36Questions() {
  const grid = [];
  for (let r = 1; r <= 6; r++) {
    for (let c = 1; c <= 6; c++) {
      grid.push({
        row: r,
        col: c,
        question: `Question for row ${r} and col ${c}?`,
      });
    }
  }
  return grid;
}

const rollDiceActivity = (grid: unknown[]) =>
  validateActivity({
    ...validQuiz(),
    type: "roll-dice",
    content: {
      instructions: "Roll both dice to choose a question.",
      grid,
    },
  });

describe("roll-dice schema validation (SDD CA01, CA09)", () => {
  it("passes when given a complete 6x6 grid with 36 valid questions (CA01)", () => {
    const result = rollDiceActivity(make36Questions());
    expect(result.ok).toBe(true);
  });

  it("fails when the grid has only 35 questions (CA09)", () => {
    const incompleteGrid = make36Questions().slice(0, 35);
    const result = rollDiceActivity(incompleteGrid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("36"))).toBe(true);
    }
  });

  it("fails when a question is empty text (CA09)", () => {
    const grid = make36Questions();
    grid[0].question = "   ";
    const result = rollDiceActivity(grid);
    expect(result.ok).toBe(false);
  });

  it("fails when there are duplicate coordinates", () => {
    const grid = make36Questions();
    grid[1].row = 1;
    grid[1].col = 1; // Duplicate of grid[0]
    const result = rollDiceActivity(grid);
    expect(result.ok).toBe(false);
  });

  it("fails when coordinates are out of bounds (0 or 7)", () => {
    const grid = make36Questions();
    grid[0].row = 7;
    const result = rollDiceActivity(grid);
    expect(result.ok).toBe(false);
  });
});
