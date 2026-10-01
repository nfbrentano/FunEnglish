import dynamic from "next/dynamic";
import {
  fillBlanksContentSchema,
  flashcardsContentSchema,
  promptCardsContentSchema,
  quizBoardContentSchema,
  quizContentSchema,
} from "../activities/schema/content";
import { strings } from "../strings";
import { definePlugin, type PluginRegistry } from "./types";

/**
 * One entry per activity type. Each player is code-split and loaded only when a game starts.
 * Adding a type = a schema (src/lib/activities/schema/content.ts) + a component + an entry here.
 */
export const PLUGINS = {
  quiz: definePlugin({
    label: "Quiz",
    instructions: "Read each question and choose the right answer. You'll see why after each one.",
    schema: quizContentSchema,
    supports: { scoring: true, teams: true, timer: true, shuffle: true },
    defaults: { shuffle: true },
    Component: dynamic(() => import("@/components/player/plugins/quiz/quiz-player"), {
      ssr: false,
    }),
  }),
  flashcards: definePlugin({
    label: "Flashcards",
    instructions:
      "Tap a card (or press Space) to flip it. Use the arrows or swipe to move between cards.",
    schema: flashcardsContentSchema,
    supports: { scoring: false, teams: false, timer: false, shuffle: true },
    options: [
      {
        id: "startWith",
        label: strings.flashcards.startWith,
        type: "select",
        default: "picture",
        choices: [
          { value: "picture", label: strings.flashcards.picture },
          { value: "word", label: strings.flashcards.word },
        ],
      },
      { id: "selfCheck", label: strings.flashcards.selfCheck, type: "toggle", default: false },
    ],
    Component: dynamic(() => import("@/components/player/plugins/flashcards/flashcards-player"), {
      ssr: false,
    }),
  }),
  "fill-blanks": definePlugin({
    label: "Fill in the Blanks",
    instructions:
      "Complete the sentences, then press Check. Small differences in capitals don't count.",
    schema: fillBlanksContentSchema,
    supports: { scoring: true, teams: false, timer: false, shuffle: false },
    Component: dynamic(() => import("@/components/player/plugins/fill-blanks/fill-blanks-player"), {
      ssr: false,
    }),
  }),
  "quiz-board": definePlugin({
    label: "Quiz Board",
    instructions:
      "Split the class into teams. Pick a category and a value, answer, and the teacher gives the points.",
    schema: quizBoardContentSchema,
    supports: { scoring: true, teams: true, timer: false, shuffle: false },
    minTeams: 2,
    defaults: { teams: 2 },
    options: [
      { id: "penalty", label: strings.board.penaltyOption, type: "toggle", default: false },
    ],
    Component: dynamic(() => import("@/components/player/plugins/quiz-board/quiz-board-player"), {
      ssr: false,
    }),
  }),
  "prompt-cards": definePlugin({
    label: "Discussion Cards",
    instructions:
      "Talk (or write) about each card. Use the follow-up questions and vocabulary for help.",
    schema: promptCardsContentSchema,
    supports: { scoring: false, teams: false, timer: false, shuffle: true },
    options: [
      {
        id: "timer",
        label: strings.cards.speakingTimer,
        type: "select",
        default: "0",
        choices: [
          { value: "0", label: strings.cards.off },
          { value: "30", label: strings.player.seconds(30) },
          { value: "60", label: "1 minute" },
          { value: "120", label: "2 minutes" },
        ],
      },
      { id: "sound", label: strings.cards.sound, type: "toggle", default: true },
    ],
    Component: dynamic(
      () => import("@/components/player/plugins/prompt-cards/prompt-cards-player"),
      {
        ssr: false,
      },
    ),
  }),
} satisfies PluginRegistry;
