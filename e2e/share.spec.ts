import { expect, test } from "@playwright/test";
import { adminDb, userIdFor } from "./admin";

// "Some or Any" (seeded from content/activities): answers some, any, any, some, some.
const ANSWERS = ["some", "any", "any", "some", "some"];
const STUDENT_PATH = "/play/some-or-any?mode=student";

test("share from a card: student link, copy, QR fullscreen, Esc returns focus", async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/activities");
  const share = page
    .getByRole("region", { name: "Grammar", exact: true })
    .getByRole("button", { name: "Share: Some or Any" });
  await share.click();

  const dialog = page.getByRole("dialog", { name: "Share with students" });
  await expect(dialog.getByRole("textbox", { name: "Student link" })).toHaveValue(
    `${baseURL}${STUDENT_PATH}`,
  );
  await expect(
    dialog.getByRole("img", { name: "QR code for Some or Any" }).locator("svg"),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Copy link" }).click();
  await expect(dialog.getByRole("button", { name: "Copied!" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${baseURL}${STUDENT_PATH}`,
  );
  await expect(dialog.getByRole("button", { name: "Copy link" })).toBeVisible({ timeout: 4000 });

  // Fullscreen QR: at least 60% of the smaller side of the screen (RNF01).
  await dialog.getByRole("button", { name: "Show fullscreen" }).click();
  const fullscreen = page.getByRole("dialog", { name: "QR code for Some or Any" });
  const box = await fullscreen.getByRole("img", { name: "QR code for Some or Any" }).boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.width).toBeGreaterThanOrEqual(0.6 * Math.min(viewport.width, viewport.height));
  await fullscreen.getByRole("button", { name: "Close fullscreen" }).click();
  await expect(fullscreen).toBeHidden();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(share).toBeFocused();
});

test("whole-class games come with a heads-up", async ({ page }) => {
  await page.goto("/play/quiz-board-basic-1");
  await page.getByRole("button", { name: /^Share:/ }).click();
  await expect(page.getByText(/Best used in class/)).toBeVisible();
});

test("a teacher opening a student link plays without writing to Firestore", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the account menu is desktop-only; same flow on phones");
  // Signed in, so only student mode keeps the play out of "Recently played".
  const email = `share-${crypto.randomUUID()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ana Silva");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  const uid = await userIdFor(email);

  const writes: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/Firestore\/Write|:commit|:batchWrite/.test(url)) writes.push(url);
  });

  await page.goto(STUDENT_PATH);
  await expect(page.getByRole("banner")).toBeHidden();
  await page.getByLabel("Shuffle questions").uncheck();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  for (const [i, answer] of ANSWERS.entries()) {
    await page.getByRole("button", { name: answer, exact: true }).click();
    await page
      .getByRole("button", { name: i < ANSWERS.length - 1 ? "Next" : "See results" })
      .click();
  }
  await expect(page.getByText("5 / 5 correct")).toBeVisible();

  expect(writes).toEqual([]);
  expect((await adminDb().collection(`users/${uid}/history`).get()).size).toBe(0);
});
