import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityMedia } from "@/components/player/media/activity-media";

describe("ActivityMedia", () => {
  it("shows emoji large, as a labelled picture", () => {
    render(
      <ActivityMedia media={{ kind: "emoji", text: "🐱 👜", label: "Emoji picture: 🐱 👜" }} />,
    );
    expect(screen.getByRole("img", { name: "Emoji picture: 🐱 👜" })).toHaveTextContent("🐱 👜");
  });
});
