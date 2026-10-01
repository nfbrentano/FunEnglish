import { expect, test, type Page } from "@playwright/test";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../src/lib/firebase-admin/core";
import { E2E_ENV } from "./global-setup";

// "Some or Any" (seeded from content/activities): 5 questions, answers some, any, any, some, some.
const ANSWERS = ["some", "any", "any", "some", "some"];

async function startWithoutShuffle(page: Page) {
  await page.getByLabel("Shuffle questions").uncheck();
  await page.getByRole("button", { name: "Start", exact: true }).click();
}

test("the activity page is static HTML with its title and description (SEO)", async ({
  request,
}) => {
  const html = await (await request.get("/play/some-or-any")).text();
  expect(html).toContain("Some or Any");
  expect(html).toContain("Choose some or any to complete everyday sentences");
});

test("play a quiz from start to results, then play again", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
  await page.goto("/play/some-or-any");
  await expect(page.getByRole("heading", { level: 1, name: "Some or Any" })).toBeVisible();

  await startWithoutShuffle(page);
  await expect(page.getByText("1 / 5")).toBeVisible();

  for (const [i, answer] of ANSWERS.entries()) {
    await page.getByRole("button", { name: answer, exact: true }).click();
    await expect(page.getByText("Correct!")).toBeVisible();
    await page
      .getByRole("button", { name: i < ANSWERS.length - 1 ? "Next" : "See results" })
      .click();
  }

  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
  await expect(page.getByText("5 / 5 correct")).toBeVisible();
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.getByText("1 / 5")).toBeVisible();
  expect(errors).toEqual([]);
});

test("keyboard: number keys answer and Enter moves on", async ({ page }) => {
  await page.goto("/play/some-or-any");
  await startWithoutShuffle(page);
  // The quiz player is loaded on demand: wait for the first question before typing.
  await expect(page.getByRole("heading", { level: 2, name: /There is ___ milk/ })).toBeVisible();

  await page.keyboard.press("2");
  await expect(page.getByText("Not quite")).toBeVisible();
  await expect(page.getByText("Use some in positive sentences.")).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page.getByText("2 / 5")).toBeVisible();
});

test("fullscreen", async ({ page, isMobile }) => {
  test.skip(isMobile, "mobile browsers handle fullscreen differently");
  await page.goto("/play/some-or-any");
  await page.getByRole("button", { name: "Start", exact: true }).click();

  await page.getByRole("button", { name: "Fullscreen" }).click();
  await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
});

test("unknown slugs and drafts show 'Activity not found'", async ({ page }) => {
  for (const slug of ["does-not-exist", "fixture-secret-draft"]) {
    await page.goto(`/play/${slug}`);
    await expect(page.getByRole("heading", { name: "Activity not found" })).toBeVisible();
  }
});

test("an activity published after the build opens through the player shell", async ({ page }) => {
  Object.assign(process.env, {
    FIRESTORE_EMULATOR_HOST: E2E_ENV.FIRESTORE_EMULATOR_HOST,
    FIREBASE_PROJECT_ID: E2E_ENV.FIREBASE_PROJECT_ID,
  });
  const slug = `published-later-${test.info().project.name}`;
  await getAdminDb()
    .collection("activities")
    .doc(slug)
    .set({
      slug,
      title: "Published Later Quiz",
      description: "Added after the site was built.",
      category: "grammar",
      type: "quiz",
      levelMin: "beginner",
      levelMax: "beginner",
      tags: [],
      status: "published",
      featured: false,
      schemaVersion: 1,
      thumbnail: { src: "/x.webp", alt: "x", source: "own" },
      content: {
        questions: [
          {
            prompt: "Pick yes.",
            options: [
              { text: "yes", correct: true },
              { text: "no", correct: false },
            ],
          },
        ],
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  await page.goto(`/play/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: "Published Later Quiz" })).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "yes", exact: true }).click();
  await page.getByRole("button", { name: "See results" }).click();
  await expect(page.getByText("1 / 1 correct")).toBeVisible();
});

test("student mode shows only the activity", async ({ page }) => {
  await page.goto("/play/some-or-any?mode=student");

  await expect(page.getByRole("heading", { level: 1, name: "Some or Any" })).toBeVisible();
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByRole("contentinfo")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("button", { name: "Share" })).toHaveCount(0);
  await expect(page.getByText("Made with Fun English")).toBeVisible();
});
