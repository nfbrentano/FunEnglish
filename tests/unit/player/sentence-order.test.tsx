import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SentenceOrderPlayer from "@/components/player/plugins/sentence-order/sentence-order-player";
import { testSettings } from "./settings";

const speech = vi.hoisted(() => ({ speak: vi.fn(), supported: true }));
vi.mock("@/lib/player/speech", () => ({
  speak: speech.speak,
  isSpeechSupported: () => speech.supported,
}));

type Content = Parameters<typeof SentenceOrderPlayer>[0]["content"];

function setup(content: Content, extra: Record<string, boolean> = {}) {
  const props = {
    content,
    settings: testSettings({ extra }),
    onProgress: vi.fn(),
    onScore: vi.fn(),
    onComplete: vi.fn(),
  };
  render(<SentenceOrderPlayer {...props} />);
  return props;
}

const tray = () => screen.getByRole("group", { name: "Pieces" });
const line = () => screen.getByRole("group", { name: "Your sentence" });
const trayWords = () => within(tray()).getAllByRole("button").map((b) => b.textContent);
const lineWords = () => within(line()).getAllByRole("button").map((b) => b.textContent);
const add = (piece: string) => userEvent.click(screen.getByRole("button", { name: `Add “${piece}”` }));

async function build(pieces: string[]) {
  for (const piece of pieces) await add(piece);
}

const coffee = { items: [{ sentence: "She doesn't like coffee." }] };

beforeEach(() => {
  speech.speak.mockClear();
  speech.supported = true;
});

describe("SentenceOrderPlayer", () => {
  it("shows the pieces shuffled, never in order, and tapping moves them (CA02)", async () => {
    setup(coffee);
    expect(trayWords()).toHaveLength(4);
    expect(trayWords()).not.toEqual(["She", "doesn't", "like", "coffee"]);

    await add("like");
    expect(within(line()).getByRole("button", { name: /Remove “like”/ })).toBeInTheDocument();
    expect(trayWords()).toHaveLength(3);

    // Tapping a piece in the sentence sends it back.
    await userEvent.click(within(line()).getByRole("button", { name: /Remove “like”/ }));
    expect(trayWords()).toHaveLength(4);
  });

  it("accepts the right order, scores it and reports the answer for homework (CA03, CA08)", async () => {
    const props = setup(coffee);
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
    await build(["She", "doesn't", "like", "coffee"]);
    // The final punctuation is fixed at the end of the line (D02).
    expect(lineWords()).toEqual(["She", "doesn't", "like", "coffee"]);
    expect(line().textContent?.endsWith(".")).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getByRole("status")).toHaveTextContent("Correct!");
    expect(props.onScore).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: "See results" }));
    expect(props.onComplete).toHaveBeenCalledWith({
      correct: 1,
      total: 1,
      review: [],
      rawAnswers: [{ itemId: 0, given: ["She", "doesn't", "like", "coffee"], correct: true }],
    });
  });

  it("accepts an alternative order (CA04)", async () => {
    const props = setup({
      items: [{ sentence: "I went home yesterday.", alternatives: ["Yesterday I went home."] }],
    });
    await build(["yesterday", "I", "went", "home"]);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(props.onScore).toHaveBeenCalledWith(1);
  });

  it("gives no point when the first try is wrong, even if the second is right (CA05)", async () => {
    const props = setup({
      items: [{ sentence: "She doesn't like coffee." }, { sentence: "I am happy." }],
    });
    await build(["doesn't", "She", "like", "coffee"]);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("status")).toHaveTextContent("Not quite");
    // The pieces out of place are flagged.
    expect(screen.getByRole("button", { name: /Remove “doesn't”.*wrong place/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await userEvent.click(within(line()).getByRole("button", { name: /Remove “doesn't”/ }));
    await userEvent.click(within(line()).getByRole("button", { name: /Remove “like”/ }));
    await userEvent.click(within(line()).getByRole("button", { name: /Remove “coffee”/ }));
    await build(["doesn't", "like", "coffee"]);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("status")).toHaveTextContent("Correct!");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    await build(["I", "am", "happy"]);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(screen.getByRole("button", { name: "See results" }));

    expect(props.onScore).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        correct: 1,
        total: 2,
        review: [
          {
            prompt: "She / doesn't / like / coffee",
            answer: "She doesn't like coffee.",
            chosen: "doesn't She like coffee.",
          },
        ],
        rawAnswers: [
          { itemId: 0, given: ["doesn't", "She", "like", "coffee"], correct: false },
          { itemId: 1, given: ["I", "am", "happy"], correct: true },
        ],
      }),
    );
  });

  it("can show the answer after a wrong try", async () => {
    setup(coffee);
    await build(["coffee", "She", "doesn't", "like"]);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(screen.getByRole("button", { name: "Show answer" }));
    expect(lineWords()).toEqual(["She", "doesn't", "like", "coffee"]);
    expect(screen.getByRole("button", { name: "See results" })).toBeInTheDocument();
  });

  it("reads the sentence aloud when it's right, if the option is on (CA06)", async () => {
    setup(coffee, { readAloud: true });
    await build(["She", "doesn't", "like", "coffee"]);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(speech.speak).toHaveBeenCalledWith("She doesn't like coffee.");
  });

  it("does not read aloud with the option off, and shows the translation when asked", async () => {
    setup(
      { items: [{ sentence: "She doesn't like coffee.", translation: "Ela não gosta de café." }] },
      { showTranslation: true },
    );
    expect(screen.getByText("Ela não gosta de café.")).toBeInTheDocument();
    await build(["She", "doesn't", "like", "coffee"]);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it("works with the keyboard only: Tab, Enter adds, Backspace removes the last (CA09)", async () => {
    const props = setup(coffee);
    const words = ["She", "doesn't", "like", "coffee"];

    // Enter on a focused piece adds it; focus stays in the tray, never lost.
    for (const word of words) {
      screen.getByRole("button", { name: `Add “${word}”` }).focus();
      await userEvent.keyboard("{Enter}");
    }
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Check" }));

    await userEvent.keyboard("{Backspace}");
    expect(within(line()).queryByRole("button", { name: /Remove “coffee”/ })).toBeNull();
    expect(trayWords()).toEqual(["coffee"]);

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add “coffee”" }));
    await userEvent.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Check" }));
    await userEvent.keyboard("{Enter}");
    expect(props.onScore).toHaveBeenCalledWith(1);
  });
});
