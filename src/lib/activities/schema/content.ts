// `content` schemas for each activity type. Field details come from the player specs in SDD/.
import { z } from "zod";
import { chunksOf, normalizeSentence, wordBag } from "../sentence-order";
import { imageSchema, mediaSchema, nonEmptyText } from "./common";

export const quizContentSchema = z.object({
  questions: z
    .array(
      z
        .object({
          prompt: nonEmptyText,
          media: mediaSchema.optional(),
          options: z
            .array(
              z.object({
                text: nonEmptyText,
                correct: z.boolean().default(false),
                /** Picture answer (spec: mais imagens nas atividades, RF03); the text stays the name. */
                image: imageSchema.optional(),
              }),
            )
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
  /** Song or video credit shown with the clip ("Song – Artist", linked). */
  credit: z.object({ title: nonEmptyText, artist: nonEmptyText, url: z.url() }).optional(),
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

/** Sentence Builder (SDD/2026-10-05_15-atividade-ordenar-frases.md, RF01). */
export const sentenceOrderContentSchema = z.object({
  items: z
    .array(
      z
        .object({
          /** The correct sentence; its final punctuation stays fixed at the end (D02). */
          sentence: nonEmptyText,
          /** Manual split ("a lot of" as one piece); default: one piece per word. */
          chunks: z.array(nonEmptyText).optional(),
          /** Other orders that are also right ("Yesterday I went home."). */
          alternatives: z.array(nonEmptyText).optional(),
          hint: nonEmptyText.optional(),
          translation: nonEmptyText.optional(),
          media: mediaSchema.optional(),
        })
        .refine((item) => chunksOf(item).length >= 2, {
          message: "A sentence needs at least two pieces to put in order",
          path: ["sentence"],
        })
        .refine((item) => chunksOf(item).length <= 14, {
          message: "Use at most 14 pieces (join words into chunks like \"a lot of\")",
          path: ["chunks"],
        })
        .refine(
          (item) =>
            !item.chunks ||
            normalizeSentence(item.chunks.join(" ")) === normalizeSentence(item.sentence),
          { message: "The pieces must make the sentence, in order", path: ["chunks"] },
        )
        .refine(
          (item) =>
            (item.alternatives ?? []).every((alt) => wordBag(alt) === wordBag(item.sentence)),
          { message: "An alternative must use the same words as the sentence", path: ["alternatives"] },
        ),
    )
    .min(1)
    .max(30),
});
