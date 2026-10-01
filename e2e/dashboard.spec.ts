import { expect, test, type Page } from "@playwright/test";
import { adminDb, userIdFor } from "./admin";

test.skip(({ isMobile }) => isMobile, "same flows on phones");

// Unique across parallel workers (a per-worker counter + Date.now() can collide).
async function signUp(page: Page) {
  const email = `dash-${crypto.randomUUID()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ana Silva");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  return email;
}

test("a new teacher sees a welcome and empty sections", async ({ page }) => {
  await signUp(page);
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { level: 1, name: "Welcome back, Ana" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse activities" })).toHaveCount(3);
});

test("favorites, a list and recently played show up on the dashboard", async ({ page }) => {
  const email = await signUp(page);

  // Favorite one activity and put it in a list.
  await page
    .getByRole("region", { name: "Grammar", exact: true })
    .getByRole("button", { name: /favorites: Some or Any$/ })
    .click();
  await page.getByRole("button", { name: "Add to list" }).click();
  const dialog = page.getByRole("dialog", { name: "Add to a list" });
  await dialog.getByRole("textbox", { name: "New list" }).fill("Teens B1");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Teens B1" })).toBeChecked();
  await dialog.getByRole("button", { name: "Done" }).click();

  // The heart and the list update instantly; wait until Firestore has them before leaving the page.
  const db = adminDb();
  const user = { id: await userIdFor(email) };
  await expect
    .poll(async () => {
      const favorites = await db.collection(`users/${user.id}/favorites`).get();
      return favorites.docs.map((d) => (d.get("listIds") as string[]).length);
    })
    .toEqual([1]);

  // Play another one.
  await page.goto("/play/odd-one-out-1");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("1 / 8")).toBeVisible();
  await expect
    .poll(async () => (await db.collection(`users/${user.id}/history`).get()).size)
    .toBe(1);

  await page.goto("/dashboard");
  await expect(
    page.getByRole("region", { name: "Favorites" }).getByRole("heading", { level: 3 }),
  ).toHaveText(["Some or Any"]);
  await expect(
    page.getByRole("region", { name: "Recently played" }).getByRole("heading", { level: 3 }),
  ).toHaveText(["Odd One Out 1"]);

  const lists = page.getByRole("region", { name: "My lists" });
  await lists.getByRole("button", { name: "Open Teens B1" }).click();
  await expect(lists.getByRole("article")).toHaveCount(1);

  await lists.getByRole("button", { name: "Rename Teens B1" }).click();
  await lists.getByRole("textbox", { name: "Rename Teens B1" }).fill("Teens B2");
  await lists.getByRole("button", { name: "Save" }).click();
  await expect(lists.getByRole("button", { name: /Teens B2/ }).first()).toBeVisible();

  page.once("dialog", (confirm) => void confirm.accept());
  await lists.getByRole("button", { name: "Delete Teens B2" }).click();
  await expect(lists.getByRole("link", { name: "Browse activities" })).toBeVisible();
  // The favorite stays.
  await expect(
    page.getByRole("region", { name: "Favorites" }).getByRole("heading", { level: 3 }),
  ).toHaveText(["Some or Any"]);

  await page.reload();
  await expect(lists.getByRole("button", { name: /Teens B2/ })).toHaveCount(0);
});

test("a favorite that is no longer published can be removed", async ({ page }) => {
  const email = await signUp(page);
  const db = adminDb();
  const user = { id: await userIdFor(email) };
  await db
    .doc(`users/${user.id}/favorites/deleted-activity`)
    .set({ addedAt: new Date(), listIds: [] });

  await page.goto("/dashboard");
  const favorites = page.getByRole("region", { name: "Favorites" });
  await expect(favorites.getByText("This activity is no longer available")).toBeVisible();
  await favorites.getByRole("button", { name: "Remove" }).click();
  await expect(favorites.getByRole("link", { name: "Browse activities" })).toBeVisible();
});
