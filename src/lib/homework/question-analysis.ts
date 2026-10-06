import { normalizeNoteKey } from "@/lib/notes/recurring";
import { createStudentNote } from "@/lib/notes/repository";
import type {
  CreateNoteInput,
  NoteCategory,
  StudentNote,
} from "@/lib/notes/types";
import type { HomeworkSubmission } from "./types";

export interface OptionDistributionItem {
  text: string;
  count: number;
  isCorrect: boolean;
}

export interface AnswerFrequencyItem {
  text: string;
  count: number;
}

export interface QuestionAggregate {
  itemIndex: number;
  itemId?: string;
  prompt: string;
  correctAnswer: string;
  accuracyPercentage: number;
  totalAnswers: number;
  correctCount: number;
  missedCount: number;
  missedByStudentNames: string[];
  optionsDistribution?: OptionDistributionItem[];
  frequentAnswers?: AnswerFrequencyItem[];
  isChanged?: boolean;
}

export interface StudentQuestionError {
  itemIndex: number;
  itemId?: string;
  prompt: string;
  studentAnswer: string;
  correctAnswer: string;
  isChanged?: boolean;
  suggestedNote: {
    category: NoteCategory;
    text: string;
    correction: string;
  };
}

/** Non-gradable activities without questions or right/wrong answers (RNF05, CA09) */
export const NON_GRADABLE_ACTIVITY_TYPES = new Set([
  "flashcards",
  "prompt-cards",
]);

export function isGradableActivity(activityType?: string | null): boolean {
  if (!activityType) return true;
  return !NON_GRADABLE_ACTIVITY_TYPES.has(activityType.toLowerCase());
}

/**
 * Infers appropriate note error category from activity category or metadata.
 */
export function inferNoteCategory(activityCategory?: string | null): NoteCategory {
  if (!activityCategory) return "grammar";
  const cat = activityCategory.toLowerCase();
  if (cat.includes("vocab") || cat.includes("word") || cat.includes("lexi")) {
    return "vocabulary";
  }
  if (cat.includes("pronun") || cat.includes("sound") || cat.includes("phon")) {
    return "pronunciation";
  }
  return "grammar";
}

/**
 * Extracts question prompt, correct answer text, and options for an item by index or ID.
 */
export function getQuestionMetadata(
  content: any,
  index: number,
  itemId?: string,
  activityType?: string,
): {
  prompt: string;
  correctAnswer: string;
  options?: { text: string; correct: boolean }[];
  isChanged?: boolean;
} {
  if (!content) {
    return {
      prompt: `Question ${index + 1}`,
      correctAnswer: "",
      isChanged: true,
    };
  }

  // 1. Quiz
  if (activityType === "quiz" || Array.isArray(content.questions)) {
    const questions: any[] = content.questions || [];
    const q =
      (itemId ? questions.find((item: any) => item.id === itemId) : null) ||
      questions[index];

    if (!q) {
      return {
        prompt: "Question changed",
        correctAnswer: "",
        isChanged: true,
      };
    }

    const prompt = q.prompt || `Question ${index + 1}`;
    const opts: { text: string; correct: boolean }[] = Array.isArray(q.options)
      ? q.options.map((o: any) => ({
          text: String(o.text ?? ""),
          correct: Boolean(o.correct),
        }))
      : [];

    const correctAnswers = opts
      .filter((o) => o.correct)
      .map((o) => o.text)
      .join(", ");

    return {
      prompt,
      correctAnswer: correctAnswers,
      options: opts,
    };
  }

  // 2. Fill in the blanks
  if (activityType === "fill-blanks" || Array.isArray(content.items)) {
    const items: any[] = content.items || [];
    const it =
      (itemId ? items.find((item: any) => item.id === itemId) : null) ||
      items[index];

    if (!it) {
      return {
        prompt: `Question ${index + 1}`,
        correctAnswer: "",
        isChanged: true,
      };
    }

    // Extract blanks from [[answer|alt]]
    const prompt = String(it.text || `Question ${index + 1}`);
    const matches = Array.from(prompt.matchAll(/\[\[([^\]]+)\]\]/g));
    const expected = matches
      .map((m) => m[1].split("|")[0].trim())
      .filter(Boolean)
      .join(", ");

    return {
      prompt: prompt.replace(/\[\[([^\]]+)\]\]/g, "_____"),
      correctAnswer: expected,
    };
  }

  // 3. Sentence order
  if (activityType === "sentence-order" && Array.isArray(content.items)) {
    const items: any[] = content.items;
    const it =
      (itemId ? items.find((item: any) => item.id === itemId) : null) ||
      items[index];

    if (!it) {
      return {
        prompt: `Question ${index + 1}`,
        correctAnswer: "",
        isChanged: true,
      };
    }

    return {
      prompt: it.translation || it.sentence || `Question ${index + 1}`,
      correctAnswer: it.sentence || "",
    };
  }

  return {
    prompt: `Question ${index + 1}`,
    correctAnswer: "",
    isChanged: true,
  };
}

