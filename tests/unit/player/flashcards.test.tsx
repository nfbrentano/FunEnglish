import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FlashcardsPlayer from "@/components/player/plugins/flashcards/flashcards-player";
import { testSettings } from "./settings";

const words = ["giraffe", "lion", "zebra", "hippo", "tiger"];
const content = {
  cards: words.map((w) => ({
    front: { text: w.toUpperCase().split("").reverse().join("") },
    back: { text: w, definition: `A ${w}.`, example: `I saw a ${w}.` },
  })),
};

function setup(extra: Record<string, string | boolean> = {}) {
  const props = {
    content,
    settings: testSettings({ extra: { startWith: "picture", selfCheck: false, ...extra } }),
    onProgress: vi.fn(),
    onScore: vi.fn(),
    onComplete: vi.fn(),
  };
  render(<FlashcardsPlayer {...props} />);
  return props;
}

const card = () => screen.getByRole("button", { name: /^Card (front|back)/ });

describe("FlashcardsPlayer", () => {
  it("starts on the front of card 1 and flips with a click or Space", async () => {
    const props = setup();
    expect(props.onProgress).toHaveBeenCalledWith({ current: 1, total: 5 });
    expect(card()).toHaveAccessibleName(/Card front/);

    await userEvent.click(card());
    expect(card()).toHaveAccessibleName(/Card back/);
    expect(screen.getByText("A giraffe.")).toBeInTheDocument();
    expect(screen.getByText("“I saw a giraffe.”")).toBeInTheDocument();

    card().blur();
    await userEvent.keyboard(" ");
    expect(card()).toHaveAccessibleName(/Card front/);
  });

  it("moves with → and swipes, always front side up", async () => {
    const props = setup();
    await userEvent.click(card());
    await userEvent.keyboard("{ArrowRight}");
    expect(props.onProgress).toHaveBeenLastCalledWith({ current: 2, total: 5 });
    expect(card()).toHaveAccessibleName(/Card front/);

    fireEvent.pointerDown(card(), { clientX: 300 });
    fireEvent.pointerUp(card(), { clientX: 100 });
    expect(props.onProgress).toHaveBeenLastCalledWith({ current: 3, total: 5 });
  });

  it("can start with the word side", () => {
    setup({ startWith: "word" });
    expect(card()).toHaveAccessibleName(/Card back/);
  });

  it("self-check: reviews only the cards still being learned, then shows results", async () => {
    const props = setup({ selfCheck: true });
    for (let i = 0; i < 5; i++) {
      await userEvent.click(card());
      await userEvent.click(
        screen.getByRole("button", { name: i < 3 ? "Still learning" : "I knew it" }),
      );
    }

    await userEvent.click(
      screen.getByRole("button", { name: "Review the 3 cards you're still learning" }),
    );
    expect(props.onProgress).toHaveBeenLastCalledWith({ current: 1, total: 3 });

    for (let i = 0; i < 3; i++) {
      await userEvent.click(card());
      await userEvent.click(screen.getByRole("button", { name: "I knew it" }));
    }
    expect(props.onComplete).toHaveBeenCalledWith({
      correct: 5,
      total: 5,
      headline: "You knew 5 of 5 cards",
    });
  });

  it("finishes on → at the last card", async () => {
    const props = setup();
    for (let i = 0; i < 5; i++) await userEvent.keyboard("{ArrowRight}");
    expect(props.onComplete).toHaveBeenCalledWith({
      correct: 5,
      total: 5,
      headline: "5 cards reviewed",
    });
  });
});
