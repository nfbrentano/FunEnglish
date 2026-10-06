import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { FavoritesUiProvider } from "@/components/favorites/favorites-ui";
import { ToastProvider } from "@/components/ui/toast";
import type { CatalogIndex } from "@/lib/catalog/schema";
import { FavoritesProvider } from "@/lib/favorites/favorites-provider";
import type { HistoryRepository } from "@/lib/history/history";
import { catalogItem } from "../catalog/factory";
import { memoryRepository } from "../favorites/memory-repository";

const auth = vi.hoisted(() => ({
  user: {
    uid: "ana",
    displayName: "Ana Silva",
    email: "ana@example.com",
    photoURL: null,
  } as null | Record<string, unknown>,
}));
vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: () => ({ user: auth.user, loading: false, signOut: async () => {} }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/lib/catalog/fetch", () => ({ fetchCatalogIndexOnce: () => new Promise(() => {}) }));
// Sections with their own tests; rendered for real they hit Firestore and log after teardown.
vi.mock("@/components/dashboard/pending-actions-section", () => ({
  PendingActionsSection: () => null,
}));
vi.mock("@/components/dashboard/billing-panel", () => ({ BillingPanel: () => null }));
vi.mock("@/components/dashboard/students-section", () => ({ StudentsSection: () => null }));
vi.mock("@/components/dashboard/availability-section", () => ({ AvailabilitySection: () => null }));
vi.mock("@/components/dashboard/classes-section", () => ({ ClassesSection: () => null }));
vi.mock("@/components/dashboard/homework-section", () => ({ HomeworkSection: () => null }));
vi.mock("@/components/tracks/tracks-section", () => ({ TracksSection: () => null }));

const catalog: CatalogIndex = {
  schemaVersion: 1,
  updatedAt: "2026-09-30T00:00:00.000Z",
  items: ["Some or Any", "Kitchen Items", "Odd One Out 1"].map((title, i) =>
    catalogItem({ slug: `a${i}`, id: `a${i}`, title }),
  ),
};

const day = (n: number) => new Date(Date.UTC(2026, 8, n));

function setup({
  favorites = [] as { activityId: string; addedAt: Date; listIds: string[] }[],
  lists = [] as { id: string; name: string; order: number; createdAt: Date }[],
  played = [] as { activityId: string; lastPlayedAt: Date }[],
} = {}) {
  const memory = memoryRepository({ favorites, lists });
  const history: HistoryRepository = { record: vi.fn(), load: vi.fn(async () => played) };
  render(
    <ToastProvider>
      <FavoritesProvider repository={memory.repository}>
        <FavoritesUiProvider>
          <DashboardView initial={catalog} imagePaths={[]} history={history} />
        </FavoritesUiProvider>
      </FavoritesProvider>
    </ToastProvider>,
  );
  return memory;
}

const section = (name: string) => screen.getByRole("region", { name });

describe("DashboardView", () => {
  it("greets the teacher by first name", () => {
    setup();
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back, Ana" }),
    ).toBeInTheDocument();
  });

  it("lists favorites newest first, and flags those no longer published", async () => {
    setup({
      favorites: [
        { activityId: "a0", addedAt: day(1), listIds: [] },
        { activityId: "a1", addedAt: day(3), listIds: [] },
        { activityId: "gone", addedAt: day(2), listIds: [] },
      ],
    });
    const favorites = section("Favorites");
    await waitFor(() => expect(within(favorites).getAllByRole("listitem")).toHaveLength(3));

    const items = within(favorites).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Kitchen Items");
    expect(items[1]).toHaveTextContent("This activity is no longer available");
    expect(items[2]).toHaveTextContent("Some or Any");

    await userEvent.click(within(items[1]).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(within(favorites).getAllByRole("listitem")).toHaveLength(2));
  });

  it("opens, renames and deletes a list; its favorites stay", async () => {
    const memory = setup({
      lists: [{ id: "l1", name: "Teens B1", order: 0, createdAt: day(1) }],
      favorites: ["a0", "a1", "a2"].map((id) => ({
        activityId: id,
        addedAt: day(1),
        listIds: ["l1"],
      })),
    });
    const lists = section("My lists");
    await userEvent.click(await within(lists).findByRole("button", { name: "Open Teens B1" }));
    expect(within(lists).getAllByRole("article")).toHaveLength(3);

    await userEvent.click(within(lists).getByRole("button", { name: "Rename Teens B1" }));
    const input = within(lists).getByRole("textbox", { name: "Rename Teens B1" });
    await userEvent.clear(input);
    await userEvent.type(input, "Teens B2{Enter}");
    await waitFor(() => expect(memory.lists.get("l1")?.name).toBe("Teens B2"));

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await userEvent.click(within(lists).getByRole("button", { name: "Delete Teens B2" }));
    await waitFor(() => expect(memory.lists.size).toBe(0));
    expect(memory.favorites.size).toBe(3);
  });

  it("shows recently played, newest first", async () => {
    setup({
      played: [
        { activityId: "a2", lastPlayedAt: day(5) },
        { activityId: "a0", lastPlayedAt: day(4) },
      ],
    });
    const recent = section("Recently played");
    const titles = await within(recent).findAllByRole("heading", { level: 3 });
    expect(titles.map((t) => t.textContent)).toEqual(["Odd One Out 1", "Some or Any"]);
  });

  it("explains each empty section with a way to start", async () => {
    setup();
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: "Browse activities" })).toHaveLength(3),
    );
    expect(screen.getByText("Tap the heart on any activity to save it here.")).toBeInTheDocument();
    expect(screen.getByText("Activities you start will show up here.")).toBeInTheDocument();
  });
});
