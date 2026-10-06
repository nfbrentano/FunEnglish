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
  "sentence-order": {
    items: [
      { sentence: "She doesn't like coffee.", translation: "Ela não gosta de café." },
      {
        sentence: "I went home yesterday.",
        alternatives: ["Yesterday I went home."],
      },
    ],
  },
};

/** Empty but structured `content` per type, for "Start blank" (spec: gestão completa, RF08). */
export const BLANK_CONTENT: Record<ActivityType, unknown> = {
  quiz: {
    questions: [{ prompt: "", options: [{ text: "", correct: true }, { text: "" }, { text: "" }] }],
  },
  flashcards: { cards: [{ front: { text: "" }, back: { text: "" } }] },
  "fill-blanks": { mode: "typing", items: [{ text: "" }], distractors: [] },
  "quiz-board": {
    categories: [0, 1, 2].map(() => ({
      name: "",
      clues: [100, 200, 300].map((value) => ({ value, question: "", answer: "" })),
    })),
  },
  "prompt-cards": { writing: false, cards: [{ prompt: "" }] },
  "sentence-order": { items: [{ sentence: "" }] },
};
