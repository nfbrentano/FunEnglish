import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import QuizBoardPlayer from "@/components/player/plugins/quiz-board/quiz-board-player";
import { testSettings } from "./settings";

const clues = (name: string) =>
  [100, 200, 300].map((value) => ({
    value,
    question: `${name} ${value}?`,
    answer: `${name} answer ${value}`,
  }));
const content = {
  categories: ["Animals", "Food", "Colors"].map((name) => ({ name, clues: clues(name) })),
};

function setup(extra: Record<string, boolean> = {}) {
  const props = {
    content,
    settings: testSettings({
      teams: 3,
      teamNames: ["Tigers", "Team 2", "Team 3"],
      extra: { penalty: false, ...extra },
    }),
    onProgress: vi.fn(),
    onScore: vi.fn(),
    onComplete: vi.fn(),
  };
  render(<QuizBoardPlayer {...props} />);
  return props;
}

describe("QuizBoardPlayer", () => {
  it("shows the board with category names and values", () => {
    setup();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Animals",
      "Food",
      "Colors",
    ]);
    expect(screen.getAllByRole("button", { name: /– \d+$/ })).toHaveLength(9);
  });

  it("opens a clue, reveals the answer and gives the points", async () => {
    const props = setup();
    await userEvent.click(screen.getByRole("button", { name: "Animals – 300" }));
    expect(screen.getByRole("heading", { name: "Animals 300?" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show answer" }));
    expect(screen.getByText("Animals answer 300")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tigers +300" }));

    expect(props.onScore).toHaveBeenCalledWith(300, 0);
    expect(screen.getByRole("button", { name: "Animals – 300 (already played)" })).toBeDisabled();
  });

  it("No one leaves the scores alone; manual adjustments correct mistakes", async () => {
    const props = setup();
    await userEvent.click(screen.getByRole("button", { name: "Food – 100" }));
    await userEvent.click(screen.getByRole("button", { name: "Show answer" }));
    await userEvent.click(screen.getByRole("button", { name: "No one" }));
    expect(props.onScore).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Food – 100 (already played)" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Tigers −100" }));
    expect(props.onScore).toHaveBeenCalledWith(-100, 0);
  });

  it("penalty mode takes points away without closing the clue", async () => {
    const props = setup({ penalty: true });
    await userEvent.click(screen.getByRole("button", { name: "Colors – 200" }));
    await userEvent.click(screen.getByRole("button", { name: "Show answer" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Team 2 −200" })[0]);

    expect(props.onScore).toHaveBeenCalledWith(-200, 1);
    expect(screen.getByText("Colors answer 200")).toBeInTheDocument();
  });

  it("ends when every clue is played, or with End game", async () => {
    const props = setup();
    for (const category of ["Animals", "Food", "Colors"]) {
      for (const value of [100, 200, 300]) {
        await userEvent.click(screen.getByRole("button", { name: `${category} – ${value}` }));
        await userEvent.click(screen.getByRole("button", { name: "Show answer" }));
        await userEvent.click(screen.getByRole("button", { name: `Team 3 +${value}` }));
      }
    }
    expect(props.onComplete).toHaveBeenCalledWith({
      correct: 9,
      total: 9,
      headline: "9 of 9 clues played",
    });
  });
});
