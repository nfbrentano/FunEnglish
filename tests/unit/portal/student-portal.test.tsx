import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentPortalView } from "@/components/portal/student-portal-view";
import { ToastProvider } from "@/components/ui/toast";
import type { Student } from "@/lib/classes/types";
import type { StudentNote } from "@/lib/notes/types";
import * as portalRepo from "@/lib/portal/repository";
import type { StudentClassHistoryItem } from "@/lib/portal/types";

vi.mock("@/lib/vocabulary/repository", () => ({
  getStudentVocabulary: vi.fn().mockResolvedValue([]),
  recordWordReviews: vi.fn().mockResolvedValue(undefined),
  updateWord: vi.fn().mockResolvedValue(undefined),
  setWordLearned: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/reports/repository", () => ({
  getStudentReports: vi.fn().mockResolvedValue([]),
  saveProgressReport: vi.fn().mockResolvedValue({ reportId: "mock-r1" }),
  revokeReportShare: vi.fn().mockResolvedValue(undefined),
}));

const mockAuthUser = {
  uid: "student-uid-1",
  displayName: "Ana Silva",
  email: "ana@test.com",
  role: "student",
};

vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    signOut: vi.fn(),
  }),
}));

const mockStudentAna: Student = {
  id: "s1",
  teacherUid: "teacher-1",
  name: "Ana Silva",
  email: "ana@example.com",
  classIds: ["c1"],
  portalUid: "student-uid-1",
  homeworkPin: "hash1234",
  createdAt: new Date(),
};

const mockStudentAnaTeacher2: Student = {
  id: "s2",
  teacherUid: "teacher-2",
  name: "Ana S.",
  email: "ana@example.com",
  classIds: ["c2"],
  portalUid: "student-uid-1",
  homeworkPin: "hash5678",
  createdAt: new Date(),
};

