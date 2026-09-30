import { expect, test } from "@playwright/test";

/** Records data-theme at DOMContentLoaded, i.e. before React hydrates: that's what the first paint uses. */
async function themeAtFirstPaint(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __firstTheme?: string }).__firstTheme =
        document.documentElement.dataset.theme;
    });
  });
}

test("a saved theme is applied on the first paint", async ({ page }) => {
  await themeAtFirstPaint(page);
  await page.addInitScript(() => localStorage.setItem("fun-english-theme", "sepia"));

  await page.goto("/activities");

  expect(
    await page.evaluate(() => (window as unknown as { __firstTheme?: string }).__firstTheme),
  ).toBe("sepia");
});

test("System follows the OS color scheme", async ({ page }) => {
  await themeAtFirstPaint(page);
  await page.emulateMedia({ colorScheme: "light" });

  await page.goto("/activities");

  expect(
    await page.evaluate(() => (window as unknown as { __firstTheme?: string }).__firstTheme),
  ).toBe("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme-preference", "system");
});

test.describe("desktop theme picker", () => {
  test.skip(({ isMobile }) => isMobile, "the header picker is hidden on phones");

  test("persists the choice across reloads", async ({ page }) => {
    await page.goto("/activities");
    await page.getByRole("banner").getByText("Light", { exact: true }).click({ force: true });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
