import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClassesSection } from "@/components/dashboard/classes-section";
import { ToastProvider } from "@/components/ui/toast";
import type { Student, TeacherClass } from "@/lib/classes/types";
import type { useClasses } from "@/lib/classes/use-classes";

const mockClasses: TeacherClass[] = [
  {
    id: "c1",
    name: "Teens B1",
    studentIds: ["s1", "s2"],
    archived: false,
    createdAt: new Date(),
  },
  {
    id: "c2",
    name: "Kids A1",
    studentIds: [],
    archived: false,
    createdAt: new Date(),
  },
  {
    id: "c3",
    name: "Conversation Club 2025",
    studentIds: ["s1"],
    archived: true,
    createdAt: new Date(),
  },
];

const mockStudents: Student[] = [
  {
    id: "s1",
    teacherUid: "teacher-1",
    name: "Ana Silva",
    email: "ana@example.com",
    classIds: ["c1", "c3"],
    homeworkPin: "hash1",
    createdAt: new Date(),
  },
  {
    id: "s2",
    teacherUid: "teacher-1",
    name: "Lucas Costa",
    classIds: ["c1"],
    homeworkPin: "hash2",
    createdAt: new Date(),
  },
];

function createMockHook(overrides?: Partial<ReturnType<typeof useClasses>>): ReturnType<typeof useClasses> {
  return {
    classes: mockClasses,
    students: mockStudents,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addClass: vi.fn(),
    editClassName: vi.fn(),
    toggleArchiveClass: vi.fn(),
    removeClass: vi.fn(),
    addStudent: vi.fn(),
    addIndividualStudent: vi.fn(),
    addStudentsBatch: vi.fn(),
    copyStudent: vi.fn(),
    moveStudent: vi.fn(),
    removeFromClass: vi.fn(),
    editStudent: vi.fn(),
    deleteStudent: vi.fn(),
    regenPin: vi.fn(),
    ...overrides,
  };
}

describe("ClassesSection (RF01, RF02, RF06, CA01, CA05)", () => {
  it("renders active classes and student counts correctly (CA01)", () => {
    const hook = createMockHook();
    render(
      <ToastProvider>
        <ClassesSection classesHook={hook} />
      </ToastProvider>,
    );

    expect(screen.getByRole("heading", { name: /My classes/i })).toBeInTheDocument();
    expect(screen.getByText("Teens B1")).toBeInTheDocument();
    expect(screen.getByText("2 students")).toBeInTheDocument();
    expect(screen.getByText("Kids A1")).toBeInTheDocument();
    expect(screen.getByText("0 students")).toBeInTheDocument();

    // Archived class shouldn't be in the active tab
    expect(screen.queryByText("Conversation Club 2025")).not.toBeInTheDocument();
  });

  it("switches to Archived tab and displays archived classes (CA05)", async () => {
    const user = userEvent.setup();
    const hook = createMockHook();
    render(
      <ToastProvider>
        <ClassesSection classesHook={hook} />
      </ToastProvider>,
    );

    const archivedTabBtn = screen.getByRole("button", { name: /Archived/i });
    await user.click(archivedTabBtn);

    expect(screen.getByText("Conversation Club 2025")).toBeInTheDocument();
    expect(screen.queryByText("Teens B1")).not.toBeInTheDocument();
  });

  it("expands a class and displays enrolled student links (CA04)", async () => {
    const user = userEvent.setup();
    const hook = createMockHook();
    render(
      <ToastProvider>
        <ClassesSection classesHook={hook} />
      </ToastProvider>,
    );

    const classBtn = screen.getByRole("button", { name: "Teens B1" });
    await user.click(classBtn);

    // Students enrolled in c1: Ana Silva, Lucas Costa
    const anaLink = screen.getByRole("link", { name: "Ana Silva" });
    expect(anaLink).toBeInTheDocument();
    expect(anaLink).toHaveAttribute("href", "/dashboard/student?id=s1");

    const lucasLink = screen.getByRole("link", { name: "Lucas Costa" });
    expect(lucasLink).toBeInTheDocument();
    expect(lucasLink).toHaveAttribute("href", "/dashboard/student?id=s2");
  });

  it("calls addClass when creating a new class (CA01)", async () => {
    const user = userEvent.setup();
    const addClass = vi.fn().mockResolvedValue({
      id: "c-new",
      name: "Adults A2",
      studentIds: [],
      archived: false,
      createdAt: new Date(),
    });
    const hook = createMockHook({ addClass });

    render(
      <ToastProvider>
        <ClassesSection classesHook={hook} />
      </ToastProvider>,
    );

    const input = screen.getByPlaceholderText(/Class name/i);
    await user.type(input, "Adults A2");

    const createBtn = screen.getByRole("button", { name: /Create class/i });
    await user.click(createBtn);

    expect(addClass).toHaveBeenCalledWith("Adults A2");
  });
});
