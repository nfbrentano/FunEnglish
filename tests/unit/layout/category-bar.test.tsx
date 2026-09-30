import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryBar } from "@/components/layout/category-bar";

vi.mock("next/navigation", () => ({ usePathname: () => "/activities/listening" }));

describe("CategoryBar", () => {
  it("links the 9 categories and highlights the current one", () => {
    render(<CategoryBar />);
    const links = within(screen.getByRole("navigation", { name: "Categories" })).getAllByRole(
      "link",
    );

    expect(links).toHaveLength(9);
    expect(links[0]).toHaveAttribute("href", "/activities/fun");
    const current = links.filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Listening"]);
  });
});
