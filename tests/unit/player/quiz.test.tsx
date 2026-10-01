import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import QuizPlayer from "@/components/player/plugins/quiz/quiz-player";
import type { quizContentSchema } from "@/lib/activities/schema/content";
import type { PlayerSettings } from "@/lib/player/types";

type Content = z.infer<typeof quizContentSchema>;

const q = (prompt: string, correct = 0, extra: Partial<Content["questions"][number]> = {}) => ({
  prompt,
  options: ["have", "has", "had"].map((text, i) => ({ text, correct: i === correct })),
  ...extra,
});

function setup(content: Content, settings: Partial<PlayerSettings> = {}) {
  const props = {
    content,
    settings: { shuffle: false, teams: 1, timerSeconds: null, ...settings },
    onProgress: vi.fn(),
    onScore: vi.fn(),
    onComplete: vi.fn(),
  };
  render(<QuizPlayer {...props} />);
  return props;
}

describe("QuizPlayer", () => {
  it("shows the first question with lettered options and reports progress", () => {
    const props = setup({
      questions: Array.from({ length: 10 }, (_, i) => q(`Question ${i + 1}`)),
    });

    expect(screen.getByRole("heading", { name: "Question 1" })).toBeInTheDocument();
    // The letter is visual only (aria-hidden); screen readers hear just the option.
    expect(screen.getByRole("button", { name: "have" })).toHaveTextContent("Ahave");
    expect(props.onProgress).toHaveBeenCalledWith({ current: 1, total: 10, activeTeam: undefined });
  });

  it("on a wrong answer, marks both choices, explains and locks the options", async () => {
    setup({
      questions: [
        q("I ___ never been to Paris.", 0, { explanation: "Use have with I." }),
        q("Next"),
      ],
    });

    await userEvent.click(screen.getByRole("button", { name: /has/ }));

    expect(screen.getByText("Not quite")).toBeInTheDocument();
    expect(screen.getByText("Use have with I.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /have.*\(Correct answer\)/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /has.*\(Your answer\)/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
  });

  it("needs every correct option when there are several", async () => {
    const props = setup({
      questions: [
        {
          prompt: "Which are verbs?",
          options: [
            { text: "run", correct: true },
            { text: "eat", correct: true },
            { text: "table", correct: false },
          ],
        },
      ],
    });

    expect(screen.getByText("Choose all correct answers")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /run/ }));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getByText("Not quite")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eat.*\(Correct answer\)/ })).toBeInTheDocument();
    expect(props.onScore).not.toHaveBeenCalled();
  });

  it("finishes with the score and a review of the wrong answers", async () => {
    const props = setup({ questions: Array.from({ length: 10 }, (_, i) => q(`Q${i + 1}`)) });

    for (let i = 0; i < 10; i++) {
      await userEvent.click(screen.getByRole("button", { name: i < 8 ? /have/ : /had/ }));
      await userEvent.click(screen.getByRole("button", { name: i < 9 ? "Next" : "See results" }));
    }

    expect(props.onScore).toHaveBeenCalledTimes(8);
    expect(props.onComplete).toHaveBeenCalledWith({
      correct: 8,
      total: 10,
      review: [
        { prompt: "Q9", answer: "have", chosen: "had" },
        { prompt: "Q10", answer: "have", chosen: "had" },
      ],
    });
  });

  it("gives each team its own turn", async () => {
    const props = setup({ questions: [q("Q1"), q("Q2")] }, { teams: 2 });

    expect(screen.getByText("Team 1's turn")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /have/ }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Team 2's turn")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /had/ }));

    expect(props.onScore).toHaveBeenCalledExactlyOnceWith(1, 0);
  });

  it("works with the keyboard: 1–6 to answer, Enter to continue", async () => {
    setup({ questions: [q("Q1"), q("Q2")] });

    await userEvent.keyboard("2");
    expect(screen.getByText("Not quite")).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");

    expect(screen.getByRole("heading", { name: "Q2" })).toBeInTheDocument();
  });

  describe("timer", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("counts the question as wrong when time runs out", () => {
      const props = setup({ questions: [q("Q1"), q("Q2")] }, { timerSeconds: 20 });
      expect(screen.getByText("20s")).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(20_000));

      expect(screen.getByText("Time's up!")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /have.*\(Correct answer\)/ })).toBeInTheDocument();
      expect(props.onScore).not.toHaveBeenCalled();
    });
  });

  it("reads TTS prompts aloud in English", async () => {
    const speakMock = vi.fn();
    Object.assign(window, {
      speechSynthesis: { speak: speakMock, cancel: vi.fn(), getVoices: () => [] },
      SpeechSynthesisUtterance: class {
        lang = "";
        constructor(public text: string) {}
      },
    });
    setup({
      questions: [q("Listen and choose", 0, { media: { kind: "tts", text: "She has a cat." } })],
    });

    await userEvent.click(screen.getByRole("button", { name: "Listen" }));

    expect(speakMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: "She has a cat.", lang: "en-US" }),
    );
    Reflect.deleteProperty(window, "speechSynthesis");
  });
});
