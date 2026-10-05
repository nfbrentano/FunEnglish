import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SendHomeworkModal } from "@/components/homework/send-homework-modal";
import { SendHomeworkButton } from "@/components/homework/send-homework-button";
import * as authHook from "@/lib/auth/use-auth";
import * as classRepo from "@/lib/classes/repository";
import * as functionsClient from "@/lib/functions";
import { strings } from "@/lib/strings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("h=hw-123&s=token-ana"),
}));

describe("SendHomeworkModal (spec 10, RF01, CA01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: { uid: "teacher-1", displayName: "Teacher", email: "t@test.com", role: "teacher" },
      loading: false,
      signOut: vi.fn(),
    } as any);

    vi.spyOn(classRepo, "getTeacherClasses").mockResolvedValue([
      { id: "c1", name: "Teens B1", studentIds: ["s1", "s2"], archived: false, createdAt: new Date() },
    ]);
    vi.spyOn(classRepo, "getTeacherStudents").mockResolvedValue([
      { id: "s1", name: "Ana Silva", teacherUid: "teacher-1", classIds: ["c1"], homeworkPin: "h1", createdAt: new Date() },
      { id: "s2", name: "Bruno Souza", teacherUid: "teacher-1", classIds: ["c1"], homeworkPin: "h2", createdAt: new Date() },
    ]);
  });

  it("renders destination choices and generates homework link (CA01)", async () => {
    const mockCreate = vi.spyOn(functionsClient, "callCreateHomework").mockResolvedValue({
      homeworkId: "hw-test-12345678901",
      individualLinks: [
        { studentId: "s1", studentName: "Ana Silva", token: "tok-ana-12345" },
        { studentId: "s2", studentName: "Bruno Souza", token: "tok-bruno-12345" },
      ],
    });

    render(
      <SendHomeworkModal
        activity={{ id: "act-1", title: "At the airport" }}
        open={true}
        onClose={vi.fn()}
      />,
    );

    // Verify modal elements
    expect(screen.getByText(strings.homework.sendModalTitle)).toBeInTheDocument();
    expect(screen.getByText("At the airport")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Teens B1/)).toBeInTheDocument();
    });

    // Click generate button
    const submitBtn = screen.getByRole("button", { name: strings.homework.generateButton });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          activityId: "act-1",
          targetType: "class",
          classId: "c1",
        }),
      );
    });

    // Check link result view (CA01)
    await waitFor(() => {
      expect(screen.getByText(strings.homework.individualLinksTitle)).toBeInTheDocument();
      expect(screen.getByText("Ana Silva")).toBeInTheDocument();
      expect(screen.getByText("Bruno Souza")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: strings.homework.copyAll })).toBeInTheDocument();
    });
  });
});

describe("SendHomeworkButton", () => {
  it("opens modal when clicked by authenticated teacher", async () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: { uid: "teacher-1", role: "teacher" },
      loading: false,
    } as any);

    render(
      <SendHomeworkButton activity={{ id: "act-1", title: "Test Activity" }}>
        <span>Send</span>
      </SendHomeworkButton>,
    );

    const btn = screen.getByRole("button", { name: /Send/i });
    fireEvent.click(btn);

    expect(screen.getByText(strings.homework.sendModalTitle)).toBeInTheDocument();
  });
});

describe("HomeworkSection (spec 10, RF04, CA10, CA13)", () => {
  it("renders teacher homework section with filters and empty state", async () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: { uid: "teacher-1", role: "teacher" },
      loading: false,
    } as any);

    const homeworkRepo = await import("@/lib/homework/repository");
    vi.spyOn(homeworkRepo, "getTeacherHomeworkList").mockResolvedValue([
      {
        id: "hw-1",
        teacherUid: "teacher-1",
        activityId: "act-1",
        activitySlug: "animals-quiz",
        activityTitle: "Animals Quiz",
        activityType: "quiz",
        targetType: "class",
        classId: "c1",
        className: "Teens B1",
        classRoster: [
          { studentId: "s1", firstName: "Ana" },
          { studentId: "s2", firstName: "Bruno" },
        ],
        studentIds: ["s1", "s2"],
        instruction: "Do page 1",
        dueDate: null,
        allowLate: true,
        open: true,
        createdAt: new Date(),
      },
    ]);
    vi.spyOn(homeworkRepo, "getTeacherPinLockouts").mockResolvedValue([]);

    const { HomeworkSection } = await import("@/components/dashboard/homework-section");
    render(<HomeworkSection />);

    await waitFor(() => {
      expect(screen.getByText("Animals Quiz")).toBeInTheDocument();
      expect(screen.getByText("Teens B1")).toBeInTheDocument();
      expect(screen.getByText(/0\/2/)).toBeInTheDocument();
    });
  });
});

describe("StudentHomeworkSection (spec 10, RF05, CA11)", () => {
  it("renders student homework history table", async () => {
    const homeworkRepo = await import("@/lib/homework/repository");
    vi.spyOn(homeworkRepo, "getStudentHomeworkSubmissions").mockResolvedValue([
      {
        id: "sub-1",
        homeworkId: "hw-1",
        activityId: "act-1",
        activityTitle: "Animals Quiz",
        activityType: "quiz",
        correct: 8,
        total: 10,
        seconds: 65,
        late: false,
        completedAt: new Date("2026-10-04T12:00:00Z"),
      },
    ]);

    const { StudentHomeworkSection } = await import("@/components/dashboard/student-homework-section");
    render(<StudentHomeworkSection studentId="s1" />);

    await waitFor(() => {
      expect(screen.getByText("Animals Quiz")).toBeInTheDocument();
      expect(screen.getByText("8/10")).toBeInTheDocument();
    });
  });
});


