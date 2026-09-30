import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountArea } from "@/components/layout/account-area";
import { SiteHeader } from "@/components/layout/site-header";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

describe("SiteHeader", () => {
  it("marks the current section and shows visitor actions", () => {
    navigation.pathname = "/activities/grammar";
    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Activities" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
  });
});

describe("AccountArea", () => {
  const user = { uid: "1", displayName: "Ana Silva", email: "ana@example.com", photoURL: null };

  it("shows an avatar menu with Dashboard and Log out for teachers", async () => {
    const onSignOut = vi.fn();
    render(<AccountArea user={user} onSignOut={onSignOut} />);

    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
    const button = screen.getByRole("button", { name: "Account menu" });
    expect(button).toHaveTextContent("AS");

    await userEvent.click(button);
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Log out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes the menu with Escape and returns focus to the avatar", async () => {
    render(<AccountArea user={user} onSignOut={() => {}} />);
    const button = screen.getByRole("button", { name: "Account menu" });

    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).toBeNull();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
