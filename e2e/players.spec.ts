import { expect, test } from "@playwright/test";

test("flashcards: flip, move and finish", async ({ page }) => {
  await page.goto("/play/kitchen-items");
  await page.getByRole("button", { name: "Start" }).click();

  const card = page.getByRole("button", { name: /^Card (front|back)/ });
  await expect(card.getByRole("img", { name: "A kettle" })).toBeVisible();
  await card.click();
  await expect(page.getByText("A container used to boil water.")).toBeVisible();

  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByText("4 cards reviewed")).toBeVisible();
});

test("fill in the blanks (typing) with read-aloud audio", async ({ page }) => {
  await page.goto("/play/everyday-dialogues-at-the-cafe");
  await page.getByRole("button", { name: "Start" }).click();

  for (const [i, answer] of ["get", "Milk", "blueberry", "will be"].entries()) {
    await expect(page.getByRole("button", { name: "Listen" })).toBeVisible();
    await page.getByRole("textbox", { name: "Gap 1" }).fill(answer);
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("img", { name: "Correct" })).toBeVisible();
    await page.getByRole("button", { name: i < 3 ? "Next" : "See results" }).click();
  }
  await expect(page.getByText("4 / 4 correct")).toBeVisible();
});

test("fill in the blanks (word bank)", async ({ page }) => {
  await page.goto("/play/prepositions-of-time-in-on-at");
  await page.getByRole("button", { name: "Start" }).click();

  await page.getByRole("group", { name: "Word bank" }).getByRole("button", { name: "at" }).click();
  await page.getByRole("button", { name: "Gap 1" }).click();
  await expect(page.getByRole("button", { name: "Gap 1: at" })).toBeVisible();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 of 1 correct" })).toBeAttached();
});

test("quiz board: named teams, points and the winner", async ({ page }) => {
  await page.goto("/play/quiz-board-basic-1");
  await page.getByRole("textbox", { name: "Name of team 1" }).fill("Tigers");
  await page.getByRole("button", { name: "Start" }).click();

  await page.getByRole("button", { name: "Animals – 300" }).click();
  await expect(page.getByRole("heading", { name: "A baby dog is called a…" })).toBeVisible();
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByText("Puppy")).toBeVisible();
  await page.getByRole("button", { name: "Tigers +300" }).click();

  await expect(page.getByRole("list", { name: "Score" })).toContainText("Tigers: 300");
  await expect(page.getByRole("button", { name: "Animals – 300 (already played)" })).toBeDisabled();
  await page.getByRole("button", { name: "End game" }).click();
  await expect(page.getByText("Tigers wins!")).toBeVisible();
});

test("quiz board fits a 1920×1080 projector without scrolling", async ({ page, isMobile }) => {
  test.skip(isMobile, "projector layout");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/play/quiz-board-basic-1");
  await page.getByRole("button", { name: "Start" }).click();

  const lastCell = page.getByRole("button", { name: "Verbs – 300" });
  const box = await lastCell.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(1080);
});

test("discussion cards: This or That, follow-ups and random", async ({ page }) => {
  await page.goto("/play/this-or-that-1");
  await page.getByRole("button", { name: "Start" }).click();

  await expect(page.getByText("Beach")).toBeVisible();
  await expect(page.getByText("Mountains")).toBeVisible();
  await page.getByRole("button", { name: "Show follow-up questions" }).click();
  await expect(page.getByText("When was your last trip there?")).toBeVisible();

  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Random card" }).click();
  await page.getByRole("button", { name: "Random card" }).click();
  await expect(page.getByText("All cards shown – Start over?")).toBeVisible();
});

test("writing cards count words", async ({ page }) => {
  await page.goto("/play/story-starters-1");
  await page.getByRole("button", { name: "Start" }).click();

  await page
    .getByRole("textbox", { name: "Write your answer here…" })
    .fill("The door opened and a tiny dragon walked in.");
  await expect(page.getByText("9 words")).toBeVisible();
});
