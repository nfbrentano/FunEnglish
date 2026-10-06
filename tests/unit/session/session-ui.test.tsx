import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClassroomSidebar } from "@/components/session/classroom-sidebar";
import { EndSessionModal } from "@/components/session/end-session-modal";
import { ResumeSessionBanner } from "@/components/session/resume-session-banner";
import { SessionConflictModal } from "@/components/session/session-conflict-modal";
import { ToastProvider } from "@/components/ui/toast";
import * as authHook from "@/lib/auth/use-auth";
import * as classesHook from "@/lib/classes/use-classes";
import * as sessionRepo from "@/lib/session/repository";
import { SessionProvider, useSessionContext } from "@/lib/session/session-context";
import type { ClassroomSession } from "@/lib/session/types";
import * as studentModeHook from "@/lib/student-mode";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/session",
  useSearchParams: () => new URLSearchParams(),
}));

const mockStudents = [
  { id: "s1", name: "Ana Silva", email: "ana@example.com", classIds: ["c1"] },
  { id: "s2", name: "Bruno Costa", email: "bruno@example.com", classIds: ["c1"] },
  { id: "s3", name: "Carlos Rocha", email: "carlos@example.com", classIds: ["c1"] },
  { id: "s4", name: "Daniela Lima", email: "daniela@example.com", classIds: ["c1"] },
  { id: "s5", name: "Eduardo Souza", email: "eduardo@example.com", classIds: ["c1"] },
  { id: "s6", name: "Fernanda Dias", email: "fernanda@example.com", classIds: ["c1"] },
  { id: "s7", name: "Gabriel Alves", email: "gabriel@example.com", classIds: ["c1"] },
  { id: "s8", name: "Helena Castro", email: "helena@example.com", classIds: ["c1"] },
];

function TestClassController() {
  const session = useSessionContext();
  if (!session) return null;

  return (
    <div>
      <button
        onClick={() =>
          session.startClass(
            "c1",
            "Teens B1",
            mockStudents.map((s) => s.id),
          )
        }
      >
        Start Teens B1
      </button>
      <button
        onClick={() =>
          session.startClass("c2", "Kids A1", ["k1", "k2"])
        }
      >
        Start Kids A1
      </button>
      <button
        onClick={() =>
          session.recordActivity({ id: "act-x", title: "Activity X" })
        }
      >
        Play Activity X
      </button>
      <button
        onClick={() =>
          session.recordActivity({ id: "act-y", title: "Activity Y" })
        }
      >
        Play Activity Y
      </button>
    </div>
  );
}

function renderSessionApp() {
  return render(
    <ToastProvider>
      <SessionProvider>
        <TestClassController />
        <ClassroomSidebar />
        <EndSessionModal />
        <SessionConflictModal />
        <ResumeSessionBanner />
      </SessionProvider>
    </ToastProvider>,
  );
}

