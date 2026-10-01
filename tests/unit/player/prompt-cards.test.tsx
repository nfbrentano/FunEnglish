import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PromptCardsPlayer, {
  countWords,
} from "@/components/player/plugins/prompt-cards/prompt-cards-player";
import { testSettings } from "./settings";

const cards = Array.from({ length: 15 }, (_, i) => ({
  prompt: `Card ${i + 1}?`,
  followUps: ["Why?"],
  vocabulary: ["because"],
}));

function setup(
  content: Parameters<typeof PromptCardsPlayer>[0]["content"],
  extra: Record<string, string | boolean> = {},
) {
  const props = {
    content,
    settings: testSettings({ extra: { timer: "0", sound: false, ...extra } }),
    onProgress: vi.fn(),
    onScore: vi.fn(),
    onComplete: vi.fn(),
  };
  render(<PromptCardsPlayer {...props} />);
  return props;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("PromptCardsPlayer", () => {
  it("shows one card at a time with its position", () => {
    const props = setup({ writing: false, cards });
    expect(screen.getByRole("heading", { name: "Card 1?" })).toBeInTheDocument();
    expect(props.onProgress).toHaveBeenCalledWith({ current: 1, total: 15 });
  });

  it("reveals follow-ups and vocabulary separately", async () => {
    setup({ writing: false, cards });
    await userEvent.click(screen.getByRole("button", { name: "Show follow-up questions" }));
    expect(screen.getByText("Why?")).toBeInTheDocument();
    expect(screen.queryByText("because")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Show useful vocabulary" }));
    expect(screen.getByText("because")).toBeInTheDocument();
  });

  it("Random card shows every card once, then offers to start over", async () => {
    setup({ writing: false, cards });
    const seen = new Set<string>();
    for (let i = 0; i < 15; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Random card" }));
      seen.add(screen.getByRole("heading", { level: 2 }).textContent!);
    }
    expect(seen.size).toBe(15);

    await userEvent.click(screen.getByRole("button", { name: "Random card" }));
    expect(screen.getByRole("status")).toHaveTextContent("All cards shown – Start over?");
  });

  it("shows This or That side by side", () => {
    setup({
      writing: false,
      cards: [{ prompt: "Which do you prefer?", options: ["Cats", "Dogs"] }],
    });
    expect(screen.getByText("Cats")).toBeInTheDocument();
    expect(screen.getByText("or")).toBeInTheDocument();
    expect(screen.getByText("Dogs")).toBeInTheDocument();
  });

  it("speaking timer counts down to Time's up!", () => {
    vi.useFakeTimers();
    setup({ writing: false, cards }, { timer: "60" });
    expect(screen.getByText("1:00")).toBeInTheDocument();

    act(() => screen.getByRole("button", { name: "Start timer" }).click());
    act(() => vi.advanceTimersByTime(60_000));

    expect(screen.getByRole("alert")).toHaveTextContent("Time's up!");
  });

  it("writing mode counts words and never sends the text", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const props = setup({ writing: true, cards: [{ prompt: "Write a story." }] });

    await userEvent.type(screen.getByRole("textbox"), "word ".repeat(57));
    expect(screen.getByText("57 words")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(props.onComplete).toHaveBeenCalledWith({
      correct: 1,
      total: 1,
      headline: "1 prompt done",
    });
  });

  it("counts words", () => {
    expect(countWords("  one two\nthree ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});
