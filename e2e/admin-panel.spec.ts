import { expect, test, type Page } from "@playwright/test";
import { adminDb, grantAdmin } from "./admin";

// Runs in the "admin" project (playwright.config.ts): after the catalog tests, one test at a time.

async function signUp(page: Page, { admin }: { admin: boolean }) {
  const email = `admin-${crypto.randomUUID()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ada Admin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  if (admin) await grantAdmin(email);
  return email;
}

async function pendingCount() {
  const snapshot = await adminDb()
    .collection("activities")
    .where("origin", "==", "ai")
    .where("reviewStatus", "==", "pending")
    .get();
  return snapshot.size;
}

const editor = (page: Page) => page.getByRole("region", { name: "Edit activity" });

/** New activity from the quiz template, filled until it's valid. */
async function createQuiz(page: Page, title: string) {
  await page.goto("/admin/edit");
  await editor(page).getByLabel("Title", { exact: true }).fill(title);
  await editor(page).getByLabel("Category").selectOption("writing");
  await editor(page)
    .getByLabel("Description", { exact: true })
    .fill("Created by the admin e2e test.");
  await editor(page).getByLabel("Thumbnail description (alt)").fill("A test thumbnail");
  await editor(page).getByLabel("Thumbnail path or URL").fill("/images/missing.webp");
}

test("teachers without the admin claim are not authorized", async ({ page }) => {
  await signUp(page, { admin: false });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Not authorized" })).toBeVisible();
  await page.goto("/admin/edit");
  await expect(page.getByRole("heading", { name: "Not authorized" })).toBeVisible();
});

test("signed-out visitors are sent to log in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});

test("admins see every activity, filter it and work through the review queue", async ({ page }) => {
  await signUp(page, { admin: true });
  await page.goto("/admin");

  // Drafts are listed too.
  await expect(page.getByRole("link", { name: "Secret Draft Activity" })).toBeVisible();
  await page.getByLabel("Status").selectOption("draft");
  await expect(page.getByRole("link", { name: "Fixture Grammar 1" })).toHaveCount(0);
  await page.getByLabel("Status").selectOption("");
  await page.getByRole("searchbox", { name: "Search by title" }).fill("fixture grammar 3");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Search by title" }).fill("");

  // Review queue: mark one as reviewed and the counter goes down.
  const before = await pendingCount();
  expect(before).toBeGreaterThan(1);
  await expect(page.getByText(`${before} need`)).toBeVisible();
  await page.getByLabel("Needs review").check();
  await page.getByRole("row").nth(1).getByRole("link").click();
  await expect(page).toHaveURL(/\/admin\/edit\?id=.+&review=1/);
  await expect(page.getByText("AI-generated, not reviewed yet")).toBeVisible();
  const firstUrl = page.url();
  await page.getByRole("button", { name: "Save & next" }).click();
  await expect(page).not.toHaveURL(firstUrl);
  await expect(page).toHaveURL(/review=1/);
  await expect.poll(pendingCount).toBe(before - 1);

  await page.getByRole("button", { name: "Mark as reviewed" }).click();
  await expect.poll(pendingCount).toBe(before - 2);
  const reviewed = await adminDb()
    .collection("activities")
    .where("reviewStatus", "==", "reviewed")
    .where("origin", "==", "ai")
    .get();
  expect(reviewed.docs.map((d) => typeof d.get("reviewedBy"))).toEqual(["string", "string"]);
  await page.goto("/admin");
  await expect(page.getByText(`${before - 2} need`)).toBeVisible();
});

test("create from a template, publish, edit a text and delete", async ({ page }) => {
  await signUp(page, { admin: true });
  const title = `E2E Quiz ${Date.now()}`;
  await createQuiz(page, title);

  // Invalid content blocks publishing.
  await page.getByRole("tab", { name: "JSON" }).click();
  const json = page.getByRole("textbox", { name: "JSON" });
  const template = await json.inputValue();
  await json.fill('{ "questions": [] }');
  await expect(page.getByText("Fix these before publishing:")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();
  await json.fill("{ not json");
  await expect(page.getByText("This isn't valid JSON yet.").first()).toBeVisible();
  await json.fill(template);
  await expect(page.getByText("Ready to publish")).toBeVisible();

  // Preview in the real player.
  await page.getByRole("button", { name: "Preview" }).click();
  const preview = page.getByRole("dialog", { name: "Preview" });
  await expect(preview.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await preview.getByRole("button", { name: "Close preview" }).click();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published: it's in the catalog now")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/edit\?id=/);

  // In the catalog index, so What's New shows it without a new build.
  await page.goto("/activities");
  await expect(
    page.getByRole("region", { name: "What's New", exact: true }).getByText(title),
  ).toBeVisible();

  // Edit an option text in the Texts tab and see it on the play page (served by /play-shell).
  await page.goto("/admin");
  await page.getByRole("link", { name: title }).click();
  await page.getByLabel("Question 1 · Option 1 · text").fill("travels");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const slug = await editor(page).getByLabel("Slug (URL)").inputValue();
  const editUrl = page.url();

  await page.goto(`/play/${slug}`);
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("button", { name: /travels/ })).toBeVisible();

  // The admin's Edit link goes back to the editor.
  await page.goto(`/play/${slug}`);
  await page.getByRole("link", { name: "Edit activity" }).click();
  await expect(page).toHaveURL(editUrl);

  // Delete needs the exact title.
  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this activity?" });
  await dialog.getByRole("textbox").fill("wrong");
  await expect(dialog.getByRole("button", { name: "Delete forever" })).toBeDisabled();
  await dialog.getByRole("textbox").fill(title);
  await dialog.getByRole("button", { name: "Delete forever" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect
    .poll(
      async () => (await adminDb().collection("activities").where("slug", "==", slug).get()).size,
    )
    .toBe(0);
});

test("a slug that's already used can't be saved", async ({ page }) => {
  await signUp(page, { admin: true });
  await createQuiz(page, "Another Quiz");
  await editor(page).getByLabel("Slug (URL)").fill("fixture-grammar-1");
  await expect(page.getByText("Slug already in use")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();
});

test("edits show on static play pages without a new build (CA11)", async ({ page }) => {
  await signUp(page, { admin: true });
  await page.goto("/admin");
  await page.getByRole("link", { name: "Fixture Grammar 6" }).click();
  await editor(page).getByLabel("Title", { exact: true }).fill("Fixture Grammar 6 (edited)");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.goto("/play/fixture-grammar-6");
  await expect(
    page.getByRole("heading", { level: 1, name: "Fixture Grammar 6 (edited)" }),
  ).toBeVisible();
});
