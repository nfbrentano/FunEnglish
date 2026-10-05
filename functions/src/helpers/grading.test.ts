import { describe, expect, it } from "vitest";
import { gradeActivityAnswers, isBlankCorrect, parseBlanks } from "./grading.js";

describe("parseBlanks and isBlankCorrect", () => {
  it("extracts blank alternatives properly", () => {
    const blanks = parseBlanks("She [[has|'s]] lived here [[for]] 5 years.");
    expect(blanks).toEqual([["has", "'s"], ["for"]]);
  });

  it("checks answers with normalization", () => {
    expect(isBlankCorrect("HAS", ["has", "'s"])).toBe(true);
    expect(isBlankCorrect(" ’s ", ["has", "'s"])).toBe(true);
    expect(isBlankCorrect("had", ["has", "'s"])).toBe(false);
  });
});

describe("gradeActivityAnswers", () => {
  it("grades quiz correctly", () => {
    const quizContent = {
      questions: [
        {
          prompt: "What is it?",
          options: [
            { text: "Cat", correct: true },
            { text: "Dog", correct: false },
          ],
        },
        {
          prompt: "Select primes",
          options: [
            { text: "2", correct: true },
            { text: "3", correct: true },
            { text: "4", correct: false },
          ],
        },
      ],
    };

    const res1 = gradeActivityAnswers("quiz", quizContent, [[0], [0, 1]]);
    expect(res1).toEqual({ correct: 2, total: 2 });

    const res2 = gradeActivityAnswers("quiz", quizContent, [[1], [0]]);
    expect(res2).toEqual({ correct: 0, total: 2 });
  });

  it("grades fill-blanks correctly", () => {
    const fillContent = {
      items: [
        { text: "I [[love]] London and [[hate|dislike]] pollution." },
        { text: "He [[is]] tall." },
      ],
    };

    const res = gradeActivityAnswers("fill-blanks", fillContent, [
      ["love", "dislike"],
      ["was"],
    ]);
    expect(res).toEqual({ correct: 2, total: 3 });
  });

  it("returns 0/0 for flashcards and prompt-cards (RF10, CA08)", () => {
    const flashcardsContent = { cards: [{ front: { text: "Cat" }, back: { text: "Gato" } }] };
    expect(gradeActivityAnswers("flashcards", flashcardsContent, [1, 2, 3])).toEqual({
      correct: 0,
      total: 0,
    });

    const promptCardsContent = { cards: [{ prompt: "Describe your city" }] };
    expect(gradeActivityAnswers("prompt-cards", promptCardsContent, [1, 2])).toEqual({
      correct: 0,
      total: 0,
    });
  });
});
