import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FillBlanksPlayer from "@/components/player/plugins/fill-blanks/fill-blanks-player";
import { testSettings } from "./settings";

function setup(content: Parameters<typeof FillBlanksPlayer>[0]["content"]) {
  const props = {
    content,
    settings: testSettings(),
    onProgress: vi.fn(),
    onScore: vi.fn(),
    onComplete: vi.fn(),
  };
  render(<FillBlanksPlayer {...props} />);
  return props;
}

describe("FillBlanksPlayer — typing", () => {
  it("puts an input in each gap and checks loosely, but not spelling", async () => {
    const props = setup({
      mode: "typing",
      distractors: [],
      items: [{ text: "She [[has]] lived here and [[doesn't|does not]] want to leave." }],
    });

    await userEvent.type(screen.getByRole("textbox", { name: "Gap 1" }), "Has ");
    await userEvent.type(screen.getByRole("textbox", { name: "Gap 2" }), "does not");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getAllByLabelText("Correct")).toHaveLength(2);
    expect(props.onScore).toHaveBeenCalledWith(2);
    await userEvent.click(screen.getByRole("button", { name: "See results" }));
    expect(props.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ correct: 2, total: 2, review: [] }),
    );
  });

  it("marks wrong gaps and can show the answer", async () => {
    const props = setup({
      mode: "typing",
      distractors: [],
      items: [{ text: "I [[am]] tired." }, { text: "You [[are]] here." }],
    });

    await userEvent.type(screen.getByRole("textbox", { name: "Gap 1" }), "iz");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByLabelText("Incorrect")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show answer" }));
    expect(screen.getByRole("textbox", { name: "Gap 1" })).toHaveValue("am");

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Gap 1" }), "are{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "See results" }));
    expect(props.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        correct: 1,
        total: 2,
        review: [{ prompt: "I ___ tired.", answer: "am", chosen: "iz" }],
      }),
    );
  });
});

describe("FillBlanksPlayer — word bank", () => {
  it("places a chosen word in the gap and removes it from the bank", async () => {
    setup({
      mode: "word-bank",
      distractors: ["have", "is"],
      items: [{ text: "She [[has]] a cat." }],
    });
    const bank = screen.getByRole("group", { name: "Word bank" });
    expect(
      within(bank)
        .getAllByRole("button")
        .map((b) => b.textContent)
        .sort(),
    ).toEqual(["has", "have", "is"]);

    await userEvent.click(within(bank).getByRole("button", { name: "has" }));
    await userEvent.click(screen.getByRole("button", { name: "Gap 1" }));

    expect(screen.getByRole("button", { name: "Gap 1: has" })).toBeInTheDocument();
    expect(within(bank).queryByRole("button", { name: "has" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("status")).toHaveTextContent("1 of 1 correct");
  });

  it("returns a word to the bank when its gap is tapped", async () => {
    setup({ mode: "word-bank", distractors: [], items: [{ text: "I [[am]] here." }] });
    await userEvent.click(screen.getByRole("button", { name: "am" }));
    await userEvent.click(screen.getByRole("button", { name: "Gap 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Gap 1: am" }));

    expect(
      within(screen.getByRole("group", { name: "Word bank" })).getByRole("button", { name: "am" }),
    ).toBeInTheDocument();
  });

  it("credits songs with a link", () => {
    setup({
      mode: "typing",
      distractors: [],
      credit: {
        title: "Yesterday",
        artist: "The Beatles",
        url: "https://www.youtube.com/watch?v=abc",
      },
      items: [{ text: "[[Yesterday]], all my troubles…" }],
    });
    expect(screen.getByRole("link", { name: /Yesterday – The Beatles/ })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=abc",
    );
  });
});