/**
 * Extracts student's given answer representation as a string.
 */
export function stringifyStudentAnswer(
  ans: any,
  meta: { options?: { text: string; correct: boolean }[] },
): string {
  if (ans === undefined || ans === null) return "No answer";

  if (typeof ans === "string") return ans.trim() || "No answer";

  if (typeof ans === "number") {
    if (meta.options && meta.options[ans]) {
      return meta.options[ans].text;
    }
    return String(ans);
  }

  if (Array.isArray(ans)) {
    if (ans.length === 0) return "No answer";
    if (typeof ans[0] === "number" && meta.options) {
      return ans
        .map((idx) => meta.options?.[idx]?.text ?? String(idx))
        .join(", ");
    }
    return ans.map(String).join(" ");
  }

  if (typeof ans === "object") {
    if (Array.isArray(ans.given)) {
      return stringifyStudentAnswer(ans.given, meta);
    }
    if (Array.isArray(ans.chosen)) {
      return stringifyStudentAnswer(ans.chosen, meta);
    }
    if (Array.isArray(ans.blanks)) {
      return ans.blanks.map(String).join(", ");
    }
    if (typeof ans.chosen === "string") return ans.chosen;
    if (typeof ans.given === "string") return ans.given;
  }

  return String(ans);
}

/**
 * Determines whether a student answer was correct.
 */
export function isAnswerCorrect(
  ans: any,
  itemIndex: number,
  content: any,
  activityType?: string,
): boolean {
  if (ans && typeof ans === "object" && typeof ans.correct === "boolean") {
    return ans.correct;
  }

  // Infer from quiz options
  if (activityType === "quiz" && content?.questions?.[itemIndex]) {
    const q = content.questions[itemIndex];
    const correctIndices: number[] = [];
    if (Array.isArray(q.options)) {
      q.options.forEach((opt: any, optIdx: number) => {
        if (opt.correct) correctIndices.push(optIdx);
      });
    }
    let chosen: number[] = [];
    if (Array.isArray(ans)) chosen = ans;
    else if (typeof ans === "number") chosen = [ans];
    else if (ans && typeof ans === "object") {
      if (Array.isArray(ans.chosen)) chosen = ans.chosen;
      else if (Array.isArray(ans.given)) chosen = ans.given;
    }

    return (
      chosen.length === correctIndices.length &&
      chosen.every((i) => correctIndices.includes(i))
    );
  }

  return false;
}

/**
 * Aggregates questions across homework submissions (RF01, RF02, CA01, CA02, CA07, CA08).
 * Orders questions by accuracy percentage ascending (most missed first).
 */
