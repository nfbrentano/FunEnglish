import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LiveSentenceBuilder } from "@/components/live/live-sentence-builder";

describe("LiveSentenceBuilder (spec 15, RF07)", () => {
  it("sends the pieces in the order the student tapped them", async () => {
    const onSubmit = vi.fn();
    render(
      <LiveSentenceBuilder
        chunks={["coffee", "She", "like", "doesn't"]}
        punctuation="."
        disabled={false}
        onSubmit={onSubmit}
      />,
    );
    const submit = screen.getByRole("button", { name: "Submit Answer" });
    expect(submit).toBeDisabled();
    for (const piece of ["She", "doesn't", "like", "coffee"])
      await userEvent.click(screen.getByRole("button", { name: `Add “${piece}”` }));
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith("She doesn't like coffee");
  });
});
