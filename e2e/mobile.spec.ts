import { expect, test } from "@playwright/test";

test.describe("phones", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile layout only");

  test("show the bottom navigation and never scroll sideways", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/activities/writing");

    const bottomNav = page.getByRole("navigation", { name: "Mobile" });
    await expect(bottomNav).toBeVisible();
    for (const name of ["Activities", "Search", "Favorites", "Account", "Settings"]) {
      await expect(bottomNav.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("Settings opens the theme picker and closes with Escape", async ({ page }) => {
    await page.goto("/activities");
    const settings = page
      .getByRole("navigation", { name: "Mobile" })
      .getByRole("button", { name: "Settings" });

    await settings.click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await dialog.getByText("Sepia").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(settings).toBeFocused();
  });
});
