import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Spec: mais imagens nas atividades. Uses e2e/fixtures/activities/pictures/fixture-picture-quiz.json.
const QUIZ = "/play/fixture-picture-quiz";

async function start(page: Page) {
  await page.getByLabel("Shuffle questions").uncheck();
  await page.getByRole("button", { name: "Start", exact: true }).click();
}

test("the intro shows the activity's picture, or the category's when it's missing (CA01)", async ({
  page,
}) => {
  await page.goto(QUIZ);
  await expect(page.getByRole("img", { name: "A kitchen shelf" })).toBeVisible();

  // Fixture thumbnails don't exist: the grammar fixtures show the category art instead.
  await page.goto("/play/fixture-grammar-1");
  await expect(page.getByRole("heading", { level: 1, name: "Fixture Grammar 1" })).toBeVisible();
  await expect(page.getByTestId("category-art")).toBeVisible();
  const broken = await page.evaluate(
    () =>
      [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.offsetParent)
        .length,
  );
  expect(broken).toBe(0);
});

test("picture answers, a missing picture and an item picture (CA02, CA03, CA05, CA10)", async ({
  page,
}) => {
  const images: string[] = [];
  page.on("request", (r) => r.resourceType() === "image" && images.push(new URL(r.url()).pathname));
  await page.goto(QUIZ);
  await start(page);

  // Q1: four pictures in a 2×2 grid, chosen by their name.
  const kettle = page.getByRole("button", { name: "kettle", exact: true });
  await expect(kettle.locator("img")).toBeVisible();
  const boxes = await Promise.all(
    ["kettle", "whisk", "frying pan", "cutting board"].map((name) =>
      page.getByRole("button", { name, exact: true }).boundingBox(),
    ),
  );
  expect(new Set(boxes.map((b) => Math.round(b!.y))).size).toBe(2);
  // A planned picture that isn't uploaded yet is never requested (no 404 for students).
  expect(images.filter((p) => p.includes("fixture-picture-quiz/question-2"))).toEqual([]);
  await kettle.click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // Q2: its picture isn't uploaded yet: the category art shows, never a broken image.
  await expect(page.getByRole("heading", { name: "What is this?" })).toBeVisible();
  await expect(page.getByTestId("category-art")).toBeVisible();
  await expect(page.getByRole("img", { name: "A planned picture" })).toHaveCount(0);
  await page.getByRole("button", { name: "a picture", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  expect(images.filter((p) => p.includes("fixture-picture-quiz/question-2"))).toEqual([]);

  // Q3: the item picture above the question, still fitting when projected.
  await expect(page.getByRole("img", { name: "A whisk" })).toBeVisible();
});

test("projected at 1366×768, the picture leaves the options on screen (RNF06)", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop projection");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(QUIZ);
  await start(page);
  await page.getByRole("button", { name: "kettle", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "a picture", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  const last = page.getByRole("button", { name: "a kettle", exact: true });
  await expect(last).toBeInViewport();
  const picture = await page.getByRole("img", { name: "A whisk" }).boundingBox();
  expect(picture!.height).toBeLessThanOrEqual(768 * 0.45 + 1);
});

test("results show an illustration (the trophy until the pictures exist) (CA04)", async ({
  page,
}) => {
  await page.goto(QUIZ);
  await start(page);
  for (const answer of ["kettle", "a picture", "a whisk"]) {
    await page.getByRole("button", { name: answer, exact: true }).click();
    await page.getByRole("button", { name: /^(Next|See results)$/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
  await expect(page.getByText("3 / 3 correct")).toBeVisible();
});

for (const theme of ["dark", "light", "sepia"]) {
  test(`no serious accessibility violations with pictures (${theme}) (CA12)`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("fun-english-theme", t), theme);
    await page.goto(QUIZ);
    await page.waitForTimeout(700);
    const check = async (where: string) => {
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${where} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
      ).toEqual([]);
    };
    await check("intro");
    await start(page);
    await expect(
      page.getByRole("button", { name: "kettle", exact: true }).locator("img"),
    ).toBeVisible();
    await check("picture answers");
  });
}