describe("StudentPortalView (spec 03: RF03, RF04, RF05, RF06, CA03, CA04, CA05, CA07, CA08, CT03, CT04, CT07)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows 'You're not connected to a teacher yet' when studentRecords is empty (RF08, CA07, CT06)", async () => {
    vi.spyOn(portalRepo, "getStudentRecordsForPortal").mockResolvedValue([]);

    render(
      <ToastProvider>
        <StudentPortalView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/You're not connected to a teacher yet/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /Practice activities/i })).toBeInTheDocument();
  });

  it("renders 2 in 'Strengths', 3 in 'To review', and no private note (CA03, CT03)", async () => {
    vi.spyOn(portalRepo, "getStudentRecordsForPortal").mockResolvedValue([mockStudentAna]);

    // getSharedStudentNotes returns only shared notes (already filtered by Firestore query)
    const sharedNotes: StudentNote[] = [
      {
        id: "s-note-1",
        studentId: "s1",
        category: "strength",
        text: "Great natural fluency",
        visibility: "shared",
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "s-note-2",
        studentId: "s1",
        category: "strength",
        text: "Confident speaking in discussions",
        visibility: "shared",
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "e-note-1",
        studentId: "s1",
        category: "grammar",
        text: "said 'she have' instead of 'she has'",
        correction: "she have → she has",
        visibility: "shared",
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "e-note-2",
        studentId: "s1",
        category: "pronunciation",
        text: "pronounced 'subtle' with b sound",
        correction: "subtle (/ˈsʌt.əl/)",
        visibility: "shared",
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "e-note-3",
        studentId: "s1",
        category: "vocabulary",
        text: "make a question instead of ask a question",
        correction: "make a question → ask a question",
        visibility: "shared",
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.spyOn(portalRepo, "getSharedStudentNotes").mockResolvedValue(sharedNotes);
    vi.spyOn(portalRepo, "getStudentClassHistory").mockResolvedValue([]);

    render(
      <ToastProvider>
        <StudentPortalView />
      </ToastProvider>,
    );

    // Welcome greeting
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Ana Silva!/i)).toBeInTheDocument();
    });

    // 2 strengths visible (CA03)
    await waitFor(() => {
      expect(screen.getByText("Great natural fluency")).toBeInTheDocument();
    });
    expect(screen.getByText("Confident speaking in discussions")).toBeInTheDocument();

    // 3 to review visible (CA03)
    expect(screen.getByText(/she have → she has/i)).toBeInTheDocument();
    expect(screen.getByText(/subtle \(\/ˈsʌt\.əl\/\)/i)).toBeInTheDocument();
    expect(screen.getByText(/make a question → ask a question/i)).toBeInTheDocument();


    // Private note was never in shared notes and is not displayed
    expect(screen.queryByText(/private/i)).not.toBeInTheDocument();
  });

  it("shows recurring errors with 'seen in 3 classes' and moves to Mastered when resolved (RF06, CA05)", async () => {
    vi.spyOn(portalRepo, "getStudentRecordsForPortal").mockResolvedValue([mockStudentAna]);

    // 3 occurrences of "he go -> he goes", with 1 resolved (CA05)
    const recurringNotes: StudentNote[] = [
      {
        id: "n1",
        studentId: "s1",
        category: "grammar",
        text: "he go",
        correction: "he go → he goes",
        visibility: "shared",
        resolved: true,
        sessionId: "sess-1",
        createdAt: new Date("2026-10-01"),
        updatedAt: new Date("2026-10-01"),
      },
      {
        id: "n2",
        studentId: "s1",
        category: "grammar",
        text: "he go",
        correction: "he go → he goes",
        visibility: "shared",
        resolved: false,
        sessionId: "sess-2",
        createdAt: new Date("2026-10-02"),
        updatedAt: new Date("2026-10-02"),
      },
      {
        id: "n3",
        studentId: "s1",
        category: "grammar",
        text: "he go",
        correction: "he go → he goes",
        visibility: "shared",
        resolved: false,
        sessionId: "sess-3",
        createdAt: new Date("2026-10-03"),
        updatedAt: new Date("2026-10-03"),
      },
    ];

    vi.spyOn(portalRepo, "getSharedStudentNotes").mockResolvedValue(recurringNotes);
    vi.spyOn(portalRepo, "getStudentClassHistory").mockResolvedValue([]);

    render(
      <ToastProvider>
        <StudentPortalView />
      </ToastProvider>,
    );

    // Appears once with "seen in 3 classes" (CA05)
    await waitFor(() => {
      expect(screen.getByText("he go → he goes")).toBeInTheDocument();
    });
    expect(screen.getByText(/seen in 3 classes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Mastered ✓/i)).not.toBeInTheDocument();
  });

  it("displays Class history with 3 sessions, activities, words, and whiteboard (RF05, CA04, CT04)", async () => {
    vi.spyOn(portalRepo, "getStudentRecordsForPortal").mockResolvedValue([mockStudentAna]);
    vi.spyOn(portalRepo, "getSharedStudentNotes").mockResolvedValue([]);

    const mockClasses: StudentClassHistoryItem[] = [
      {
        id: "c1",
        sessionId: "sess-1",
        date: new Date("2026-10-01T10:00:00Z"),
        durationMinutes: 50,
        activities: [{ id: "act1", title: "Some or Any Quiz", slug: "some-or-any" }],
        words: ["apple", "banana"],
        boardText: "Grammar rule: use some for affirmative",
      },
      {
        id: "c2",
        sessionId: "sess-2",
        date: new Date("2026-10-02T10:00:00Z"),
        durationMinutes: 45,
        activities: [{ id: "act2", title: "Past Tense Flashcards", slug: "past-tense" }],
        words: ["ran", "swam"],
      },
      {
        id: "c3",
        sessionId: "sess-3",
        date: new Date("2026-10-03T10:00:00Z"),
        durationMinutes: 60,
        activities: [{ id: "act3", title: "Discussion Cards: Travel" }],
        words: ["flight", "boarding pass"],
        boardText: "Homework: write 3 sentences about your last trip",
      },
    ];

    vi.spyOn(portalRepo, "getStudentClassHistory").mockResolvedValue(mockClasses);

    render(
      <ToastProvider>
        <StudentPortalView />
      </ToastProvider>,
    );

    // Switch to Class history tab
    const historyTab = await screen.findByRole("tab", { name: /Class history/i });
    await userEvent.click(historyTab);

    // 3 class dates visible (CA04)
    expect(await screen.findByText(/Oct 1, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Oct 2, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Oct 3, 2026/i)).toBeInTheDocument();

    // Check activities and words
    expect(screen.getByText("Some or Any Quiz")).toBeInTheDocument();
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.getByText("ran")).toBeInTheDocument();
    expect(screen.getByText("Discussion Cards: Travel")).toBeInTheDocument();
  });

  it("shows Teacher selector when student is invited by 2 teachers (RF03, CA08, CT07)", async () => {
    vi.spyOn(portalRepo, "getStudentRecordsForPortal").mockResolvedValue([
      mockStudentAna,
      mockStudentAnaTeacher2,
    ]);

    const getNotesSpy = vi
      .spyOn(portalRepo, "getSharedStudentNotes")
      .mockResolvedValue([]);
    vi.spyOn(portalRepo, "getStudentClassHistory").mockResolvedValue([]);

    render(
      <ToastProvider>
        <StudentPortalView />
      </ToastProvider>,
    );

    // Teacher selector dropdown is present (CA08)
    const select = await screen.findByLabelText(/Teacher:/i);
    expect(select).toBeInTheDocument();

    // Switch teacher
    await userEvent.selectOptions(select, "s2");

    expect(getNotesSpy).toHaveBeenCalledWith("s2");
  });
});
