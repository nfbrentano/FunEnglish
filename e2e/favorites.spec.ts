import { expect, test, type Page } from "@playwright/test";
import { adminDb, userIdFor } from "./admin";

test.skip(({ isMobile }) => isMobile, "same flows on phones");

const password = "correct-horse-1";
// Unique across parallel workers (a per-worker counter + Date.now() can collide).
const newEmail = () => `fav-${crypto.randomUUID()}@example.com`;

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ana Silva");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
}

const someOrAnyHeart = (page: Page) =>
  page
    .getByRole("region", { name: "Grammar", exact: true })
    .getByRole("button", { name: /favorites: Some or Any$/ });

test("a teacher saves a favorite, and it's still there after a reload", async ({ page }) => {
  await signUp(page, newEmail());
  await expect(page).toHaveURL(/\/activities$/);

  await someOrAnyHeart(page).click();
  await expect(someOrAnyHeart(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: "Saved to favorites" })).toBeVisible();

  await page.reload();
  await expect(someOrAnyHeart(page)).toHaveAttribute("aria-pressed", "true");

  await someOrAnyHeart(page).click();
  await expect(someOrAnyHeart(page)).toHaveAttribute("aria-pressed", "false");
});

test("a visitor's heart is saved right after logging in", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();

  await someOrAnyHeart(page).click();
  const prompt = page.getByRole("dialog", { name: "Log in to save favorites" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("link", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/login\?next=%2Factivities$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();

  await expect(page).toHaveURL(/\/activities$/);
  await expect(someOrAnyHeart(page)).toHaveAttribute("aria-pressed", "true");
});

test("a new list from the toast keeps the activity", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await someOrAnyHeart(page).click();
  await page.getByRole("button", { name: "Add to list" }).click();

  const dialog = page.getByRole("dialog", { name: "Add to a list" });
  await dialog.getByRole("textbox", { name: "New list" }).fill("Teens B1");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Teens B1" })).toBeChecked();
  await dialog.getByRole("button", { name: "Done" }).click();

  const uid = await userIdFor(email);
  await expect
    .poll(
      async () =>
        (
          await adminDb()
            .doc(`users/${uid}/favorites/${await someOrAnyId()}`)
            .get()
        ).get("listIds")?.length,
    )
    .toBe(1);
  const lists = await adminDb().collection(`users/${uid}/lists`).get();
  expect(lists.docs.map((d) => d.get("name"))).toEqual(["Teens B1"]);
});

test("the player has the same heart", async ({ page }) => {
  await signUp(page, newEmail());
  await page.goto("/play/some-or-any");
  await page.getByRole("button", { name: "Start", exact: true }).click();

  const heart = page.getByRole("button", { name: "Add to favorites: Some or Any" });
  await heart.click();
  await expect(
    page.getByRole("button", { name: "Remove from favorites: Some or Any" }),
  ).toHaveAttribute("aria-pressed", "true");
});

async function someOrAnyId() {
  const snapshot = await adminDb()
    .collection("activities")
    .where("slug", "==", "some-or-any")
    .get();
  return snapshot.docs[0].id;
}
