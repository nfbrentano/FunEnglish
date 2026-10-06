import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhiteboardPageView } from "@/components/board/whiteboard-page-view";
import { SiteHeader } from "@/components/layout/site-header";
import { useAuth } from "@/lib/auth/use-auth";

vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/live/live-context", () => ({
  useLiveRoom: vi.fn(() => ({
    isLiveActive: false,
    liveRoom: null,
    roomCode: null,
    isModalOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    startRoom: vi.fn(),
    endRoom: vi.fn(),
    isWhiteboardOpen: false,
    toggleWhiteboard: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

describe("Whiteboard Shortcut and Page (SDD/2026-10-06_atalho-lousa.md)", () => {
  it("CT01 / CA01, CA04: renders WhiteboardPageView with header, dashboard link and board tools", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "teacher-123", email: "teacher@test.com", role: "teacher", displayName: "Teacher", photoURL: null },
      loading: false,
      signOut: vi.fn(),
    });

    render(<WhiteboardPageView />);

    // Title and subtitle
    expect(screen.getByRole("heading", { name: "Lousa Digital" })).toBeInTheDocument();
    expect(screen.getByText(/Quadro livre para anotações/i)).toBeInTheDocument();

    // Link back to Dashboard
    const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    // Live Room trigger button
    expect(screen.getByRole("button", { name: /Conectar com Alunos/i })).toBeInTheDocument();

    // Full board tools are rendered
    expect(screen.getByRole("button", { name: "Pen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Highlighter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eraser" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Text" })).toBeInTheDocument();
  });

  it("CT02 / CA02: renders Lousa link in SiteHeader when teacher is authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "teacher-123", email: "teacher@test.com", role: "teacher", displayName: "Teacher", photoURL: null },
      loading: false,
      signOut: vi.fn(),
    });

    render(<SiteHeader />);

    const lousaLink = screen.getByRole("link", { name: "Lousa" });
    expect(lousaLink).toBeInTheDocument();
    expect(lousaLink).toHaveAttribute("href", "/lousa");
  });

  it("does not render Lousa link in SiteHeader when user is anonymous or student", () => {
    // Anonymous
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    });

    const { rerender } = render(<SiteHeader />);
    expect(screen.queryByRole("link", { name: "Lousa" })).not.toBeInTheDocument();

    // Student
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "student-123", email: "student@test.com", role: "student", displayName: "Student", photoURL: null },
      loading: false,
      signOut: vi.fn(),
    });

    rerender(<SiteHeader />);
    expect(screen.queryByRole("link", { name: "Lousa" })).not.toBeInTheDocument();
  });
});
