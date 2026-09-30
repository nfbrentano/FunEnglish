import type { ActivityInput } from "@/lib/activities/schema/activity";

/** A minimal valid quiz. Tests clone and break it. */
export function validQuiz(): Record<string, unknown> {
  return {
    slug: "present-perfect-quiz",
    title: "Present Perfect Quiz",
    description: "Practice the present perfect.",
    category: "grammar",
    type: "quiz",
    levelMin: "intermediate",
    levelMax: "advanced",
    thumbnail: { src: "/images/x.webp", alt: "A calendar", source: "ai" },
    content: {
      questions: [
        {
          prompt: "I ___ never been to Paris.",
          options: [{ text: "have", correct: true }, { text: "has" }],
        },
      ],
    },
  } satisfies Partial<Record<keyof ActivityInput, unknown>>;
}