export function aggregateByQuestion(
  content: any,
  submissions: HomeworkSubmission[],
  activityType?: string,
): QuestionAggregate[] {
  // Determine item count from content or max answers in submissions
  let totalItems = 0;
  if (content) {
    if (Array.isArray(content.questions)) totalItems = content.questions.length;
    else if (Array.isArray(content.items)) totalItems = content.items.length;
  }
  for (const sub of submissions) {
    if (Array.isArray(sub.answers)) {
      totalItems = Math.max(totalItems, sub.answers.length);
    }
  }

  const aggregates: QuestionAggregate[] = [];

  for (let i = 0; i < totalItems; i++) {
    // Find item ID from content or submission
    let itemId: string | undefined;
    if (content?.questions?.[i]?.id) itemId = content.questions[i].id;
    else if (content?.items?.[i]?.id) itemId = content.items[i].id;

    if (!itemId) {
      for (const sub of submissions) {
        const a: any = sub.answers?.[i];
        if (a && typeof a === "object" && a.itemId) {
          itemId = a.itemId;
          break;
        }
      }
    }

    const meta = getQuestionMetadata(content, i, itemId, activityType);

    let totalAnswered = 0;
    let correctCount = 0;
    const missedByStudentNames: string[] = [];

    // Quiz options distribution tracker
    const optionCounts = new Map<string, number>();
    if (meta.options) {
      meta.options.forEach((opt) => optionCounts.set(opt.text, 0));
    }

    // Freeform answers frequency tracker
    const answerCounts = new Map<string, number>();

    for (const sub of submissions) {
      let ansEntry: any;
      if (itemId && Array.isArray(sub.answers)) {
        ansEntry = sub.answers.find(
          (a: any) => a && typeof a === "object" && a.itemId === itemId,
        );
      }
      if (ansEntry === undefined) {
        ansEntry = sub.answers?.[i];
      }
      if (ansEntry === undefined) continue;

      totalAnswered++;
      const correct = isAnswerCorrect(ansEntry, i, content, activityType);

      if (correct) {
        correctCount++;
      } else {
        missedByStudentNames.push(sub.studentName || "Anonymous");
      }

      // Track distribution
      if (meta.options) {
        let chosenIndices: number[] = [];
        if (Array.isArray(ansEntry)) chosenIndices = ansEntry;
        else if (typeof ansEntry === "number") chosenIndices = [ansEntry];
        else if (ansEntry && typeof ansEntry === "object") {
          if (Array.isArray(ansEntry.chosen)) chosenIndices = ansEntry.chosen;
          else if (Array.isArray(ansEntry.given)) chosenIndices = ansEntry.given;
        }

        chosenIndices.forEach((idx) => {
          const optText = meta.options?.[idx]?.text;
          if (optText) {
            optionCounts.set(optText, (optionCounts.get(optText) || 0) + 1);
          }
        });
      } else {
        const text = stringifyStudentAnswer(ansEntry, meta);
        if (text && text !== "No answer") {
          answerCounts.set(text, (answerCounts.get(text) || 0) + 1);
        }
      }
    }

    const accuracyPercentage =
      totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const missedCount = totalAnswered - correctCount;

    let optionsDistribution: OptionDistributionItem[] | undefined;
    if (meta.options) {
      optionsDistribution = meta.options.map((opt) => ({
        text: opt.text,
        count: optionCounts.get(opt.text) || 0,
        isCorrect: opt.correct,
      }));
    }

    let frequentAnswers: AnswerFrequencyItem[] | undefined;
    if (!meta.options && answerCounts.size > 0) {
      frequentAnswers = Array.from(answerCounts.entries())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count);
    }

    aggregates.push({
      itemIndex: i,
      itemId,
      prompt: meta.prompt,
      correctAnswer: meta.correctAnswer,
      accuracyPercentage,
      totalAnswers: totalAnswered,
      correctCount,
      missedCount,
      missedByStudentNames,
      optionsDistribution,
      frequentAnswers,
      isChanged: meta.isChanged,
    });
  }

  // Sort ascending by accuracy percentage (most missed on top, RF01, CA01)
  return aggregates.sort((a, b) => {
    if (a.accuracyPercentage !== b.accuracyPercentage) {
      return a.accuracyPercentage - b.accuracyPercentage;
    }
    return b.missedCount - a.missedCount;
  });
}

/**
 * Extracts errors for a single student submission (RF03, RF04, CA03, CA04, CA08).
 */
