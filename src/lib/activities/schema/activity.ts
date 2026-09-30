import { z } from "zod";
import { CATEGORY_IDS } from "../categories";
import { LEVELS } from "../levels";
import { imageSchema, nonEmptyText } from "./common";
import {
  fillBlanksContentSchema,
  flashcardsContentSchema,
  promptCardsContentSchema,
  quizBoardContentSchema,
  quizContentSchema,
} from "./content";

export const SCHEMA_VERSION = 1;

export const ACTIVITY_TYPES = [
  "quiz",
  "flashcards",
  "fill-blanks",
  "quiz-board",
  "prompt-cards",
] as const;

const levelSchema = z.enum(LEVELS);

const baseFields = {
  schemaVersion: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens (e.g. some-or-any)",
    ),
  title: nonEmptyText.max(120),
  description: nonEmptyText.max(500),
  category: z.enum(CATEGORY_IDS),
  levelMin: levelSchema,
  levelMax: levelSchema,
  thumbnail: imageSchema,
  tags: z.array(nonEmptyText).max(20).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  featured: z.boolean().default(false),
  /** Where the content came from. The seed fills it in from the folder when missing. */
  origin: z.enum(["ai", "human"]).optional(),
  reviewStatus: z.enum(["pending", "reviewed"]).optional(),
  reviewedAt: z.iso.datetime().optional(),
  reviewedBy: nonEmptyText.optional(),
};

/** An activity as authored (JSON file or admin editor), before server-managed fields are added. */
export const activityInputSchema = z
  .discriminatedUnion("type", [
    z.object({ ...baseFields, type: z.literal("quiz"), content: quizContentSchema }),
    z.object({ ...baseFields, type: z.literal("flashcards"), content: flashcardsContentSchema }),
    z.object({ ...baseFields, type: z.literal("fill-blanks"), content: fillBlanksContentSchema }),
    z.object({ ...baseFields, type: z.literal("quiz-board"), content: quizBoardContentSchema }),
    z.object({ ...baseFields, type: z.literal("prompt-cards"), content: promptCardsContentSchema }),
  ])
  .refine((a) => LEVELS.indexOf(a.levelMin) <= LEVELS.indexOf(a.levelMax), {
    message: "levelMin must not be above levelMax",
    path: ["levelMax"],
  });

export type ActivityInput = z.infer<typeof activityInputSchema>;
export type ActivityType = ActivityInput["type"];

/** Fields the seed/admin writes on top of the input. Timestamps are Firestore Timestamps in the database. */
export type ActivityServerFields<TTimestamp> = {
  origin: "ai" | "human";
  reviewStatus: "pending" | "reviewed";
  searchTokens: string[];
  createdAt: TTimestamp;
  updatedAt: TTimestamp;
};

export type ActivityDoc<TTimestamp = Date> = ActivityInput & ActivityServerFields<TTimestamp>;
export type Activity<TTimestamp = Date> = ActivityDoc<TTimestamp> & { id: string };
