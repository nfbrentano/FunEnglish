import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JoinView } from "@/components/portal/join-view";
import { ToastProvider } from "@/components/ui/toast";
import type { AuthUser } from "@/lib/auth/use-auth";
import * as authActions from "@/lib/auth/actions";
import * as functions from "@/lib/functions";

let mockSearchParams = "CODE1234";
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (param: string) => (param === "code" ? mockSearchParams : null),
  }),
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

const mockUser: AuthUser = {
  uid: "student-uid-1",
  displayName: "Ana Silva",
  email: "ana@test.com",
  photoURL: null,
};

let currentAuthUser: AuthUser | null = null;
vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: () => ({ user: currentAuthUser, loading: false }),
}));

describe("JoinView (spec 03: RF02, CA02, CA10, CT02, CT09)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSearchParams = "CODE1234";
    currentAuthUser = null;
  });

  it("shows invalid/expired message when code is invalid or missing (CA10, CT09)", async () => {
    mockSearchParams = "BADCODE";
    vi.spyOn(functions, "callValidateInvite").mockResolvedValue({
      valid: false,
      error: "This invite is invalid or has expired. Ask your teacher for a new one.",
    });

    render(
      <ToastProvider>
        <JoinView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/This invite is invalid or has expired/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /Practice activities/i })).toBeInTheDocument();
  });

  it("shows greeting and allows redeeming when already signed in (CA02, CT02)", async () => {
    currentAuthUser = mockUser;
    vi.spyOn(functions, "callValidateInvite").mockResolvedValue({
      valid: true,
      studentName: "Ana",
      teacherName: "Mr. Smith",
    });
    const redeemSpy = vi
      .spyOn(functions, "callRedeemInvite")
      .mockResolvedValue({ success: true, studentId: "s1" });

    render(
      <ToastProvider>
        <JoinView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Hi Ana!/i)).toBeInTheDocument();
    });

    const redeemBtn = screen.getByRole("button", {
      name: /Connect to student portal/i,
    });
    expect(redeemBtn).toBeInTheDocument();

    await userEvent.click(redeemBtn);

    expect(redeemSpy).toHaveBeenCalledWith("CODE1234");
  });

  it("allows signing up and redeems invite (CA02, CT02)", async () => {
    currentAuthUser = null;
    vi.spyOn(functions, "callValidateInvite").mockResolvedValue({
      valid: true,
      studentName: "Ana Silva",
      teacherName: "Prof. John",
    });
    const signUpSpy = vi
      .spyOn(authActions, "signUpWithEmail")
      .mockResolvedValue({ uid: "new-user-1" } as unknown as Awaited<
        ReturnType<typeof authActions.signUpWithEmail>
      >);
    const redeemSpy = vi
      .spyOn(functions, "callRedeemInvite")
      .mockResolvedValue({ success: true, studentId: "s1" });

    render(
      <ToastProvider>
        <JoinView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Hi Ana Silva!/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole("button", { name: /Create account & join/i });

    await userEvent.type(emailInput, "ana@example.com");
    await userEvent.type(passwordInput, "password123");
    await userEvent.click(submitBtn);

    expect(signUpSpy).toHaveBeenCalledWith("Ana Silva", "ana@example.com", "password123");
    expect(redeemSpy).toHaveBeenCalledWith("CODE1234");
  });
});
