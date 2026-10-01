import { expect, test } from "@playwright/test";

// Seeded by e2e/global-setup.ts: 5 example activities (content/activities) + 6 grammar fixtures
// + 1 grammar draft. Categories without published activities: pictures, reading, videos, writing.
const PUBLISHED = 11;

test.beforeEach(async ({ page }) => {
  await page.goto("/activities");
});

test("hero shows the number of published activities and a search field", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "Fun English Activities" }),
  ).toBeVisible();
  await expect(
    page.getByText(`${PUBLISHED} Interactive Activities for ESL Teachers`),
  ).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search activities" })).toBeVisible();
});

test("What's New lists the newest activities first with the New badge", async ({ page }) => {
  const whatsNew = page.getByRole("region", { name: "What's New", exact: true });
  const titles = whatsNew.getByRole("heading", { level: 3 });

  await expect(titles).toHaveCount(PUBLISHED);
  await expect(titles.first()).toHaveText("Fixture Grammar 6");
  await expect(whatsNew.getByText("New", { exact: true }).first()).toBeVisible();
});

test("one carousel per category with activities, in catalog order", async ({ page }) => {
  const headings = page.getByRole("heading", { level: 2 });
  await expect(headings).toHaveText([
    "What's New",
    "Fun",
    "Grammar",
    "Listening",
    "Speaking",
    "Vocabulary",
  ]);
  await expect(page.getByRole("heading", { level: 2, name: "Writing" })).toHaveCount(0);
});

test("See All opens the category page", async ({ page }) => {
  await page.getByRole("link", { name: "See all Grammar activities" }).click();
  await expect(page).toHaveURL(/\/activities\/grammar$/);
});

test("a card shows its details and opens the activity", async ({ page }) => {
  const card = page
    .getByRole("region", { name: "Grammar", exact: true })
    .getByRole("article")
    .filter({ hasText: "Some or Any" });

  await expect(card.getByRole("img", { name: /kitchen table/ })).toBeVisible();
  await expect(card.getByText("Beg–Inter")).toBeVisible();
  await card.getByRole("link", { name: "Some or Any", exact: true }).click();

  await expect(page).toHaveURL(/\/play\/some-or-any$/);
  await expect(page.getByRole("heading", { level: 1, name: "Some or Any" })).toBeVisible();
});

test.describe("desktop carousel", () => {
  test.skip(({ isMobile }) => isMobile, "arrows are hidden on phones (swipe instead)");

  test("arrows reveal more cards", async ({ page }) => {
    const grammar = page.getByRole("region", { name: "Grammar", exact: true });
    await expect(grammar.getByRole("button", { name: "Previous Grammar activities" })).toHaveCount(
      0,
    );

    await grammar.getByRole("button", { name: "Next Grammar activities" }).click();

    await expect(
      grammar.getByRole("button", { name: "Previous Grammar activities" }),
    ).toBeVisible();
  });
});

test("drafts never show up", async ({ page }) => {
  await expect(page.getByText("Secret Draft Activity")).toHaveCount(0);
  // No static page; the player shell can't read it either (Firestore rules).
  await page.goto("/play/fixture-secret-draft");
  await expect(page.getByRole("heading", { name: "Activity not found" })).toBeVisible();
});

test("the catalog reads only catalog/index, never the activities collection", async ({
  browser,
}) => {
  const page = await browser.newPage();
  const firestoreRequests: string[] = [];
  const describe = (req: import("@playwright/test").Request) =>
    decodeURIComponent(req.url() + (req.postData() ?? ""));
  page.on("request", (req) => {
    if (req.url().includes("127.0.0.1:8080")) firestoreRequests.push(describe(req));
  });
  const errors: string[] = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));

  // Firestore keeps a streaming connection open, so wait for the read itself (not network idle).
  const catalogRead = page.waitForRequest((req) => describe(req).includes("catalog/index"));
  await page.goto("/activities");
  await catalogRead;
  await expect(page.getByRole("region", { name: "What's New", exact: true })).toBeVisible();
  await page.waitForTimeout(1000);

  expect(firestoreRequests.filter((url) => url.includes("documents/activities"))).toEqual([]);
  expect(errors).toEqual([]);
  await page.close();
});
