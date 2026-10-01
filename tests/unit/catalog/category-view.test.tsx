import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryView } from "@/components/catalog/category-view";
import { getCategory } from "@/lib/activities/categories";
import type { CatalogIndex } from "@/lib/catalog/schema";
import { catalogItem } from "./factory";

const fetchMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("@/lib/catalog/fetch", () => ({ fetchCatalogIndexOnce: () => fetchMock.fn() }));

const index: CatalogIndex = {
  schemaVersion: 1,
  updatedAt: "2026-09-30T00:00:00.000Z",
  items: [
    catalogItem({
      slug: "talk-1",
      title: "Talk 1",
      category: "speaking",
      createdAt: "2026-09-01T00:00:00.000Z",
    }),
    catalogItem({
      slug: "talk-2",
      title: "Talk 2",
      category: "speaking",
      createdAt: "2026-09-02T00:00:00.000Z",
    }),
    catalogItem({ slug: "grammar-1", title: "Grammar 1", category: "grammar" }),
  ],
};

describe("CategoryView", () => {
  beforeEach(() => {
    fetchMock.fn.mockReset();
    fetchMock.fn.mockResolvedValue(index);
    window.history.replaceState(null, "", "/activities/speaking");
  });

  it("shows the category header, its count and only its activities", async () => {
    render(<CategoryView initial={index} imagePaths={[]} category={getCategory("speaking")!} />);

    expect(screen.getByRole("heading", { level: 1, name: "Speaking" })).toBeInTheDocument();
    expect(screen.getByText(/Conversation practice · 2 activities/)).toBeInTheDocument();
    const titles = within(screen.getByRole("region", { name: "Search results" })).getAllByRole(
      "heading",
      { level: 3 },
    );
    expect(titles.map((t) => t.textContent)).toEqual(["Talk 2", "Talk 1"]);
    // The category is fixed: no category filter.
    expect(screen.queryByLabelText("Category")).toBeNull();
    expect(screen.getByLabelText("Level")).toBeInTheDocument();
  });

  it("lists every category, newest first, for What's New", () => {
    render(<CategoryView initial={index} imagePaths={[]} category={null} />);

    expect(screen.getByRole("heading", { level: 1, name: "What's New" })).toBeInTheDocument();
    expect(screen.getByText("All activities, newest first · 3 activities")).toBeInTheDocument();
  });

  it("says when a category has nothing yet", async () => {
    render(<CategoryView initial={index} imagePaths={[]} category={getCategory("writing")!} />);

    expect(await screen.findByText("No activities in this category yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse all activities" })).toHaveAttribute(
      "href",
      "/activities",
    );
  });
});
