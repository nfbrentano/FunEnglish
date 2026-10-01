import type { ActivityType } from "../activities/schema/activity";

/** Smallest valid `content` per type, for "Insert template" (spec: painel admin, RF05). */
export const CONTENT_TEMPLATES: Record<ActivityType, unknown> = {
  quiz: {
    questions: [
      {
        prompt: "She ___ to school every day.",
        options: [{ text: "goes", correct: true }, { text: "go" }, { text: "going" }],
        explanation: "Use goes with he, she and it in the present simple.",
      },
    ],
  },
  flashcards: {
    cards: [
      {
        front: { text: "🍎" },
        back: { text: "apple", definition: "A round fruit.", example: "I eat an apple every day." },
      },
    ],
  },
  "fill-blanks": {
    mode: "typing",
    items: [{ text: "I [[am]] a teacher." }],
    distractors: [],
  },
  "quiz-board": {
    categories: ["Animals", "Food", "Colors"].map((name) => ({
      name,
      clues: [100, 200, 300].map((value) => ({
        value,
        question: `${name} question for ${value}`,
        answer: "Answer",
      })),
    })),
  },
  "prompt-cards": {
    writing: false,
    cards: [{ prompt: "Which do you prefer?", options: ["Tea", "Coffee"], followUps: ["Why?"] }],
  },
};
