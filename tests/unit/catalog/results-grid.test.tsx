import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResultsGrid } from "@/components/catalog/results-grid";
import { catalogItem } from "./factory";

const props = { hasImage: () => false, isNew: () => false, onClear: vi.fn() };

describe("ResultsGrid", () => {
  it("shows 24 results and appends 24 more on Load more", async () => {
    const items = Array.from({ length: 30 }, (_, i) =>
      catalogItem({ slug: `a-${i}`, title: `Activity ${i}` }),
    );
    render(<ResultsGrid items={items} {...props} />);

    expect(screen.getAllByRole("article")).toHaveLength(24);
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(screen.getAllByRole("article")).toHaveLength(30);
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("offers to clear the filters when nothing matches", async () => {
    render(<ResultsGrid items={[]} {...props} />);

    expect(screen.getByRole("heading", { name: "No activities found" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(props.onClear).toHaveBeenCalled();
  });
});
