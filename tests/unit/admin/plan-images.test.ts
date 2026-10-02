import { describe, expect, it } from "vitest";
import { validateActivity } from "@/lib/activities/validate";
import { fillPlannedSrcs, imageCoverage, planImages } from "@/lib/admin/plan-images";
import { validQuiz } from "../activities/fixtures";

const STYLE = "Flat vector illustration.";
const quiz = (questions: unknown[]) => ({ ...validQuiz(), slug: "pets", content: { questions } });

describe("planImages (RF06, CA06)", () => {
  it("plans a picture for every question without one, with a draft alt and prompt", () => {
    const activity = quiz([
      {
        prompt: "She ___ to school every day.",
        options: [{ text: "goes", correct: true }, { text: "go" }],
      },
      {
        prompt: "Listen. What time is it?",
        media: { kind: "tts", text: "It's seven." },
        options: [{ text: "7:00", correct: true }, { text: "8:00" }],
      },
      {
        prompt: "Already?",
        media: { kind: "image", src: "/x.webp", alt: "x", source: "ai" },
        options: [{ text: "a", correct: true }, { text: "b" }],
      },
    ]);
    const { content, planned } = planImages(activity as never, { style: STYLE });
    const questions = (content as { questions: { media?: Record<string, unknown> }[] }).questions;
    expect(planned).toBe(1);
    expect(questions[0].media).toEqual({
      kind: "image",
      src: "/images/activities/pets/question-1.webp",
      alt: "She goes to school every day.",
      source: "ai",
      prompt: "She goes to school every day. Flat vector illustration.",
    });
    // Audio keeps its slot; existing pictures stay.
    expect(questions[1].media).toEqual({ kind: "tts", text: "It's seven." });
    expect(questions[2].media?.src).toBe("/x.webp");
    expect(validateActivity({ ...activity, content }).ok).toBe(true);
  });

  it("can plan picture answers too", () => {
    const { content, planned } = planImages(
      quiz([
        { prompt: "Which barks?", options: [{ text: "dog", correct: true }, { text: "cat" }] },
      ]) as never,
      { style: STYLE, answers: true },
    );
    const options = (
      content as { questions: { options: { image?: { src: string; alt: string } }[] }[] }
    ).questions[0].options;
    expect(planned).toBe(3);
    expect(options.map((o) => o.image?.src)).toEqual([
      "/images/activities/pets/question-1-option-1.webp",
      "/images/activities/pets/question-1-option-2.webp",
    ]);
    expect(options[0].image?.alt).toBe("dog");
  });

  it("plans flashcard fronts, sentences, clues and cards", () => {
    const cards = planImages(
      {
        slug: "f",
        type: "flashcards",
        content: { cards: [{ front: { text: "🍎" }, back: { text: "apple" } }] },
      },
      { style: STYLE },
    ).content as { cards: { front: { image: { src: string; alt: string } } }[] };
    expect(cards.cards[0].front.image).toMatchObject({
      src: "/images/activities/f/card-1.webp",
      alt: "apple",
    });

    const blanks = planImages(
      {
        slug: "b",
        type: "fill-blanks",
        content: { mode: "typing", items: [{ text: "I [[am|'m]] happy." }] },
      },
      { style: STYLE },
    ).content as { items: { media: { alt: string; src: string } }[] };
    expect(blanks.items[0].media).toMatchObject({
      alt: "I am happy.",
      src: "/images/activities/b/sentence-1.webp",
    });

    const board = planImages(
      {
        slug: "q",
        type: "quiz-board",
        content: {
          categories: [
            { name: "A", clues: [{ value: 100, question: "Says moo", answer: "A cow" }] },
            { name: "B", clues: [{ value: 100, question: "Q", answer: "A cat" }] },
          ],
        },
      },
      { style: STYLE },
    ).content as { categories: { clues: { media: { src: string; alt: string } }[] }[] };
    expect(board.categories[1].clues[0].media).toMatchObject({
      src: "/images/activities/q/clue-2.webp",
      alt: "A cat",
    });
  });
});

