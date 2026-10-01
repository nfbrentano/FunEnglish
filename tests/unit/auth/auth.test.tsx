import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RequireAuth } from "@/components/auth/require-auth";
import { authErrorMessage, isCancelled } from "@/lib/auth/errors";
import { loginHref, safeNext } from "@/lib/auth/redirect";

const auth = vi.hoisted(() => ({
  state: { user: null as null | { uid: string }, loading: false },
}));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: () => ({ ...auth.state, signOut: async () => {} }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/dashboard" }));

describe("safeNext", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/play/some-or-any?mode=student#q2", "/play/some-or-any?mode=student#q2"],
    ["https://evil.com", "/activities"],
    ["//evil.com/x", "/activities"],
    ["/\\evil.com", "/activities"],
    ["javascript:alert(1)", "/activities"],
    [null, "/activities"],
  ])("%s → %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it("builds the login link", () => {
    expect(loginHref("/dashboard?tab=lists")).toBe("/login?next=%2Fdashboard%3Ftab%3Dlists");
  });
});

describe("authErrorMessage", () => {
  it.each([
    ["auth/email-already-in-use", "This email is already registered. Log in instead?"],
    ["auth/invalid-credential", "Wrong email or password."],
    ["auth/weak-password", "Use at least 8 characters."],
    ["auth/too-many-requests", "Too many attempts. Please try again in a few minutes."],
    ["auth/something-new", "Something went wrong. Please try again."],
  ])("%s", (code, message) => {
    expect(authErrorMessage({ code })).toBe(message);
  });

  it("treats a closed Google window as a cancel, not an error", () => {
    expect(isCancelled({ code: "auth/popup-closed-by-user" })).toBe(true);
  });
});

describe("RequireAuth", () => {
  it("sends visitors to the login page and back", () => {
    auth.state = { user: null, loading: false };
    render(<RequireAuth>Secret</RequireAuth>);

    expect(screen.queryByText("Secret")).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/login?next=%2Fdashboard");
  });

  it("waits while the session loads", () => {
    router.replace.mockClear();
    auth.state = { user: null, loading: true };
    render(<RequireAuth>Secret</RequireAuth>);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows the page to teachers", () => {
    auth.state = { user: { uid: "1" }, loading: false };
    render(<RequireAuth>Secret</RequireAuth>);
    expect(screen.getByText("Secret")).toBeInTheDocument();
  });
});
