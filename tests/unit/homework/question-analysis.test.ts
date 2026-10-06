import { describe, expect, it, vi } from "vitest";
import {
  aggregateByQuestion,
  aggregateLiveRoomQuestions,
  batchAddSuggestedNotes,
  getStudentErrors,
  isGradableActivity,
  suggestNextFocus,
} from "@/lib/homework/question-analysis";
import type { HomeworkSubmission } from "@/lib/homework/types";
import * as notesRepo from "@/lib/notes/repository";
import type { StudentNote } from "@/lib/notes/types";

describe("Question analysis module (src/lib/homework/question-analysis.ts)", () => {
  const quizContent = {
    questions: [
      {
        id: "q1",
        prompt: "Where ___ you yesterday?",
        options: [
          { text: "was", correct: false },
          { text: "were", correct: true },
          { text: "are", correct: false },
        ],
      },
      {
        id: "q2",
        prompt: "She ___ to school every day.",
        options: [
          { text: "goes", correct: true },
          { text: "go", correct: false },
        ],
      },
      {
        id: "q3",
        prompt: "I have ___ apples.",
        options: [
          { text: "some", correct: true },
          { text: "any", correct: false },
        ],
      },
      {
        id: "q4",
        prompt: "He ___ a new car last week.",
        options: [
          { text: "bought", correct: true },
          { text: "buyed", correct: false },
          { text: "buys", correct: false },
        ],
      },
    ],
  };

  describe("aggregateByQuestion (RF01, RF02, CA01, CA02, CA07, CA08)", () => {
    it("aggregates % accuracy and sorts most missed to the top (CA01)", () => {
      // 6 submissions
      // Q1: 6/6 correct (100%)
      // Q2: 4/6 correct (67%)
      // Q3: 5/6 correct (83%)
      // Q4: 2/6 correct (33% - most missed!)
      const submissions: HomeworkSubmission[] = [
        {
          id: "s1",
          homeworkId: "hw1",
          studentName: "Ana",
          correct: 4,
          total: 4,
          seconds: 30,
          completedAt: new Date(),
          late: false,
          via: "token",
          answers: [
            { itemId: "q1", chosen: [1], correct: true },
            { itemId: "q2", chosen: [0], correct: true },
            { itemId: "q3", chosen: [0], correct: true },
            { itemId: "q4", chosen: [0], correct: true },
          ],
        },
        {
          id: "s2",
          homeworkId: "hw1",
          studentName: "Bruno",
          correct: 3,
          total: 4,
          seconds: 40,
          completedAt: new Date(),
          late: false,
          via: "token",
          answers: [
            { itemId: "q1", chosen: [1], correct: true },
            { itemId: "q2", chosen: [1], correct: false }, // missed Q2
            { itemId: "q3", chosen: [0], correct: true },
            { itemId: "q4", chosen: [1], correct: false }, // missed Q4
          ],
        },
        {
          id: "s3",
          homeworkId: "hw1",
          studentName: "Carlos",
          correct: 3,
          total: 4,
          seconds: 35,
          completedAt: new Date(),
          late: false,
          via: "token",
          answers: [
            { itemId: "q1", chosen: [1], correct: true },
            { itemId: "q2", chosen: [0], correct: true },
            { itemId: "q3", chosen: [1], correct: false }, // missed Q3
            { itemId: "q4", chosen: [1], correct: false }, // missed Q4
          ],
        },
        {
          id: "s4",
          homeworkId: "hw1",
          studentName: "Daniel",
          correct: 2,
          total: 4,
          seconds: 50,
          completedAt: new Date(),
          late: false,
          via: "token",
          answers: [
            { itemId: "q1", chosen: [1], correct: true },
            { itemId: "q2", chosen: [1], correct: false }, // missed Q2
            { itemId: "q3", chosen: [0], correct: true },
            { itemId: "q4", chosen: [2], correct: false }, // missed Q4
          ],
        },
        {
          id: "s5",
          homeworkId: "hw1",
          studentName: "Eduardo",
          correct: 3,
          total: 4,
          seconds: 45,
          completedAt: new Date(),
          late: false,
          via: "token",
          answers: [
            { itemId: "q1", chosen: [1], correct: true },
            { itemId: "q2", chosen: [0], correct: true },
            { itemId: "q3", chosen: [0], correct: true },
            { itemId: "q4", chosen: [1], correct: false }, // missed Q4
          ],
        },
        {
          id: "s6",
          homeworkId: "hw1",
          studentName: "Fernanda",
          correct: 4,
          total: 4,
          seconds: 30,
          completedAt: new Date(),
          late: false,
          via: "token",
          answers: [
            { itemId: "q1", chosen: [1], correct: true },
            { itemId: "q2", chosen: [0], correct: true },
            { itemId: "q3", chosen: [0], correct: true },
            { itemId: "q4", chosen: [0], correct: true },
          ],
        },
      ];

      const aggregates = aggregateByQuestion(quizContent, submissions, "quiz");

      expect(aggregates).toHaveLength(4);
      // Most missed is Q4 at 33% accuracy (4 errors)
      expect(aggregates[0].prompt).toBe("He ___ a new car last week.");
      expect(aggregates[0].accuracyPercentage).toBe(33);
      expect(aggregates[0].missedCount).toBe(4);
      expect(aggregates[0].missedByStudentNames).toEqual([
        "Bruno",
        "Carlos",
        "Daniel",
        "Eduardo",
      ]);

      // Least missed is Q1 at 100% accuracy
      expect(aggregates[3].prompt).toBe("Where ___ you yesterday?");
      expect(aggregates[3].accuracyPercentage).toBe(100);
      expect(aggregates[3].missedCount).toBe(0);
    });

    it("includes correct answer and option distribution (CA02)", () => {
      const submissions: HomeworkSubmission[] = [
        {
          id: "s1",
          homeworkId: "hw1",
          studentName: "Ana",
          correct: 1,
          total: 1,
          seconds: 10,
          completedAt: new Date(),
          late: false,
          via: "token",
          answers: [{ itemId: "q4", chosen: [0], correct: true }],
        },
        {
          id: "s2",
          homeworkId: "hw1",
          studentName: "Bruno",
          correct: 0,
          total: 1,
          seconds: 10,
          completedAt: new Date(),
          late: false,
          via: "token",
          answers: [{ itemId: "q4", chosen: [1], correct: false }],
        },
      ];

      const aggregates = aggregateByQuestion(quizContent, submissions, "quiz");
      const q4 = aggregates.find((a) => a.prompt.includes("bought") || a.prompt.includes("car"))!;

      expect(q4.correctAnswer).toBe("bought");
      expect(q4.optionsDistribution).toBeDefined();
      const boughtOpt = q4.optionsDistribution?.find((o) => o.text === "bought");
      const buyedOpt = q4.optionsDistribution?.find((o) => o.text === "buyed");
      expect(boughtOpt?.count).toBe(1);
      expect(buyedOpt?.count).toBe(1);
    });

    it("gracefully formats legacy submissions without itemId as 'Question N' (CA07)", () => {
      const submissions: HomeworkSubmission[] = [
        {
          id: "s1",
          homeworkId: "hw1",
          studentName: "Legacy Student",
          correct: 0,
          total: 2,
          seconds: 15,
          completedAt: new Date(),
          late: false,
          via: "anonymous",
          // Legacy format: raw choices array without itemId
          answers: [[0], [1]],
        },
      ];

      // No content passed (or empty content)
      const aggregates = aggregateByQuestion(null, submissions);
      expect(aggregates).toHaveLength(2);
      expect(aggregates[0].prompt).toBe("Question 1");
      expect(aggregates[1].prompt).toBe("Question 2");
    });

    it("detects removed/changed questions as 'Question changed' (CA08)", () => {
      // Content has only 1 question, but submission had 2 questions
      const singleQuestionContent = {
        questions: [{ id: "q1", prompt: "Hello world", options: [{ text: "hi", correct: true }] }],
      };

      const submissions: HomeworkSubmission[] = [
        {
          id: "s1",
          homeworkId: "hw1",
          studentName: "Student",
          correct: 1,
          total: 2,
          seconds: 10,
          completedAt: new Date(),
          late: false,
          via: "token",
          answers: [
            { itemId: "q1", chosen: [0], correct: true },
            { itemId: "q99_removed", chosen: [0], correct: false },
          ],
        },
      ];

      const aggregates = aggregateByQuestion(singleQuestionContent, submissions, "quiz");
      expect(aggregates).toHaveLength(2);
      const changed = aggregates.find((a) => a.itemId === "q99_removed");
      expect(changed?.isChanged).toBe(true);
    });
  });

  describe("getStudentErrors (RF03, RF04, CA03, CA04)", () => {
    it("extracts only missed questions with given answer and correct answer (CA03)", () => {
      const submission: HomeworkSubmission = {
        id: "s1",
        homeworkId: "hw1",
        studentName: "Ana",
        correct: 2,
        total: 4,
        seconds: 30,
        completedAt: new Date(),
        late: false,
        via: "token",
        answers: [
          { itemId: "q1", chosen: [1], correct: true },
          { itemId: "q2", chosen: [1], correct: false }, // Missed Q2 (chose "go", correct "goes")
          { itemId: "q3", chosen: [0], correct: true },
          { itemId: "q4", chosen: [1], correct: false }, // Missed Q4 (chose "buyed", correct "bought")
        ],
      };

      const errors = getStudentErrors(submission, quizContent, "quiz", "grammar");
      expect(errors).toHaveLength(2);

      // Q2
      expect(errors[0].prompt).toBe("She ___ to school every day.");
      expect(errors[0].studentAnswer).toBe("go");
      expect(errors[0].correctAnswer).toBe("goes");

      // Q4
      expect(errors[1].prompt).toBe("He ___ a new car last week.");
      expect(errors[1].studentAnswer).toBe("buyed");
      expect(errors[1].correctAnswer).toBe("bought");
    });

    it("pre-populates suggested note with category, student answer and correction (CA04)", () => {
      const submission: HomeworkSubmission = {
        id: "s1",
        homeworkId: "hw1",
        studentName: "Ana",
        correct: 0,
        total: 1,
        seconds: 20,
        completedAt: new Date(),
        late: false,
        via: "token",
        answers: [{ itemId: "q4", chosen: [1], correct: false }],
      };

      const errors = getStudentErrors(submission, quizContent, "quiz", "grammar");
      expect(errors[0].suggestedNote).toEqual({
        category: "grammar",
        text: "buyed",
        correction: "bought",
      });
    });
  });

  describe("batchAddSuggestedNotes with deduplication (RF05, CA05)", () => {
    it("deduplicates existing notes using normalized keys (CA05)", async () => {
      const existingNotes: StudentNote[] = [
        {
          id: "n1",
          studentId: "s1",
          category: "grammar",
          text: "goed",
          correction: "went",
          visibility: "private",
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const createSpy = vi
        .spyOn(notesRepo, "createStudentNote")
        .mockImplementation(async (studentId, input) => ({
          id: "n2",
          studentId,
          category: input.category,
          text: input.text,
          correction: input.correction,
          visibility: input.visibility ?? "private",
          resolved: false,
          source: input.source,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      const suggestions = [
        { category: "grammar" as const, text: "goed", correction: "went" }, // duplicate!
        { category: "grammar" as const, text: "buyed", correction: "bought" }, // new!
      ];

      const res = await batchAddSuggestedNotes("s1", suggestions, existingNotes);

      expect(res.duplicatesSkipped).toBe(1);
      expect(res.added).toHaveLength(1);
      expect(res.added[0].text).toBe("buyed");
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({
          text: "buyed",
          correction: "bought",
          source: "homework",
          visibility: "private",
        }),
      );

      createSpy.mockRestore();
    });
  });

  describe("aggregateLiveRoomQuestions (RF06, CA06)", () => {
    it("aggregates question performance from live room answers", () => {
      const answersMap = {
        "0": {
          u1: { correct: true },
          u2: { correct: true },
        },
        "1": {
          u1: { correct: false },
          u2: { correct: true },
        },
      };

      const participants = {
        u1: { name: "Ana" },
        u2: { name: "Bruno" },
      };

      const aggregates = aggregateLiveRoomQuestions(
        answersMap,
        quizContent,
        participants,
        "quiz",
      );

      expect(aggregates).toHaveLength(2);
      // Item 1 had 1/2 correct (50%), item 0 had 2/2 correct (100%)
      expect(aggregates[0].itemIndex).toBe(1);
      expect(aggregates[0].accuracyPercentage).toBe(50);
      expect(aggregates[0].missedByStudentNames).toEqual(["Ana"]);

      expect(aggregates[1].itemIndex).toBe(0);
      expect(aggregates[1].accuracyPercentage).toBe(100);
    });
  });

  describe("isGradableActivity (RNF05, CA09)", () => {
    it("returns false for flashcards and prompt-cards, true for quiz and blanks", () => {
      expect(isGradableActivity("flashcards")).toBe(false);
      expect(isGradableActivity("prompt-cards")).toBe(false);
      expect(isGradableActivity("quiz")).toBe(true);
      expect(isGradableActivity("fill-blanks")).toBe(true);
      expect(isGradableActivity("sentence-order")).toBe(true);
    });
  });

  describe("suggestNextFocus (RF08, CA11)", () => {
    it("extracts unique points from unresolved homework error notes", () => {
      const notes: StudentNote[] = [
        {
          id: "n1",
          studentId: "s1",
          category: "grammar",
          text: "goed",
          correction: "went",
          visibility: "private",
          resolved: false,
          source: "homework",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "n2",
          studentId: "s1",
          category: "grammar",
          text: "buyed",
          correction: "bought",
          visibility: "private",
          resolved: false,
          source: "homework",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "n3",
          studentId: "s1",
          category: "general",
          text: "Good participation",
          visibility: "private",
          resolved: false,
          source: "lesson",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "n4",
          studentId: "s1",
          category: "grammar",
          text: "goed",
          correction: "went",
          visibility: "private",
          resolved: true, // resolved, skip
          source: "homework",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const focusPoints = suggestNextFocus(notes);
      expect(focusPoints).toEqual(["goed → went", "buyed → bought"]);
    });
  });
});
