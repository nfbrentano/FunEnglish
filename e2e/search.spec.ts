import { expect, test, type Page } from "@playwright/test";
import { PUBLISHED } from "./seed-data";

// Same seed as catalog.spec.ts (see e2e/seed-data.ts).
const search = (page: Page) => page.getByRole("searchbox", { name: "Search activities" });
const results = (page: Page) => page.getByRole("region", { name: "Search results" });
const count = (page: Page) => page.getByText(/^Showing \d+ activit/);

test.beforeEach(async ({ page }) => {
  await page.goto("/activities");
  await expect(page.getByRole("heading", { level: 2, name: "What's New" })).toBeVisible();
});

test("typing filters the results after a short pause, ignoring accents", async ({ page }) => {
  await search(page).fill("cafe");

  await expect(count(page)).toHaveText("Showing 1 activity");
  await expect(results(page).getByRole("heading", { level: 3 })).toHaveText([
    "Everyday Dialogues: At the Café",
  ]);
  await expect(page).toHaveURL(/\?q=cafe$/);
});

test("multi-word search", async ({ page }) => {
  await search(page).fill("fixture grammar");
  await expect(count(page)).toHaveText("Showing 6 activities");
});

test("category and level filters", async ({ page }) => {
  await page.getByLabel("Category").selectOption("listening");
  await expect(count(page)).toHaveText("Showing 3 activities");

  await page.getByLabel("Category").selectOption("grammar");
  await page.getByLabel("Level").selectOption("beginner");
  // Some or Any and the prepositions activity are Beg–Inter; the fixtures are Inter–Adv.
  await expect(results(page).getByRole("heading", { level: 3 })).toHaveText([
    "Some or Any",
    "Prepositions of Time: in, on, at",
  ]);

  await page.getByLabel("Level").selectOption("advanced");
  await expect(count(page)).toHaveText("Showing 6 activities");
  await expect(results(page).getByText("Some or Any")).toHaveCount(0);
});

test("sorting by title", async ({ page }) => {
  await page.getByLabel("Category").selectOption("grammar");
  const titles = results(page).getByRole("heading", { level: 3 });

  await page.getByLabel("Sort by").selectOption("title-asc");
  await expect(titles.first()).toHaveText("Fixture Grammar 1");
  await expect(titles.last()).toHaveText("Some or Any");

  await page.getByLabel("Sort by").selectOption("title-desc");
  await expect(titles.first()).toHaveText("Some or Any");
});

test("filters live in the URL: shareable, and Back undoes the last change", async ({ page }) => {
  await page.goto("/activities?q=fixture&category=grammar&level=advanced");
  await expect(search(page)).toHaveValue("fixture");
  await expect(page.getByLabel("Category")).toHaveValue("grammar");
  await expect(page.getByLabel("Level")).toHaveValue("advanced");
  await expect(count(page)).toHaveText("Showing 6 activities");

  await page.getByLabel("Sort by").selectOption("title-desc");
  await expect(page).toHaveURL(/sort=title-desc/);

  await page.goBack();
  await expect(page).not.toHaveURL(/sort=/);
  await expect(page.getByLabel("Sort by")).toHaveValue("newest");
  await expect(search(page)).toHaveValue("fixture");
});

test("Clear filters brings back the carousels", async ({ page }) => {
  await search(page).fill("fixture");
  await page.getByLabel("Category").selectOption("grammar");
  await expect(results(page)).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();

  await expect(page).toHaveURL(/\/activities$/);
  await expect(search(page)).toHaveValue("");
  await expect(page.getByRole("heading", { level: 2, name: "What's New" })).toBeVisible();
  await expect(count(page)).toHaveText(`Showing ${PUBLISHED} activities`);
});

test("no results", async ({ page }) => {
  await search(page).fill("xyzqwe");

  await expect(page.getByRole("heading", { name: "No activities found" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).last().click();
  await expect(page.getByRole("heading", { level: 2, name: "What's New" })).toBeVisible();
});

test("typing never queries Firestore", async ({ page }) => {
  // Start counting only after the one catalog read of this visit.
  // Firestore Lite reads with POST …:batchGet; the document path is in the body.
  const catalogRead = page.waitForRequest((req) =>
    decodeURIComponent(req.url() + (req.postData() ?? "")).includes("catalog/index"),
  );
  await page.goto("/activities");
  await catalogRead;
  await page.waitForLoadState("load");
  const firestoreRequests: string[] = [];
  page.on(
    "request",
    // The page-load catalog read can surface twice in Chromium (a request without a JS
    // initiator, landing after "load"); it isn't caused by typing, so only count other requests.
    (req) =>
      req.url().includes("127.0.0.1:8080") &&
      !decodeURIComponent(req.postData() ?? "").includes("catalog/index") &&
      firestoreRequests.push(req.url()),
  );

  await search(page).pressSequentially("present perfect quiz", { delay: 30 });
  await expect(count(page)).toBeVisible();
  await page.waitForTimeout(500);

  expect(firestoreRequests).toEqual([]);
});
