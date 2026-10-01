import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ActivityPlayer } from "@/components/player/activity-player";
import type { PlayableActivity } from "@/lib/player/load-activity";
import { definePlugin, type PluginProps } from "@/lib/player/types";

// A minimal activity type that is not part of the app: the shell must run it unchanged (CA02).
const demoSchema = z.object({ steps: z.number().int().positive() });

function DemoPlayer({
  content,
  settings,
  onProgress,
  onScore,
  onComplete,
}: PluginProps<z.infer<typeof demoSchema>>) {
  return (
    <div>
      <p>Demo with {settings.teams} team(s)</p>
      <button onClick={() => onProgress({ current: 3, total: content.steps, activeTeam: 1 })}>
        advance
      </button>
      <button onClick={() => onScore(2, settings.teams > 1 ? 1 : 0)}>score</button>
      <button
        onClick={() =>
          onComplete({ correct: 8, total: 10, review: [{ prompt: "Q7", answer: "has" }] })
        }
      >
        finish
      </button>
    </div>
  );
}

function Crashing(): never {
  throw new Error("boom");
}

const demo = definePlugin({
  label: "Demo",
  instructions: "Do the demo.",
  schema: demoSchema,
  supports: { scoring: true, teams: true, timer: false, shuffle: false },
  Component: DemoPlayer,
});
const plugins = { demo, crash: { ...demo, Component: Crashing } };

function activity(overrides: Partial<PlayableActivity> = {}): PlayableActivity {
  return {
    id: "1",
    slug: "demo-activity",
    title: "Demo Activity",
    description: "A demo.",
    category: "grammar",
    levelMin: "beginner",
    levelMax: "intermediate",
    tags: [],
    thumbnail: { src: "/x.webp", alt: "x", source: "ai" },
    status: "published",
    featured: false,
    schemaVersion: 1,
    type: "demo",
    content: { steps: 10 },
    ...overrides,
  } as unknown as PlayableActivity;
}

const start = () => userEvent.click(screen.getByRole("button", { name: "Start" }));

afterEach(() => {
  delete document.documentElement.dataset.mode;
});

describe("ActivityPlayer", () => {
  it("introduces the activity and starts it", async () => {
    render(<ActivityPlayer activity={activity()} plugins={plugins} />);

    expect(screen.getByRole("heading", { level: 1, name: "Demo Activity" })).toBeInTheDocument();
    expect(screen.getByText("Grammar")).toBeInTheDocument();
    expect(screen.getByText("Beg–Inter")).toBeInTheDocument();
    expect(screen.getByText("Do the demo.")).toBeInTheDocument();

    await start();
    expect(screen.getByText("Demo with 1 team(s)")).toBeInTheDocument();
  });

  it("shows progress and score reported by the activity", async () => {
    render(<ActivityPlayer activity={activity()} plugins={plugins} />);
    await start();

    await userEvent.click(screen.getByRole("button", { name: "advance" }));
    await userEvent.click(screen.getByRole("button", { name: "score" }));

    expect(screen.getByText("3 / 10")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    expect(within(screen.getByRole("list", { name: "Score" })).getByText("2")).toBeInTheDocument();
  });

  it("keeps one score per team", async () => {
    render(<ActivityPlayer activity={activity()} plugins={plugins} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "3");
    await start();
    await userEvent.click(screen.getByRole("button", { name: "advance" }));
    await userEvent.click(screen.getByRole("button", { name: "score" }));

    const teams = within(screen.getByRole("list", { name: "Score" })).getAllByRole("listitem");
    expect(teams.map((t) => t.textContent)).toEqual(["Team 1: 0", "Team 2: 2", "Team 3: 0"]);
    expect(teams[1]).toHaveAttribute("aria-current", "true");
  });

  it("shows the results and plays again from the start", async () => {
    render(<ActivityPlayer activity={activity()} plugins={plugins} />);
    await start();
    await userEvent.click(screen.getByRole("button", { name: "score" }));
    await userEvent.click(screen.getByRole("button", { name: "finish" }));

    expect(screen.getByRole("heading", { name: "Results" })).toBeInTheDocument();
    expect(screen.getByText("8 / 10 correct")).toBeInTheDocument();
    expect(screen.getByText("Q7")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to activities" })).toHaveAttribute(
      "href",
      "/activities",
    );

    await userEvent.click(screen.getByRole("button", { name: "Play again" }));
    expect(within(screen.getByRole("list", { name: "Score" })).getByText("0")).toBeInTheDocument();
  });

  it("explains, instead of crashing, when the content is invalid", () => {
    render(
      <ActivityPlayer
        activity={activity({ content: { steps: "ten" } } as never)}
        plugins={plugins}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("This activity couldn't be loaded");
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  it("contains a crash inside the activity", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ActivityPlayer activity={activity({ type: "crash" } as never)} plugins={plugins} />);
    await start();

    expect(screen.getByRole("alert")).toHaveTextContent("This activity couldn't be loaded");
  });

  it("says when a type can't be played yet", () => {
    render(
      <ActivityPlayer activity={activity({ type: "flashcards" } as never)} plugins={plugins} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("This type of activity is coming soon");
  });

  it("toggles fullscreen", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    HTMLElement.prototype.requestFullscreen = requestFullscreen;
    render(<ActivityPlayer activity={activity()} plugins={plugins} />);
    await start();

    await userEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it("student mode hides favorites, sharing and exit", async () => {
    document.documentElement.dataset.mode = "student";
    render(<ActivityPlayer activity={activity()} plugins={plugins} />);
    await start();

    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Exit" })).toBeNull();
    expect(screen.getByText("Made with Fun English")).toBeInTheDocument();
  });
});