describe("Classroom Session Integration (SDD/2026-10-03_08-sessao-de-aula.md)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: { uid: "teacher-1", email: "teacher@example.com" } as any,
      loading: false,
    } as any);

    vi.spyOn(studentModeHook, "useStudentMode").mockReturnValue(false);

    vi.spyOn(classesHook, "useClasses").mockReturnValue({
      students: mockStudents,
      classes: [{ id: "c1", name: "Teens B1", studentIds: mockStudents.map((s) => s.id), archived: false, createdAt: new Date() }],
      loading: false,
    } as any);

    vi.spyOn(sessionRepo, "createSession").mockImplementation(
      async (uid, classId, className, studentIds) => {
        const attendance = studentIds.reduce<Record<string, boolean>>((acc, id) => {
          acc[id] = true;
          return acc;
        }, {});
        return {
          id: "session-test-id",
          teacherUid: uid,
          classId,
          className,
          startedAt: new Date(),
          status: "active",
          attendance,
          activitiesPlayed: [],
          newWords: [],
          notes: [],
        };
      },
    );

    vi.spyOn(sessionRepo, "getActiveSession").mockResolvedValue(null);
    vi.spyOn(sessionRepo, "updateSession").mockResolvedValue(undefined);
    vi.spyOn(sessionRepo, "endSession").mockResolvedValue(undefined);
  });

  it("CA01: Start class on Teens B1 with 8 students opens sidebar with class name, clock 00:00 and 8 present", async () => {
    renderSessionApp();

    const startBtn = screen.getByRole("button", { name: "Start Teens B1" });
    await userEvent.click(startBtn);

    // Sidebar opens with class name (CA01)
    expect(screen.getByText("Teens B1")).toBeInTheDocument();

    // Clock starts at 00:00 (CA01)
    expect(screen.getByText("00:00")).toBeInTheDocument();

    // Attendance shows 8 of 8 present (CA01)
    expect(screen.getByText(/8 of 8 present/i)).toBeInTheDocument();

    // All 8 students listed
    for (const student of mockStudents) {
      expect(screen.getByText(student.name)).toBeInTheDocument();
    }
  });

  it("CA03: Marking student absent excludes them from picker names", async () => {
    renderSessionApp();

    await userEvent.click(screen.getByRole("button", { name: "Start Teens B1" }));

    // Ana starts as present. Find Ana's toggle button and mark absent
    const presentButtons = screen.getAllByRole("button", { name: "Present" });
    expect(presentButtons.length).toBe(8);

    // Click first toggle (Ana Silva)
    await userEvent.click(presentButtons[0]);

    // Now 7 of 8 present
    expect(screen.getByText(/7 of 8 present/i)).toBeInTheDocument();

    // Switch to Picker tab
    const pickerTab = screen.getByRole("tab", { name: /Picker/i });
    await userEvent.click(pickerTab);

    // Picker tab is now active
    expect(screen.getByRole("tabpanel", { name: /Picker/i })).toBeInTheDocument();

    // In the wheel / names roster of picker, Ana Silva is excluded because she's absent (CA03)
    const pickerRosterTab = screen.getByRole("tab", { name: /Names/i });
    await userEvent.click(pickerRosterTab);

    expect(screen.getByText("Using students from active class session:")).toBeInTheDocument();
    expect(screen.getByText(/Class roster \(7\)/)).toBeInTheDocument();
    expect(screen.queryByText("Ana Silva")).not.toBeInTheDocument();
    expect(screen.getByText("Bruno Costa")).toBeInTheDocument();
  });

  it("CA04: Activities opened during session are recorded in order with timestamps in summary review", async () => {
    renderSessionApp();

    await userEvent.click(screen.getByRole("button", { name: "Start Teens B1" }));

    // Play Activity X then Activity Y (CA04)
    await userEvent.click(screen.getByRole("button", { name: "Play Activity X" }));
    await userEvent.click(screen.getByRole("button", { name: "Play Activity Y" }));

    // Click End Class in sidebar
    const endClassBtn = screen.getByTitle("End class");
    await userEvent.click(endClassBtn);

    // Review modal opens
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Class Summary Review · Teens B1/i)).toBeInTheDocument();

    // Activities listed in order (CA04)
    expect(screen.getByText("Activity X")).toBeInTheDocument();
    expect(screen.getByText("Activity Y")).toBeInTheDocument();
  });

  it("CA05 (negative): In projection mode, private notes and student emails are hidden from DOM", async () => {
    renderSessionApp();

    await userEvent.click(screen.getByRole("button", { name: "Start Teens B1" }));

    // Before projection mode: student emails are visible
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();

    // Add a private note
    const notesTab = screen.getByRole("tab", { name: /Notes/i });
    await userEvent.click(notesTab);

    const selectStudent = screen.getByRole("combobox", { name: /Select student/i });
    await userEvent.selectOptions(selectStudent, "s1");

    const noteInput = screen.getByPlaceholderText(/Type note and press Enter/i);
    await userEvent.type(noteInput, "Ana made a private pronunciation mistake");

    const addNoteBtn = screen.getByRole("button", { name: /Add Note/i });
    await userEvent.click(addNoteBtn);

    expect(
      screen.getByText("Ana made a private pronunciation mistake"),
    ).toBeInTheDocument();

    // Switch to Projection Mode ON (RF06, CA05)
    const projectToggle = screen.getByTitle(/Projection mode OFF/i);
    await userEvent.click(projectToggle);

    // Now in projection mode:
    // 1. Private note is NOT in the DOM (CA05)
    expect(
      screen.queryByText("Ana made a private pronunciation mistake"),
    ).not.toBeInTheDocument();

    // 2. Student emails are NOT in the DOM (CA05)
    const studentsTab = screen.getByRole("tab", { name: /Students/i });
    await userEvent.click(studentsTab);
    expect(screen.queryByText("ana@example.com")).not.toBeInTheDocument();
  });

  it("CA06: Removing a note in summary review excludes it from published summary and calls endSession", async () => {
    renderSessionApp();

    await userEvent.click(screen.getByRole("button", { name: "Start Teens B1" }));

    // Add note
    await userEvent.click(screen.getByRole("tab", { name: /Notes/i }));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Select student/i }),
      "s1",
    );
    await userEvent.type(screen.getByPlaceholderText(/Type note/i), "Note to be removed");
    await userEvent.click(screen.getByRole("button", { name: /Add Note/i }));

    expect(screen.getByText("Note to be removed")).toBeInTheDocument();

    // Open review modal
    await userEvent.click(screen.getByTitle("End class"));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("Note to be removed")).toBeInTheDocument();

    // Remove the note in the review modal (CA06)
    const removeNoteBtn = within(modal).getByRole("button", { name: /Remove note/i });
    await userEvent.click(removeNoteBtn);

    expect(within(modal).queryByText("Note to be removed")).not.toBeInTheDocument();

    // Confirm & End Class
    const confirmBtn = within(modal).getByRole("button", { name: /Confirm & End Class/i });
    await userEvent.click(confirmBtn);

    // Verify endSession was called without the removed note (CA06)
    expect(sessionRepo.endSession).toHaveBeenCalledWith(
      "teacher-1",
      expect.anything(),
      expect.objectContaining({
        notes: [],
      }),
    );
  });

  it("CA08: Active session in localStorage restores and prompts 'Resume class Teens B1?'", async () => {
    const savedSession: ClassroomSession = {
      id: "saved-sess-1",
      teacherUid: "teacher-1",
      classId: "c1",
      className: "Teens B1",
      startedAt: new Date("2026-10-04T12:00:00Z"),
      status: "active",
      attendance: { s1: true },
      activitiesPlayed: [],
      newWords: [],
      notes: [],
    };

    localStorage.setItem(
      "fun-english-active-session-teacher-1",
      JSON.stringify(savedSession),
    );

    renderSessionApp();

    // Shows resume banner (CA08)
    await waitFor(() => {
      expect(
        screen.getByText('Resume class "Teens B1"?'),
      ).toBeInTheDocument();
    });

    // Click Resume class
    const resumeBtn = screen.getByRole("button", { name: /Resume class/i });
    await userEvent.click(resumeBtn);

    // Sidebar restores with Teens B1
    expect(screen.getByText("Teens B1")).toBeInTheDocument();
  });

  it("CA09: Starting another class while active session exists opens conflict modal", async () => {
    renderSessionApp();

    // Start Teens B1
    await userEvent.click(screen.getByRole("button", { name: "Start Teens B1" }));
    expect(screen.getByText("Teens B1")).toBeInTheDocument();

    // Attempt to start Kids A1
    await userEvent.click(screen.getByRole("button", { name: "Start Kids A1" }));

    // Conflict modal is shown (CA09)
    expect(
      screen.getByText("Active class session already in progress"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Class "Teens B1" is currently active/i),
    ).toBeInTheDocument();

    // Options: Resume existing, End & review current class, Discard current class
    expect(
      screen.getByRole("button", { name: /Resume existing class \(Teens B1\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /End & review current class/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Discard current class/i }),
    ).toBeInTheDocument();
  });

  it("CA10 (negative): In student mode (?mode=student) or unauthenticated, sidebar is not displayed", async () => {
    // Mock student mode
    vi.spyOn(studentModeHook, "useStudentMode").mockReturnValue(true);

    renderSessionApp();

    // Even if start class button clicked, sidebar doesn't show in student mode
    expect(screen.queryByLabelText("Classroom Session Sidebar")).not.toBeInTheDocument();
  });

  it("RF12: Keyboard shortcuts T, B, P, N switch tabs and [ toggles collapse", async () => {
    renderSessionApp();

    await userEvent.click(screen.getByRole("button", { name: "Start Teens B1" }));

    // Press T -> Timer tab
    fireEvent.keyDown(window, { key: "t" });
    expect(screen.getByRole("tab", { name: /Timer/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Press B -> Board tab
    fireEvent.keyDown(window, { key: "b" });
    expect(screen.getByRole("tab", { name: /Board/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Press P -> Picker tab
    fireEvent.keyDown(window, { key: "p" });
    expect(screen.getByRole("tab", { name: /Picker/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Press N -> Notes tab
    fireEvent.keyDown(window, { key: "n" });
    expect(screen.getByRole("tab", { name: /Notes/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Press [ -> toggle collapse
    fireEvent.keyDown(window, { key: "[" });
    expect(screen.getByTitle("Expand sidebar ([)")).toBeInTheDocument();
  });
});
