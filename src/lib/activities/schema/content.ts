// `content` schemas for each activity type. Field details come from the player specs in SDD/.
import { z } from "zod";
import { imageSchema, mediaSchema, nonEmptyText } from "./common";

export const quizContentSchema = z.object({
  questions: z
    .array(
      z
        .object({
          prompt: nonEmptyText,
          media: mediaSchema.optional(),
          options: z
            .array(z.object({ text: nonEmptyText, correct: z.boolean().default(false) }))
            .min(2)
            .max(6),
          explanation: nonEmptyText.optional(),
        })
        .refine((q) => q.options.some((o) => o.correct), {
          message: "Each question needs at least one correct option",
          path: ["options"],
        }),
    )
    .min(1)
    .max(100),
});

export const flashcardsContentSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z
          .object({ text: nonEmptyText.optional(), image: imageSchema.optional() })
          .refine((front) => front.text || front.image, {
            message: "The front needs text, an image or both",
          }),
        back: z.object({
          text: nonEmptyText,
          definition: nonEmptyText.optional(),
          example: nonEmptyText.optional(),
        }),
        speak: nonEmptyText.optional(),
      }),
    )
    .min(1)
    .max(200),
});

/** Matches a blank written as [[answer]] or [[answer|alternative]]. */
export const BLANK_PATTERN = /\[\[[^\]]+\]\]/;

export const fillBlanksContentSchema = z.object({
  mode: z.enum(["typing", "word-bank"]),
  items: z
    .array(
      z.object({
        text: nonEmptyText.refine((text) => BLANK_PATTERN.test(text), {
          message: "Text needs at least one blank written as [[answer]]",
        }),
        hint: nonEmptyText.optional(),
        media: mediaSchema.optional(),
      }),
    )
    .min(1)
    .max(100),
  distractors: z.array(nonEmptyText).default([]),
});

export const quizBoardContentSchema = z.object({
  categories: z
    .array(
      z.object({
        name: nonEmptyText,
        clues: z
          .array(
            z.object({
              value: z.int().positive(),
              question: nonEmptyText,
              answer: nonEmptyText,
              media: mediaSchema.optional(),
            }),
          )
          .min(3)
          .max(6),
      }),
    )
    .min(3)
    .max(6),
});

export const promptCardsContentSchema = z.object({
  /** Writing mode shows a text box with a word counter. */
  writing: z.boolean().default(false),
  cards: z
    .array(
      z
        .object({
          prompt: nonEmptyText.optional(),
          image: imageSchema.optional(),
          options: z.tuple([nonEmptyText, nonEmptyText]).optional(),
          followUps: z.array(nonEmptyText).optional(),
          vocabulary: z.array(nonEmptyText).optional(),
        })
        .refine((card) => card.prompt || card.image, {
          message: "A card needs a prompt, an image or both",
        }),
    )
    .min(1)
    .max(200),
});
