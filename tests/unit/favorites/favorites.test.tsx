import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { FavoriteButton, FavoritesUiProvider } from "@/components/favorites/favorites-ui";
import { ToastProvider } from "@/components/ui/toast";
import { FavoritesProvider, useFavorites } from "@/lib/favorites/favorites-provider";
import { memoryRepository } from "./memory-repository";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: () => ({ user: auth.user, loading: false, signOut: async () => {} }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/activities" }));

// jsdom has no <dialog> methods.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};

function Wrapper({
  children,
  repository,
}: {
  children: ReactNode;
  repository: ReturnType<typeof memoryRepository>["repository"];
}) {
  return (
    <ToastProvider>
      <FavoritesProvider repository={repository}>
        <FavoritesUiProvider>{children}</FavoritesUiProvider>
      </FavoritesProvider>
    </ToastProvider>
  );
}

function setup(user: { uid: string } | null, initial?: Parameters<typeof memoryRepository>[0]) {
  auth.user = user;
  const memory = memoryRepository(initial);
  const utils = render(
    <Wrapper repository={memory.repository}>
      <FavoriteButton activityId="some-or-any" title="Some or Any" className="" />
      <FavoriteButton activityId="kitchen-items" title="Kitchen Items" className="" />
      <Probe />
    </Wrapper>,
  );
  return { ...memory, ...utils };
}

let api: ReturnType<typeof useFavorites>;
const exposeApi = (value: ReturnType<typeof useFavorites>) => {
  api = value;
};
/** Shows readiness and hands the favorites API to the test. */
function Probe() {
  const favorites = useFavorites();
  useEffect(() => exposeApi(favorites), [favorites]);
  return <p data-testid="ready">{String(favorites.ready)}</p>;
}

const heart = (title: string) =>
  screen.getByRole("button", { name: new RegExp(`favorites: ${title}$`) });

describe("favorites", () => {
  it("a teacher favorites and unfavorites with one click", async () => {
    const { favorites } = setup({ uid: "ana" });
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));

    await userEvent.click(heart("Some or Any"));
    expect(heart("Some or Any")).toHaveAttribute("aria-pressed", "true");
    expect(heart("Some or Any")).toHaveAccessibleName("Remove from favorites: Some or Any");
    expect(favorites.has("some-or-any")).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent("Saved to favorites");

    await userEvent.click(heart("Some or Any"));
    expect(heart("Some or Any")).toHaveAttribute("aria-pressed", "false");
    expect(favorites.has("some-or-any")).toBe(false);
  });

  it("loads favorites once for every heart on the page", async () => {
    const { repository } = setup(
      { uid: "ana" },
      { favorites: [{ activityId: "kitchen-items", addedAt: new Date(), listIds: [] }] },
    );
    await waitFor(() => expect(heart("Kitchen Items")).toHaveAttribute("aria-pressed", "true"));
    expect(repository.load).toHaveBeenCalledTimes(1);
  });

  it("keeps hearts and lists made while favorites were still loading (FIX)", async () => {
    auth.user = { uid: "ana" };
    const memory = memoryRepository({
      favorites: [{ activityId: "kitchen-items", addedAt: new Date(), listIds: [] }],
      lists: [{ id: "old", name: "Old list", order: 0, createdAt: new Date() }],
    });
    let finishLoading: () => void = () => {};
    const serverData = await memory.repository.load("ana");
    vi.mocked(memory.repository.load).mockImplementationOnce(
      () => new Promise((resolve) => (finishLoading = () => resolve(serverData))),
    );
    render(
      <Wrapper repository={memory.repository}>
        <FavoriteButton activityId="some-or-any" title="Some or Any" className="" />
        <FavoriteButton activityId="kitchen-items" title="Kitchen Items" className="" />
        <Probe />
      </Wrapper>,
    );
    await waitFor(() => expect(memory.repository.load).toHaveBeenCalledTimes(2));

    await userEvent.click(heart("Some or Any"));
    await act(() => api.createList("Teens B1", "some-or-any"));
    await act(async () => finishLoading());

    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    expect(heart("Some or Any")).toHaveAttribute("aria-pressed", "true");
    expect(heart("Kitchen Items")).toHaveAttribute("aria-pressed", "true");
    expect(api.lists.map((l) => l.name)).toEqual(["Old list", "Teens B1"]);
    const teens = api.lists.find((l) => l.name === "Teens B1")!;
    expect(api.favorites.get("some-or-any")?.listIds).toEqual([teens.id]);
  });

  it("another teacher on the same tab doesn't inherit the previous one's favorites", async () => {
    const { rerender, repository } = setup({ uid: "ana" });
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    await userEvent.click(heart("Some or Any"));

    vi.mocked(repository.load).mockResolvedValueOnce({ favorites: [], lists: [] });
    auth.user = { uid: "bia" };
    rerender(
      <Wrapper repository={repository}>
        <FavoriteButton activityId="some-or-any" title="Some or Any" className="" />
        <Probe />
      </Wrapper>,
    );
    await waitFor(() => expect(repository.load).toHaveBeenLastCalledWith("bia"));
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    expect(heart("Some or Any")).toHaveAttribute("aria-pressed", "false");
  });

  it("rolls back and explains when saving fails", async () => {
    const { state } = setup({ uid: "ana" });
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    state.fail = true;

    await userEvent.click(heart("Some or Any"));

    await waitFor(() => expect(heart("Some or Any")).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByText("Couldn't save. Try again.")).toBeInTheDocument();
  });

  it("visitors are invited to log in, and the heart is saved after they do", async () => {
    const view = setup(null);
    await userEvent.click(heart("Some or Any"));
    const dialog = screen.getByRole("dialog", { name: "Log in to save favorites" });
    expect(within(dialog).getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?next=%2Factivities",
    );

    // The teacher logs in: the provider sees the user and saves the pending heart.
    auth.user = { uid: "ana" };
    view.rerender(
      <Wrapper repository={view.repository}>
        <FavoriteButton activityId="some-or-any" title="Some or Any" className="" />
        <Probe />
      </Wrapper>,
    );
    await waitFor(() => expect(heart("Some or Any")).toHaveAttribute("aria-pressed", "true"));
    expect(view.repository.addFavorite).toHaveBeenCalledWith("ana", "some-or-any", []);
  });

  it("creates a list from the toast and adds the activity to it", async () => {
    const { favorites, lists } = setup({ uid: "ana" });
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    await userEvent.click(heart("Some or Any"));
    await userEvent.click(screen.getByRole("button", { name: "Add to list" }));

    const dialog = screen.getByRole("dialog", { name: "Add to a list" });
    await userEvent.type(within(dialog).getByRole("textbox", { name: "New list" }), "Teens B1");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(within(dialog).getByRole("checkbox", { name: "Teens B1" })).toBeChecked(),
    );
    const [list] = [...lists.values()];
    expect(list.name).toBe("Teens B1");
    expect(favorites.get("some-or-any")?.listIds).toEqual([list.id]);
  });

  it("deleting a list keeps its favorites", async () => {
    const list = { id: "l1", name: "Teens B1", order: 0, createdAt: new Date() };
    const { favorites, lists } = setup(
      { uid: "ana" },
      {
        lists: [list],
        favorites: ["a", "b", "c"].map((id) => ({
          activityId: id,
          addedAt: new Date(),
          listIds: ["l1"],
        })),
      },
    );
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));

    await api.deleteList("l1");

    expect(lists.size).toBe(0);
    expect([...favorites.values()].map((f) => [f.activityId, f.listIds])).toEqual([
      ["a", []],
      ["b", []],
      ["c", []],
    ]);
  });

  it("stops at 50 lists", async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      id: `l${i}`,
      name: `List ${i}`,
      order: i,
      createdAt: new Date(),
    }));
    const { repository } = setup({ uid: "ana" }, { lists: many });
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));

    expect(await api.createList("One more")).toBeNull();
    expect(repository.createList).not.toHaveBeenCalled();
    expect(await screen.findByText("You've reached the limit of 50 lists")).toBeInTheDocument();
  });
});
