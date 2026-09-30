import { expect, test } from "@playwright/test";

test.describe("desktop navigation", () => {
  test.skip(({ isMobile }) => isMobile, "header links are hidden on phones");

  test("marks the current section in the header", async ({ page }) => {
    await page.goto("/activities");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Activities" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });
});

test("the category bar opens a category and highlights it", async ({ page }) => {
  await page.goto("/activities/grammar");
  const bar = page.getByRole("navigation", { name: "Categories" });
  await expect(bar.getByRole("link", { name: "Grammar" })).toHaveAttribute("aria-current", "page");

  await bar.getByRole("link", { name: "Listening" }).click();

  await expect(page).toHaveURL(/\/activities\/listening$/);
  await expect(page.getByRole("heading", { level: 1, name: "Listening" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Listening" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("every footer link opens a page", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page
    .getByRole("navigation", { name: "Footer" })
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));

  expect(hrefs).toEqual(["/about", "/faq", "/contact", "/privacy", "/terms"]);
  for (const href of hrefs) {
    expect((await request.get(href!)).status(), href!).toBe(200);
  }
});

test("unknown URLs show the 404 page with a way back", async ({ page }) => {
  const response = await page.goto("/xyz");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Browse activities" }).click();
  await expect(page).toHaveURL(/\/activities$/);
});

test("pages render without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));

  for (const path of ["/", "/activities", "/activities/speaking", "/about"]) {
    await page.goto(path);
  }
  expect(errors).toEqual([]);
});
