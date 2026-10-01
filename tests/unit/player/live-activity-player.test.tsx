import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveActivityPlayer } from "@/components/player/live-activity-player";
import type { PlayableActivity } from "@/lib/player/load-activity";
import { CONTENT_TEMPLATES } from "@/lib/admin/templates";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn<(slug: string) => Promise<unknown>>(),
  admin: false as boolean | null,
}));
vi.mock("@/lib/player/load-activity", () => ({ fetchPublishedActivity: mocks.fetch }));
vi.mock("@/lib/admin/use-is-admin", () => ({ useIsAdmin: () => mocks.admin }));
vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: async () => {} }),
}));

const built = {
  id: "act-1",
  slug: "simple-present",
  title: "Simple Present",
  description: "Practice.",
  category: "grammar",
  levelMin: "beginner",
  levelMax: "intermediate",
  tags: [],
  thumbnail: { src: "/x.webp", alt: "x", source: "ai" },
  status: "published",
  featured: false,
  schemaVersion: 1,
  origin: "human",
  reviewStatus: "reviewed",
  type: "quiz",
  content: CONTENT_TEMPLATES.quiz,
} as unknown as PlayableActivity;

afterEach(() => {
  mocks.fetch.mockReset();
  mocks.admin = false;
});

describe("LiveActivityPlayer", () => {
  it("swaps in the newer published version before the game starts (CA11)", async () => {
    mocks.fetch.mockResolvedValue({ ...built, title: "Simple Present (edited)" });
    render(<LiveActivityPlayer activity={built} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Simple Present (edited)" }),
    ).toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledWith("simple-present");
  });

  it("keeps the build version when nothing changed or the fetch fails", async () => {
    mocks.fetch.mockRejectedValue(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<LiveActivityPlayer activity={built} />);
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.getByRole("heading", { level: 1, name: "Simple Present" })).toBeInTheDocument();
    warn.mockRestore();
  });

  it("doesn't replace a game that already started", async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.fetch.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LiveActivityPlayer activity={built} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    resolve({ ...built, title: "Changed" });
    await Promise.resolve();
    expect(screen.queryByRole("heading", { name: "Changed" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
  });

  it("shows the Edit link to admins only", async () => {
    mocks.fetch.mockResolvedValue(built);
    const { unmount } = render(<LiveActivityPlayer activity={built} />);
    expect(screen.queryByRole("link", { name: "Edit activity" })).not.toBeInTheDocument();
    unmount();

    mocks.admin = true;
    render(<LiveActivityPlayer activity={built} />);
    expect(screen.getByRole("link", { name: "Edit activity" })).toHaveAttribute(
      "href",
      "/admin/edit?id=act-1",
    );
  });
});