export function getStudentErrors(
  submission: HomeworkSubmission,
  content: any,
  activityType?: string,
  activityCategory?: string,
): StudentQuestionError[] {
  const errors: StudentQuestionError[] = [];
  const answers = Array.isArray(submission.answers) ? submission.answers : [];

  for (let i = 0; i < answers.length; i++) {
    const ansEntry: any = answers[i];
    if (ansEntry === undefined) continue;

    const correct = isAnswerCorrect(ansEntry, i, content, activityType);
    if (!correct) {
      const itemId =
        ansEntry && typeof ansEntry === "object" ? ansEntry.itemId : undefined;
      const meta = getQuestionMetadata(content, i, itemId, activityType);
      const studentAnswer = stringifyStudentAnswer(ansEntry, meta);

      errors.push({
        itemIndex: i,
        itemId,
        prompt: meta.prompt,
        studentAnswer,
        correctAnswer: meta.correctAnswer,
        isChanged: meta.isChanged,
        suggestedNote: {
          category: inferNoteCategory(activityCategory),
          text: studentAnswer && studentAnswer !== "No answer" ? studentAnswer : meta.prompt,
          correction: meta.correctAnswer,
        },
      });
    }
  }

  return errors;
}

/**
 * Aggregates questions from a live room session (RF06, CA06).
 */
export function aggregateLiveRoomQuestions(
  answersMap: Record<string, Record<string, { correct?: boolean; answer?: any }>>,
  content?: any,
  participants?: Record<string, { name?: string }>,
  activityType?: string,
): QuestionAggregate[] {
  const aggregates: QuestionAggregate[] = [];
  const itemKeys = Object.keys(answersMap || {});

  for (const itemKey of itemKeys) {
    const itemIndex = parseInt(itemKey, 10);
    const answersForQuestion = answersMap[itemKey] || {};

    let totalAnswered = 0;
    let correctCount = 0;
    const missedByStudentNames: string[] = [];

    for (const [uid, ans] of Object.entries(answersForQuestion)) {
      totalAnswered++;
      if (ans.correct) {
        correctCount++;
      } else {
        const studentName = participants?.[uid]?.name || "Student";
        missedByStudentNames.push(studentName);
      }
    }

    const meta = getQuestionMetadata(content, itemIndex, undefined, activityType);
    const accuracyPercentage =
      totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    aggregates.push({
      itemIndex,
      prompt: meta.prompt,
      correctAnswer: meta.correctAnswer,
      accuracyPercentage,
      totalAnswers: totalAnswered,
      correctCount,
      missedCount: totalAnswered - correctCount,
      missedByStudentNames,
      isChanged: meta.isChanged,
    });
  }

  // Sort: most missed first
  return aggregates.sort((a, b) => a.accuracyPercentage - b.accuracyPercentage);
}

/**
 * Extracts suggested lesson focus topics from open homework error notes (RF08, CA11).
 */
export function suggestNextFocus(notes: StudentNote[]): string[] {
  const homeworkErrorNotes = notes.filter(
    (n) => !n.resolved && n.source === "homework",
  );

  const points: string[] = [];
  for (const note of homeworkErrorNotes) {
    const label = note.correction
      ? `${note.text} → ${note.correction}`
      : note.text;
    if (label && !points.includes(label)) {
      points.push(label);
    }
  }

  return points;
}

/**
 * Batch adds suggested notes with deduplication against existing notes (RF05, CA05).
 */
export async function batchAddSuggestedNotes(
  studentId: string,
  suggestions: CreateNoteInput[],
  existingNotes: StudentNote[],
): Promise<{ added: StudentNote[]; duplicatesSkipped: number }> {
  const existingKeys = new Set(
    existingNotes.map((n) => normalizeNoteKey(n.text, n.correction)),
  );

  const added: StudentNote[] = [];
  let duplicatesSkipped = 0;

  for (const sug of suggestions) {
    const key = normalizeNoteKey(sug.text, sug.correction);
    if (existingKeys.has(key)) {
      duplicatesSkipped++;
      continue;
    }

    // Add note
    const newNote = await createStudentNote(studentId, {
      ...sug,
      visibility: sug.visibility ?? "private",
      source: "homework",
    });

    existingKeys.add(key);
    added.push(newNote);
  }

  return { added, duplicatesSkipped };
}
