export interface GradeResult {
  correct: number;
  total: number;
}

/** Matches a blank written as [[answer]] or [[answer|alternative]]. */
const BLANK = /\[\[([^\]]+)\]\]/g;

/** Case, extra spaces and curly apostrophes don't matter; spelling does. */
export function normalizeAnswer(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function parseBlanks(text: string): string[][] {
  const blankAnswers: string[][] = [];
  for (const match of text.matchAll(BLANK)) {
    const answers = match[1]
      .split("|")
      .map((a) => a.trim())
      .filter(Boolean);
    blankAnswers.push(answers);
  }
  return blankAnswers;
}

export function isBlankCorrect(value: string, answers: readonly string[]): boolean {
  const normalized = normalizeAnswer(value || "");
  return normalized !== "" && answers.some((answer) => normalizeAnswer(answer) === normalized);
}

/**
 * Server-side grading of activity submissions (RNF04, RF10, CA08, CA09).
 * Ignores any client-submitted score and grades raw answers against activity content.
 */
export function gradeActivityAnswers(
  activityType: string,
  content: any,
  rawAnswers: unknown[],
): GradeResult {
  if (!content) {
    return { correct: 0, total: 0 };
  }

  // Activities without score (RF10, CA08): flashcards, prompt-cards
  if (activityType === "flashcards" || activityType === "prompt-cards") {
    return { correct: 0, total: 0 };
  }

  // Multiple-choice quiz
  if (activityType === "quiz" && Array.isArray(content.questions)) {
    const questions: any[] = content.questions;
    let correct = 0;
    const total = questions.length;

    questions.forEach((q, idx) => {
      const correctIndices: number[] = [];
      if (Array.isArray(q.options)) {
        q.options.forEach((opt: any, optIdx: number) => {
          if (opt.correct === true) {
            correctIndices.push(optIdx);
          }
        });
      }

      const answerEntry = rawAnswers?.[idx];
      let chosen: number[] = [];
      if (Array.isArray(answerEntry)) {
        chosen = answerEntry;
      } else if (answerEntry && typeof answerEntry === "object" && "chosen" in answerEntry) {
        chosen = Array.isArray((answerEntry as any).chosen) ? (answerEntry as any).chosen : [];
      } else if (typeof answerEntry === "number") {
        chosen = [answerEntry];
      }

      if (
        chosen.length === correctIndices.length &&
        chosen.every((i) => correctIndices.includes(i))
      ) {
        correct++;
      }
    });

    return { correct, total };
  }

  // Fill in the blanks
  if (activityType === "fill-blanks" && Array.isArray(content.items)) {
    const items: any[] = content.items;
    let correct = 0;
    let total = 0;

    items.forEach((item, itemIdx) => {
      const blankAnswers = parseBlanks(item.text || "");
      total += blankAnswers.length;

      const userItemAnswers = rawAnswers?.[itemIdx];
      let userValues: string[] = [];
      if (Array.isArray(userItemAnswers)) {
        userValues = userItemAnswers.map(String);
      } else if (userItemAnswers && typeof userItemAnswers === "object" && "blanks" in userItemAnswers) {
        userValues = Array.isArray((userItemAnswers as any).blanks)
          ? (userItemAnswers as any).blanks.map(String)
          : [];
      }

      blankAnswers.forEach((validAnswers, bIdx) => {
        const val = userValues[bIdx] || "";
        if (isBlankCorrect(val, validAnswers)) {
          correct++;
        }
      });
    });

    return { correct, total };
  }

  // Quiz-board / Jeopardy
  if (activityType === "quiz-board" && Array.isArray(content.categories)) {
    let totalClues = 0;
    for (const cat of content.categories) {
      if (Array.isArray(cat.clues)) {
        totalClues += cat.clues.length;
      }
    }
    const correct = Array.isArray(rawAnswers)
      ? rawAnswers.filter((a) => Boolean(a && (a as any).correct)).length
      : 0;
    return { correct, total: totalClues };
  }

  // Default fallback
  const total = Array.isArray(rawAnswers) ? rawAnswers.length : 0;
  return { correct: 0, total };
}
