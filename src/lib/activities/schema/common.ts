import { z } from "zod";

export const imageSchema = z.object({
  src: z.string().refine((src) => src.startsWith("/") || src.startsWith("https://"), {
    message: "Must be a /public path or an https:// URL",
  }),
  alt: z.string().trim().min(1, "Images need alt text"),
  source: z.enum(["ai", "stock", "own"]),
});

export const youtubeClipSchema = z
  .object({
    kind: z.literal("youtube"),
    videoId: z.string().regex(/^[\w-]{11}$/, "Must be an 11-character YouTube video id"),
    start: z.int().min(0).default(0),
    end: z.int().positive().optional(),
  })
  .refine((clip) => clip.end === undefined || clip.end > clip.start, {
    message: "end must be after start",
    path: ["end"],
  });

/** Optional media attached to a prompt: a picture, text read aloud (TTS) or a YouTube clip. */
export const mediaSchema = z.discriminatedUnion("kind", [
  imageSchema.extend({ kind: z.literal("image") }),
  z.object({ kind: z.literal("tts"), text: z.string().trim().min(1) }),
  youtubeClipSchema,
]);

export const nonEmptyText = z.string().trim().min(1);
