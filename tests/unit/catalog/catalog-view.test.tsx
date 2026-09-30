import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogView } from "@/components/catalog/catalog-view";
import type { CatalogIndex } from "@/lib/catalog/schema";

const fetchMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("@/lib/catalog/fetch", () => ({ fetchCatalogIndexOnce: () => fetchMock.fn() }));

const empty: CatalogIndex = { schemaVersion: 1, updatedAt: "1970-01-01T00:00:00.000Z", items: [] };
const withOne: CatalogIndex = {
  schemaVersion: 1,
  updatedAt: "2026-09-30T00:00:00.000Z",
  items: [
    {
      id: "1",
      slug: "some-or-any",
      title: "Some or Any",
      description: "",
      category: "grammar",
      type: "quiz",
      levelMin: "beginner",
      levelMax: "intermediate",
      tags: [],
      thumbnail: { src: "/images/missing.webp", alt: "A kitchen table" },
      featured: false,
      createdAt: "2026-09-29T00:00:00.000Z",
    },
  ],
};

describe("CatalogView", () => {
  beforeEach(() => {
    fetchMock.fn.mockReset();
  });

  it("shows skeletons while an empty build catalog is refreshed", () => {
    fetchMock.fn.mockReturnValue(new Promise(() => {}));
    render(<CatalogView initial={empty} imagePaths={[]} />);

    expect(screen.getByRole("status", { name: "Loading activities" })).toBeInTheDocument();
  });

  it("shows the refreshed activities and count", async () => {
    fetchMock.fn.mockResolvedValue(withOne);
    render(<CatalogView initial={empty} imagePaths={[]} />);

    expect(await screen.findByText("1 Interactive Activity for ESL Teachers")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Some or Any" })[0]).toHaveAttribute(
      "href",
      "/play/some-or-any",
    );
    // The image isn't in public/, so the category placeholder is used.
    expect(screen.getAllByRole("img", { name: "A kitchen table" })[0].tagName).toBe("DIV");
  });

  it("renders the build catalog immediately and says when there's nothing", async () => {
    fetchMock.fn.mockResolvedValue(empty);
    render(<CatalogView initial={empty} imagePaths={[]} />);

    expect(await screen.findByText("No activities yet. Check back soon!")).toBeInTheDocument();
  });

  it("keeps the build catalog if the refresh fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.fn.mockRejectedValue(new Error("offline"));
    render(<CatalogView initial={withOne} imagePaths={["/images/missing.webp"]} />);

    await waitFor(() => expect(console.warn).toHaveBeenCalled());
    expect(screen.getAllByRole("img", { name: "A kitchen table" })[0].tagName).toBe("IMG");
  });
});
