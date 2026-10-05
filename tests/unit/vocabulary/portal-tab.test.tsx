import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentVocabularyTab } from "@/components/portal/student-vocabulary-tab";
import * as speech from "@/lib/player/speech";
import * as repository from "@/lib/vocabulary/repository";
import type { StudentWord } from "@/lib/vocabulary/types";

// Mock repository
vi.mock("@/lib/vocabulary/repository", () => ({
  getStudentVocabulary: vi.fn(),
  setWordLearned: vi.fn(),
}));

// Mock speech
vi.mock("@/lib/player/speech", () => ({
  isSpeechSupported: vi.fn(() => true),
  speak: vi.fn(),
}));

describe("StudentVocabularyTab (CA05, CA06, CA07, CT05, CT06, CT07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters vocabulary by search term and triggers TTS speech (CA05, CT05)", async () => {
    // Generate 30 words, 2 containing "pass"
    const mockWords: StudentWord[] = Array.from({ length: 30 }, (_, i) => ({
      id: `word-${i}`,
      term: i === 0 ? "boarding pass" : i === 1 ? "password" : `word ${i}`,
      meaning: i === 0 ? "cartão de embarque" : `meaning ${i}`,
      example: `example sentence ${i}`,
      sessionIds: [`sess-${i}`],
      firstAddedAt: new Date(2026, 9, 1).toISOString(),
      lastAddedAt: new Date(2026, 9, 1, 10, i).toISOString(),
      learned: false,
    }));

    vi.mocked(repository.getStudentVocabulary).mockResolvedValue(mockWords);

    render(<StudentVocabularyTab studentId="ana-123" />);

    // Wait for loaded
    await waitFor(() => {
      expect(screen.getByText("boarding pass")).toBeDefined();
    });

    // Search for "pass"
    const searchInput = screen.getByPlaceholderText(/search words/i);
    fireEvent.change(searchInput, { target: { value: "pass" } });

    // Only terms containing "pass" should be shown
    expect(screen.getByText("boarding pass")).toBeDefined();
    expect(screen.getByText("password")).toBeDefined();
    expect(screen.queryByText("word 2")).toBeNull();

    // Click audio speech button specifically on "boarding pass" card
    const boardingPassEl = screen.getByText("boarding pass");
    const cardEl = boardingPassEl.closest("div")!;
    const audioBtn = cardEl.querySelector("button")!;
    fireEvent.click(audioBtn);

    expect(speech.speak).toHaveBeenCalledWith("boarding pass");
  });

  it("moves word to Learned when clicking 'I know this' (CA06, CT06)", async () => {
    const mockWords: StudentWord[] = [
      {
        id: "luggage",
        term: "luggage",
        meaning: "bagagem",
        example: "My luggage is heavy.",
        sessionIds: ["sess-1"],
        firstAddedAt: "2026-10-04T10:00:00.000Z",
        lastAddedAt: "2026-10-04T12:00:00.000Z",
        learned: false,
      },
      {
        id: "ticket",
        term: "ticket",
        meaning: "passagem",
        sessionIds: ["sess-1"],
        firstAddedAt: "2026-10-04T10:00:00.000Z",
        lastAddedAt: "2026-10-04T11:00:00.000Z",
        learned: false,
      },
    ];

    vi.mocked(repository.getStudentVocabulary).mockResolvedValue(mockWords);
    vi.mocked(repository.setWordLearned).mockResolvedValue();

    render(<StudentVocabularyTab studentId="ana-123" />);

    await waitFor(() => {
      expect(screen.getByText("luggage")).toBeDefined();
    });

    // Click "I know this" on the first card
    const markButtons = screen.getAllByText("I know this");
    fireEvent.click(markButtons[0]!);

    expect(repository.setWordLearned).toHaveBeenCalledWith("ana-123", "luggage", true);

    // Filter by "Learned" tab
    const learnedTab = screen.getByRole("button", { name: /learned \(/i });
    fireEvent.click(learnedTab);

    // Now luggage is shown in learned tab
    expect(screen.getByText("luggage")).toBeDefined();
    expect(screen.queryByText("ticket")).toBeNull();
  });

  it("practice button: disabled with 0 words; opens session with 20 cards when 25 available (CA07, CT07)", async () => {
    // 1. Test 0 words scenario: button is disabled with "Add words in class to practice"
    vi.mocked(repository.getStudentVocabulary).mockResolvedValue([]);
    const { unmount } = render(<StudentVocabularyTab studentId="ana-123" />);

    await waitFor(() => {
      const emptyBtn = screen.getByTitle("Add words in class to practice");
      expect(emptyBtn).toBeDefined();
      expect(emptyBtn.hasAttribute("disabled")).toBe(true);
    });

    unmount();

    // 2. Test 25 unlearned words scenario: opens practice with 20 cards
    const twentyFiveWords: StudentWord[] = Array.from({ length: 25 }, (_, i) => ({
      id: `word-${i}`,
      term: `Vocabulary ${i + 1}`,
      meaning: `Meaning ${i + 1}`,
      example: `Example ${i + 1}`,
      sessionIds: [],
      firstAddedAt: new Date().toISOString(),
      lastAddedAt: new Date().toISOString(),
      learned: false,
    }));

    vi.mocked(repository.getStudentVocabulary).mockResolvedValue(twentyFiveWords);
    render(<StudentVocabularyTab studentId="ana-123" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /practice \(20\)/i })).toBeDefined();
    });

    // Click Practice
    fireEvent.click(screen.getByRole("button", { name: /practice \(20\)/i }));

    // Flashcard modal is open with "Card 1 of 20"
    expect(screen.getByText("Card 1 of 20")).toBeDefined();
    const vocab1Elements = screen.getAllByText("Vocabulary 1");
    expect(vocab1Elements.length).toBeGreaterThanOrEqual(1);

    // Flip to see meaning
    fireEvent.click(screen.getByText(/click to reveal meaning/i));
    expect(screen.getAllByText("Meaning 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("“Example 1”").length).toBeGreaterThanOrEqual(1);

    // Click "I know this!"
    const knewButton = screen.getByRole("button", { name: /i know this!/i });
    fireEvent.click(knewButton);

    // Moves to Card 2 of 20
    await waitFor(() => {
      expect(screen.getByText("Card 2 of 20")).toBeDefined();
      expect(screen.getAllByText("Vocabulary 2").length).toBeGreaterThanOrEqual(1);
    });
  });
});