describe("imageCoverage (RF08, CA08)", () => {
  it("counts planned and uploaded pictures against the level's target", () => {
    const activity = {
      type: "quiz" as const,
      levelMin: "beginner",
      content: {
        questions: [
          { media: { kind: "image", src: "/images/a/question-1.webp?v=12345678", alt: "a" } },
          { media: { kind: "image", src: "/images/a/question-2.webp", alt: "b" } },
          { prompt: "no picture" },
        ],
      },
    };
    expect(imageCoverage(activity, new Set(["/images/a/question-1.webp"]))).toEqual({
      items: 3,
      planned: 2,
      uploaded: 1,
      target: 0.8,
    });
    expect(imageCoverage({ ...activity, levelMin: "advanced" }, new Set()).target).toBe(0.5);
    // Emoji pictures and video clips count as the item's visual; read-aloud audio doesn't.
    const visual = {
      type: "quiz" as const,
      levelMin: "beginner",
      content: {
        questions: [
          { media: { kind: "emoji", text: "🍎", label: "apple" } },
          { media: { kind: "youtube", videoId: "YE7VzlLtp-4" } },
          { media: { kind: "tts", text: "Hello" } },
        ],
      },
    };
    expect(imageCoverage(visual, new Set())).toMatchObject({ items: 3, planned: 2, uploaded: 2 });
  });
});

describe("fillPlannedSrcs (RF07, CA07)", () => {
  it("gives the AI's pictures their planned paths so the answer validates", () => {
    const answer = {
      ...validQuiz(),
      slug: "weather",
      thumbnail: { alt: "A sun", source: "ai", prompt: "A sun." },
      content: {
        questions: [
          {
            prompt: "It's ___ today.",
            media: { kind: "image", alt: "Rain on a window", prompt: "Rain on a window. Flat." },
            options: [{ text: "rainy", correct: true }, { text: "sunny" }],
          },
        ],
      },
    };
    const filled = fillPlannedSrcs(answer as never) as typeof answer & {
      thumbnail: { src: string };
      content: { questions: { media: { src: string } }[] };
    };
    expect(filled.thumbnail.src).toBe("/images/activities/weather/thumb.webp");
    expect(filled.content.questions[0].media.src).toBe(
      "/images/activities/weather/question-1.webp",
    );
    expect(validateActivity(filled).ok).toBe(true);
  });
});

describe("Few images filter (RF08)", () => {
  it("keeps activities below their level's target, and lives in the URL", async () => {
    const { filterAdminActivities, NO_ADMIN_FILTERS, parseAdminFilters, serializeAdminFilters } =
      await import("@/lib/admin/filter");
    const make = (slug: string, uploaded: boolean, levelMin = "beginner") =>
      ({
        id: slug,
        slug,
        title: slug,
        type: "quiz",
        levelMin,
        category: "grammar",
        status: "published",
        content: {
          questions: [
            { media: { kind: "image", src: `/images/${slug}.webp`, alt: "x" } },
            { prompt: "y" },
          ],
        },
      }) as never;
    const items = [
      make("half-beginner", true),
      make("half-advanced", true, "advanced"),
      make("none", false),
    ];
    const existing = new Set(["/images/half-beginner.webp", "/images/half-advanced.webp"]);
    const filters = { ...NO_ADMIN_FILTERS, fewImages: true };
    // 50% is below 80% (Beginner) but meets 50% (Advanced).
    expect(
      filterAdminActivities(items, filters, existing)
        .map((a) => a.slug)
        .sort(),
    ).toEqual(["half-beginner", "none"]);
    expect(serializeAdminFilters(filters)).toBe("images=few");
    expect(parseAdminFilters("?images=few").fewImages).toBe(true);
  });
});
