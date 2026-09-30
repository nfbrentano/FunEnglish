import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["dark", "light", "sepia"]) {
  test(`no serious accessibility violations in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("fun-english-theme", t), theme);
    await page.goto("/activities/grammar");
    // Let the 0.5s theme transition settle so colors are final.
    await page.waitForTimeout(700);

    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");

    expect(
      serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    ).toEqual([]);
  });
}

test("keyboard users can reach the header controls with visible focus", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop header");
  await page.goto("/activities");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  const focusable = ["Fun English", "Home", "Activities"];
  for (const name of focusable) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveText(name);
    const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  }
});
