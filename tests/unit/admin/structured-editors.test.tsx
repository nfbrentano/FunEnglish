import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ErrorsProvider } from "@/components/admin/content/form-context";
import { StructuredEditor } from "@/components/admin/content/structured-editor";
import type { ActivityType } from "@/lib/activities/schema/activity";
import { validateActivity } from "@/lib/activities/validate";
import { validQuiz } from "../activities/fixtures";

/** The editor with live validation, like the admin page wires it. */
function Harness({ type, initial }: { type: ActivityType; initial: unknown }) {
  const [content, setContent] = useState(initial);
  const result = validateActivity({ ...validQuiz(), type, content });
  return (
    <ErrorsProvider issues={result.ok ? [] : result.issues}>
      <StructuredEditor type={type} value={content} onChange={setContent} />
      <output data-testid="json">{JSON.stringify(content)}</output>
      <output data-testid="valid">{String(result.ok)}</output>
    </ErrorsProvider>
  );
}

const json = () => JSON.parse(screen.getByTestId("json").textContent!);
const valid = () => screen.getByTestId("valid").textContent === "true";

describe("QuizEditor", () => {
  it("builds a valid quiz without JSON: questions, options and the correct one (CA01)", async () => {
    render(<Harness type="quiz" initial={{ questions: [] }} />);
    await userEvent.click(screen.getByRole("button", { name: "Add question" }));
    // Focus moves into the new question.
    expect(screen.getByLabelText("Question")).toHaveFocus();
    await userEvent.type(screen.getByLabelText("Question"), "She ___ to school.");
    await userEvent.type(screen.getByLabelText("Option 1 of question 1"), "goes");
    await userEvent.type(screen.getByLabelText("Option 2 of question 1"), "go");
    await userEvent.type(screen.getByLabelText("Option 3 of question 1"), "going");

    expect(valid()).toBe(true);
    expect(json().questions[0].options).toEqual([
      { text: "goes", correct: true },
      { text: "go" },
      { text: "going" },
    ]);
  });

  it("shows 'Mark one option as correct' next to the question, and fixes the JSON (CA02)", async () => {
    render(
      <Harness
        type="quiz"
        initial={{ questions: [{ prompt: "Pick", options: [{ text: "a" }, { text: "b" }] }] }}
      />,
    );
    expect(screen.getByText("Mark one option as correct")).toBeInTheDocument();
    expect(valid()).toBe(false);

    await userEvent.click(screen.getByRole("radio", { name: "Option 2 is correct (question 1)" }));
    expect(screen.queryByText("Mark one option as correct")).not.toBeInTheDocument();
    expect(json().questions[0].options[1].correct).toBe(true);
    expect(valid()).toBe(true);
  });

  it("reorders with the keyboard-reachable buttons and keeps focus on the moved item", async () => {
    render(
      <Harness
        type="quiz"
        initial={{
          questions: [
            { prompt: "First", options: [{ text: "a", correct: true }, { text: "b" }] },
            { prompt: "Second", options: [{ text: "a", correct: true }, { text: "b" }] },
          ],
        }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Move Question 2 up" }));
    expect(json().questions.map((q: { prompt: string }) => q.prompt)).toEqual(["Second", "First"]);
    expect(screen.getByRole("button", { name: "Move Question 1 down" })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Remove Question 1" }));
    expect(json().questions).toHaveLength(1);
    // A quiz needs at least one question.
    expect(screen.getByRole("button", { name: "Remove Question 1" })).toBeDisabled();
  });
});

describe("FillBlanksEditor", () => {
  it("makes a blank from the selection and adds an alternative (CA03)", async () => {
    render(
      <Harness
        type="fill-blanks"
        initial={{ mode: "typing", items: [{ text: "She goes to school every day." }] }}
      />,
    );
    const input = screen.getByLabelText("Sentence") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(4, 8);
    input.dispatchEvent(new Event("select", { bubbles: true }));
    await userEvent.click(screen.getByRole("button", { name: "Make blank" }));
    expect(json().items[0].text).toBe("She [[goes]] to school every day.");

    const alternatives = screen.getByLabelText("Other accepted answers for blank 1 (goes)");
    await userEvent.type(alternatives, "walks");
    await userEvent.tab();
    expect(json().items[0].text).toBe("She [[goes|walks]] to school every day.");
    expect(valid()).toBe(true);
  });
});

describe("QuizBoardEditor", () => {
  const board = {
    categories: ["A", "B", "C"].map((name) => ({
      name,
      clues: [100, 200, 300].map((value) => ({ value, question: `${name}${value}`, answer: "x" })),
    })),
  };

  it("adds a category and a row with the next value in every category (CA04)", async () => {
    render(<Harness type="quiz-board" initial={board} />);
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    await userEvent.click(screen.getByRole("button", { name: "Add row (400)" }));

    const categories = json().categories as { clues: { value: number }[] }[];
    expect(categories).toHaveLength(4);
    expect(categories.every((c) => c.clues.length === 4)).toBe(true);
    expect(categories[0].clues[3].value).toBe(400);
    // The new category and row start empty: flagged until filled.
    expect(valid()).toBe(false);
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
  });
});

describe("MediaEditor", () => {
  it("fills the clip from a pasted YouTube link (CA05)", async () => {
    render(
      <Harness
        type="quiz"
        initial={{
          questions: [{ prompt: "Watch", options: [{ text: "a", correct: true }, { text: "b" }] }],
        }}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Media"), "youtube");
    await userEvent.type(
      screen.getByLabelText("YouTube link"),
      "https://www.youtube.com/watch?v=YE7VzlLtp-4&t=30",
    );
    await userEvent.type(screen.getByLabelText("End (seconds)"), "45");

    expect(json().questions[0].media).toEqual({
      kind: "youtube",
      videoId: "YE7VzlLtp-4",
      start: 30,
      end: 45,
    });
    expect(valid()).toBe(true);
  });

  it("emoji and read-aloud media", async () => {
    render(
      <Harness
        type="quiz"
        initial={{
          questions: [{ prompt: "Look", options: [{ text: "a", correct: true }, { text: "b" }] }],
        }}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Media"), "emoji");
    await userEvent.type(screen.getByLabelText("Emoji"), "🍎");
    expect(valid()).toBe(false);
    await userEvent.type(screen.getByLabelText("What the emoji show"), "An apple");
    expect(valid()).toBe(true);
    expect(
      within(screen.getByText("Preview").parentElement!).getByRole("img", { name: "An apple" }),
    ).toBeInTheDocument();
  });
});

describe("PromptCardsEditor and FlashcardsEditor", () => {
  it("adds follow-ups and This or That choices", async () => {
    render(<Harness type="prompt-cards" initial={{ cards: [{ prompt: "Tea or coffee?" }] }} />);
    await userEvent.click(screen.getByLabelText("This or That (two choices)"));
    await userEvent.type(screen.getByLabelText("Choice 1"), "Tea");
    await userEvent.type(screen.getByLabelText("Choice 2"), "Coffee");
    await userEvent.click(screen.getByRole("button", { name: "Add follow-up" }));
    await userEvent.type(screen.getByLabelText("Follow-up 1 of card 1"), "Why?");
    expect(json().cards[0]).toEqual({
      prompt: "Tea or coffee?",
      options: ["Tea", "Coffee"],
      followUps: ["Why?"],
    });
    expect(valid()).toBe(true);
  });

  it("drops optional fields left blank instead of saving empty text", async () => {
    render(<Harness type="flashcards" initial={{ cards: [] }} />);
    await userEvent.click(screen.getByRole("button", { name: "Add card" }));
    await userEvent.type(screen.getByLabelText("Text or emoji"), "🍎");
    await userEvent.type(screen.getByLabelText("Word"), "apple");
    await userEvent.type(screen.getByLabelText("Definition"), "x");
    await userEvent.clear(screen.getByLabelText("Definition"));
    expect(json().cards[0]).toEqual({ front: { text: "🍎" }, back: { text: "apple" } });
    expect(valid()).toBe(true);
  });
});
