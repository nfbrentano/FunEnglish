import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StudentProfileView } from "@/components/dashboard/student-profile-view";
import { ToastProvider } from "@/components/ui/toast";
import * as repository from "@/lib/classes/repository";
import * as sessionRepository from "@/lib/session/repository";
import type { Student, TeacherClass } from "@/lib/classes/types";

const mockUser = {
  uid: "teacher-1",
  displayName: "Teacher One",
  email: "teacher@example.com",
};

vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

let currentSearchParam = "s1";
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (param: string) => (param === "id" ? currentSearchParam : null),
  }),
}));

vi.mock("@/lib/notes/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notes/repository")>();
  return {
    ...actual,
    getStudentNotes: vi.fn().mockResolvedValue([]),
  };
});

const mockStudent: Student = {
  id: "s1",
  teacherUid: "teacher-1",
  name: "Ana Silva",
  email: "ana@example.com",
  classIds: ["c1"],
  homeworkPin: "hash1234",
  createdAt: new Date(),
};

const mockClasses: TeacherClass[] = [
  {
    id: "c1",
    name: "Teens B1",
    studentIds: ["s1"],
    archived: false,
    createdAt: new Date(),
  },
];

describe("StudentProfileView (RF05, CA04, CT04)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    currentSearchParam = "s1";
    vi.spyOn(repository, "getTeacherStudents").mockResolvedValue([mockStudent]);
    // Keep the load off the real Firestore: offline in CI it outlasts waitFor's timeout.
    vi.spyOn(repository, "getStudentPrivateProfile").mockResolvedValue(null);
    vi.spyOn(sessionRepository, "getPastSessions").mockResolvedValue([]);
  });

  it("renders student details and the 4 empty placeholder sections (CA04, CT04)", async () => {
    vi.spyOn(repository, "getStudent").mockResolvedValue(mockStudent);
    vi.spyOn(repository, "getTeacherClasses").mockResolvedValue(mockClasses);
    vi.spyOn(repository, "getTeacherStudents").mockResolvedValue([mockStudent]);

    render(
      <ToastProvider>
        <StudentProfileView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ana Silva" })).toBeInTheDocument();
    });

    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Teens B1")).toBeInTheDocument();

    // Check Homework PIN widget
    expect(screen.getByText(/Homework PIN/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate new PIN/i })).toBeInTheDocument();

    // Check all tabs exist
    expect(screen.getByRole("button", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lessons/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Notes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vocabulary/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Homework/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tracks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Billing/i })).toBeInTheDocument();

    // Check back to classes link
    const backLink = screen.getByRole("link", { name: /Back to classes/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/dashboard#classes");
  });

  it("shows not found message if student does not exist", async () => {
    vi.spyOn(repository, "getStudent").mockResolvedValue(null);
    vi.spyOn(repository, "getTeacherClasses").mockResolvedValue([]);

    render(
      <ToastProvider>
        <StudentProfileView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Student not found/i })).toBeInTheDocument();
    });
  });

  it("shows not found message if student belongs to another teacher (CA07)", async () => {
    vi.spyOn(repository, "getStudent").mockResolvedValue({
      ...mockStudent,
      teacherUid: "other-teacher",
    });
    vi.spyOn(repository, "getTeacherClasses").mockResolvedValue([]);

    render(
      <ToastProvider>
        <StudentProfileView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Student not found/i })).toBeInTheDocument();
    });
  });
});
