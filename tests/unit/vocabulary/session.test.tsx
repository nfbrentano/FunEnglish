import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  commitSessionPendingVocabulary,
  SessionVocabularyManager,
  type SessionPendingWord,
} from "@/components/vocabulary/session-vocabulary-manager";
import * as repository from "@/lib/vocabulary/repository";

vi.mock("@/lib/vocabulary/repository", () => ({
  recordSessionVocabulary: vi.fn().mockResolvedValue(undefined),
}));

describe("Session Vocabulary (CA01, CA02, CT01, CT02)", () => {
  it("indicates '6 students' when adding a word with 6 present students (CA01, CT01)", () => {
    const presentStudents = [
      { id: "s1", name: "Ana" },
      { id: "s2", name: "Bruno" },
      { id: "s3", name: "Carlos" },
      { id: "s4", name: "Daniela" },
      { id: "s5", name: "Eduardo" },
      { id: "s6", name: "Fernanda" },
    ];

    let pending: SessionPendingWord[] = [];
    const handlePendingChange = vi.fn((words) => {
      pending = words;
    });

    const { rerender } = render(
      <SessionVocabularyManager
        presentStudents={presentStudents}
        pendingWords={pending}
        onPendingWordsChange={handlePendingChange}
      />,
    );

    // Enter term and meaning
    const termInput = screen.getByPlaceholderText(/e\.g\. boarding pass/i);
    const meaningInput = screen.getByPlaceholderText(/e\.g\. cartão de embarque/i);

    fireEvent.change(termInput, { target: { value: "boarding pass" } });
    fireEvent.change(meaningInput, { target: { value: "cartão de embarque" } });

    // Submit "Add word"
    const addBtn = screen.getByRole("button", { name: /add word/i });
    fireEvent.click(addBtn);

    expect(handlePendingChange).toHaveBeenCalledTimes(1);
    const savedWords = handlePendingChange.mock.calls[0]![0] as SessionPendingWord[];
    expect(savedWords).toHaveLength(1);
    expect(savedWords[0]?.term).toBe("boarding pass");
    expect(savedWords[0]?.meaning).toBe("cartão de embarque");
    expect(savedWords[0]?.targetStudentIds).toHaveLength(6);

    // Rerender with updated pending words
    rerender(
      <SessionVocabularyManager
        presentStudents={presentStudents}
        pendingWords={savedWords}
        onPendingWordsChange={handlePendingChange}
      />,
    );

    // CA01: The word appears in session words list with indication "6 students"
    expect(screen.getByText("boarding pass")).toBeDefined();
    expect(screen.getByText("cartão de embarque")).toBeDefined();
    expect(screen.getByText("6 students")).toBeDefined();
  });

  it("commits 3 words only for present students, not absent (CA02, CT02)", async () => {
    // 3 present students, 1 absent
    const presentStudentIds = ["ana", "bruno", "carlos"];
    // absent student: "daniel" (not in presentStudentIds)

    const pendingWords: SessionPendingWord[] = [
      {
        id: "boarding-pass",
        term: "boarding pass",
        meaning: "cartão de embarque",
        targetStudentIds: presentStudentIds,
      },
      {
        id: "luggage",
        term: "luggage",
        meaning: "bagagem",
        targetStudentIds: presentStudentIds,
      },
      {
        id: "customs",
        term: "customs",
        meaning: "alfândega",
        targetStudentIds: presentStudentIds,
      },
    ];

    await commitSessionPendingVocabulary(pendingWords, "session-42");

    // Must be recorded for each present student
    expect(repository.recordSessionVocabulary).toHaveBeenCalledTimes(3);

    const calls = vi.mocked(repository.recordSessionVocabulary).mock.calls;
    const recordedStudentIds = calls.map((c) => c[0].studentIds[0]);

    expect(recordedStudentIds).toContain("ana");
    expect(recordedStudentIds).toContain("bruno");
    expect(recordedStudentIds).toContain("carlos");
    expect(recordedStudentIds).not.toContain("daniel");

    // Each present student receives all 3 words
    for (const call of calls) {
      expect(call[0].words).toHaveLength(3);
      expect(call[0].sessionId).toBe("session-42");
    }
  });
});
