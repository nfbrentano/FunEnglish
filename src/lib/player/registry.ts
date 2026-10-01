import dynamic from "next/dynamic";
import { quizContentSchema } from "../activities/schema/content";
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
} satisfies PluginRegistry;
