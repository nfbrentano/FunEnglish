import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentVocabularySection } from "@/components/vocabulary/student-vocabulary-section";
import * as repository from "@/lib/vocabulary/repository";
import type { StudentWord } from "@/lib/vocabulary/types";

vi.mock("@/lib/vocabulary/repository", () => ({
  getStudentVocabulary: vi.fn(),
  addWordToStudent: vi.fn(),
  updateWord: vi.fn(),
  deleteWord: vi.fn(),
}));

describe("StudentVocabularySection (Teacher View: CA03, CA04, CT03, CT04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds word directly without session (CA03, CT03)", async () => {
    vi.mocked(repository.getStudentVocabulary).mockResolvedValue([]);

    const newWord: StudentWord = {
      id: "luggage",
      term: "luggage",
      meaning: "bagagem",
      sessionIds: [],
      firstAddedAt: new Date().toISOString(),
      lastAddedAt: new Date().toISOString(),
      learned: false,
    };
    vi.mocked(repository.addWordToStudent).mockResolvedValue(newWord);

    render(<StudentVocabularySection studentId="ana-1" studentName="Ana" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add word/i })).toBeDefined();
    });

    // Open Add Word modal
    fireEvent.click(screen.getByRole("button", { name: /add word/i }));

    const termInput = screen.getByPlaceholderText(/e\.g\. boarding pass/i);
    const meaningInput = screen.getByPlaceholderText(/e\.g\. cartão de embarque/i);

    fireEvent.change(termInput, { target: { value: "luggage" } });
    fireEvent.change(meaningInput, { target: { value: "bagagem" } });

    // Submit save
    const saveBtn = screen.getByRole("button", { name: /save word/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(repository.addWordToStudent).toHaveBeenCalledWith("ana-1", {
        term: "luggage",
        meaning: "bagagem",
        example: undefined,
      });
      // The word appears in dictionary without session/class origin
      expect(screen.getByText("luggage")).toBeDefined();
      expect(screen.getByText("Added directly")).toBeDefined();
    });
  });

  it("deduplicates terms and updates class occurrences (CA04, CT04)", async () => {
    // Initial state: "Luggage" seen in 1 class
    const initialWord: StudentWord = {
      id: "luggage",
      term: "Luggage",
      sessionIds: ["sess-1"],
      firstAddedAt: new Date(2026, 9, 1).toISOString(),
      lastAddedAt: new Date(2026, 9, 1).toISOString(),
      learned: false,
    };

    vi.mocked(repository.getStudentVocabulary).mockResolvedValue([initialWord]);

    // When " luggage " is added in a second session:
    const updatedWord: StudentWord = {
      id: "luggage",
      term: "Luggage",
      sessionIds: ["sess-1", "sess-2"],
      firstAddedAt: new Date(2026, 9, 1).toISOString(),
      lastAddedAt: new Date(2026, 9, 2).toISOString(),
      learned: false,
    };
    vi.mocked(repository.addWordToStudent).mockResolvedValue(updatedWord);

    render(<StudentVocabularySection studentId="ana-1" studentName="Ana" />);

    await waitFor(() => {
      expect(screen.getByText("Luggage")).toBeDefined();
      expect(screen.getByText("seen in 1 class")).toBeDefined();
    });

    // Add " luggage "
    fireEvent.click(screen.getByRole("button", { name: /add word/i }));
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. boarding pass/i), {
      target: { value: " luggage " },
    });
    fireEvent.click(screen.getByRole("button", { name: /save word/i }));

    await waitFor(() => {
      // CA04: no duplicate entry, shows "seen in 2 classes"
      const items = screen.getAllByText("Luggage");
      expect(items).toHaveLength(1);
      expect(screen.getByText("seen in 2 classes")).toBeDefined();
    });
  });
});
