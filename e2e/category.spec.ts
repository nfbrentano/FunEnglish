import { expect, test } from "@playwright/test";
import { PUBLISHED, seeded } from "./seed-data";

const publishedIn = (category: string) =>
  seeded.filter((a) => a.status === "published" && a.category === category).length;
const results = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Search results" });

test("category header, count and highlighted category", async ({ page }) => {
  await page.goto("/activities/speaking");

  await expect(page.getByRole("heading", { level: 1, name: "Speaking" })).toBeVisible();
  await expect(
    page.getByText(`Conversation practice · ${publishedIn("speaking")} activities`),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: "Speaking" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(results(page).getByRole("article")).toHaveCount(publishedIn("speaking"));
});

for (const [width, columns] of [
  [375, 1],
  [768, 3],
  [1440, 4],
] as const) {
  test(`grid has ${columns} column(s) at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/activities/grammar");
    const lefts = await results(page)
      .getByRole("listitem")
      .evaluateAll(
        (items) => new Set(items.map((li) => Math.round(li.getBoundingClientRect().left))).size,
      );
    expect(lefts).toBe(columns);
  });
}

test("level and search filters within the category", async ({ page }) => {
  await page.goto("/activities/grammar");
  await page.getByLabel("Level").selectOption("beginner");
  await page.getByRole("searchbox", { name: "Search activities" }).fill("some");

  await expect(results(page).getByRole("heading", { level: 3 })).toHaveText(["Some or Any"]);
  await expect(page).toHaveURL(/\/activities\/grammar\?q=some&level=beginner$/);
});

test("Back from an activity returns to the same scroll position", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop scroll positions");
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/activities/grammar");

  const lastCard = results(page).getByRole("article").last();
  await lastCard.scrollIntoViewIfNeeded();
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(200);

  await lastCard.getByRole("heading", { level: 3 }).getByRole("link").click();
  await expect(page).toHaveURL(/\/play\//);
  await page.goBack();

  await expect(page).toHaveURL(/\/activities\/grammar$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled - 50);
});

test("What's New › See All lists everything, newest first", async ({ page }) => {
  await page.goto("/activities");
  await page.getByRole("link", { name: "See all What's New activities" }).click();

  await expect(page).toHaveURL(/\/activities\/new$/);
  await expect(page.getByRole("heading", { level: 1, name: "What's New" })).toBeVisible();
  await expect(results(page).getByRole("article")).toHaveCount(Math.min(PUBLISHED, 24));
  await expect(results(page).getByRole("heading", { level: 3 }).first()).toHaveText(
    "Fixture Grammar 6",
  );
});

test("unknown categories are 404", async ({ request }) => {
  expect((await request.get("/activities/cooking")).status()).toBe(404);
});
