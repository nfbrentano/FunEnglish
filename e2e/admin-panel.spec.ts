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
  await page.getByRole("tab", { name: "Texts" }).click();
  await page.getByLabel("Question 1 · Option 1 · text").fill("travels");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const slug = await editor(page).getByLabel("Slug (URL)").inputValue();
  const editUrl = page.url();

  await page.goto(`/play/${slug}`);
  await page.getByRole("button", { name: "Start", exact: true }).click();
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
  // Next to the field and in the error summary.
  await expect(editor(page).getByText("Slug already in use")).toBeVisible();
  await expect(page.getByRole("button", { name: "Slug (URL): Slug already in use" })).toBeVisible();
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

// Spec: gestão completa de atividades (RF09, RF10, RF12).

test("saving in two tabs warns about the conflict instead of overwriting (CA11)", async ({
  page,
  context,
}) => {
  await signUp(page, { admin: true });
  await page.goto("/admin");
  await page.getByRole("link", { name: "Fixture Grammar 5" }).click();
  await expect(editor(page).getByLabel("Title", { exact: true })).toHaveValue("Fixture Grammar 5");
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(editor(other).getByLabel("Title", { exact: true })).toHaveValue("Fixture Grammar 5");

  // Tab A saves first.
  await editor(page).getByLabel("Title", { exact: true }).fill("Fixture Grammar 5 (tab A)");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // Tab B, opened before that save, is stopped.
  await editor(other).getByLabel("Title", { exact: true }).fill("Fixture Grammar 5 (tab B)");
  await other.getByRole("button", { name: "Save changes" }).click();
  const dialog = other.getByRole("dialog", {
    name: "Someone saved this activity after you opened it",
  });
  await expect(dialog).toBeVisible();
  const title = async () =>
    (
      await adminDb().collection("activities").where("slug", "==", "fixture-grammar-5").get()
    ).docs[0].get("title");
  expect(await title()).toBe("Fixture Grammar 5 (tab A)");

  await dialog.getByRole("button", { name: "Reload their version" }).click();
  await expect(editor(other).getByLabel("Title", { exact: true })).toHaveValue(
    "Fixture Grammar 5 (tab A)",
  );

  // Overwrite is a deliberate choice.
  await editor(page).getByLabel("Title", { exact: true }).fill("Fixture Grammar 5 (A again)");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await editor(other).getByLabel("Title", { exact: true }).fill("Fixture Grammar 5 (B wins)");
  await other.getByRole("button", { name: "Save changes" }).click();
  await dialog.getByRole("button", { name: "Overwrite" }).click();
  await expect.poll(title).toBe("Fixture Grammar 5 (B wins)");
  expect(
    (
      await adminDb().collection("activities").where("slug", "==", "fixture-grammar-5").get()
    ).docs[0].get("editedInPanelAt"),
  ).toBeTruthy();
});

test("unsaved changes: a warning before leaving and a draft kept on this device", async ({
  page,
}) => {
  await signUp(page, { admin: true });
  await page.goto("/admin");
  await page.getByRole("link", { name: "Fixture Grammar 4" }).click();
  await editor(page).getByLabel("Description", { exact: true }).fill("Not saved yet.");
  await expect(page.getByText("Unsaved changes")).toBeVisible();

  // An in-app link asks first; cancelling stays on the editor.
  page.once("dialog", (d) => {
    expect(d.message()).toBe("You have unsaved changes. Leave without saving?");
    void d.dismiss();
  });
  await page.getByRole("link", { name: "All activities" }).click();
  await expect(page).toHaveURL(/\/admin\/edit\?id=/);

  // The draft survives a reload (once it has been kept, after ~1 s).
  await page.waitForTimeout(1300);
  page.once("dialog", (d) => void d.accept());
  await page.reload();
  await expect(page.getByText(/You have unsaved changes from .* on this device\./)).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(editor(page).getByLabel("Description", { exact: true })).toHaveValue(
    "Not saved yet.",
  );
});

test("Export all downloads every activity in the seed file format (RF10)", async ({ page }) => {
  await signUp(page, { admin: true });
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "Fixture Grammar 1" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^fun-english-activities-\d{4}-\d{2}-\d{2}\.json$/);
  const all = JSON.parse(
    await new Promise<string>((resolve, reject) => {
      void file.createReadStream().then((stream) => {
        let text = "";
        stream.on("data", (chunk) => (text += chunk));
        stream.on("end", () => resolve(text));
        stream.on("error", reject);
      });
    }),
  ) as Record<string, unknown>[];
  const total = (await adminDb().collection("activities").get()).size;
  expect(all).toHaveLength(total);
  expect(all.find((a) => a.slug === "fixture-grammar-1")).toMatchObject({
    title: "Fixture Grammar 1",
    type: "quiz",
  });
  expect(Object.keys(all[0])).not.toContain("searchTokens");
});

// Spec: gestão completa de atividades, PR 2 (structured editors).

test("a quiz built in the form, without JSON, publishes and plays (CA01, CA02, CA06)", async ({
  page,
}) => {
  await signUp(page, { admin: true });
  const title = `Form Quiz ${Date.now()}`;
  await createQuiz(page, title);
  const form = page.getByRole("tabpanel", { name: "Form" });

  // Three new questions with four options each; then drop the template's question.
  for (let q = 2; q <= 4; q++) {
    await form.getByRole("button", { name: "Add question" }).click();
    const question = form
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: `Question ${q}` }) });
    await question.getByLabel("Question", { exact: true }).fill(`Question number ${q - 1}?`);
    await question.getByRole("button", { name: "Add option" }).click();
    for (let o = 1; o <= 4; o++) {
      await question
        .getByRole("textbox", { name: `Option ${o} of question ${q}`, exact: true })
        .fill(`answer ${q - 1}${o}`);
    }
  }
  await form.getByRole("button", { name: "Remove Question 1" }).click();

  // New questions start with option 1 correct; pick another one for question 2.
  const second = form
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Question 2" }) });
  await second.getByRole("radio", { name: "Option 3 is correct (question 2)" }).check();
  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
  await page.getByRole("tab", { name: "JSON" }).click();
  await expect(page.getByRole("textbox", { name: "JSON" })).toContainText(
    '"text": "answer 23",\n          "correct": true',
  );
  await page.getByRole("tab", { name: "Form" }).click();

  // Live preview follows the form (CA06).
  const preview = page.getByRole("region", { name: "Live preview" });
  await expect(preview.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await preview.getByRole("button", { name: "Phone" }).click();
  await expect(page.getByTestId("live-preview-frame")).toHaveJSProperty("offsetWidth", 375);

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published: it's in the catalog now")).toBeVisible();
  const slug = await editor(page).getByLabel("Slug (URL)").inputValue();

  await page.goto(`/play/${slug}`);
  await page.getByLabel("Shuffle questions").uncheck();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByText("1 / 3")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Question number 1?" })).toBeVisible();
  await page.getByRole("button", { name: "answer 11", exact: true }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("the error summary takes you to the field (CA02)", async ({ page }) => {
  await signUp(page, { admin: true });
  await createQuiz(page, `Errors ${Date.now()}`);
  const form = page.getByRole("tabpanel", { name: "Form" });
  await form.getByRole("textbox", { name: "Option 1 of question 1", exact: true }).fill("");
  await page.getByRole("button", { name: /Question 1 · Option 1 · text: Required/ }).click();
  await expect(
    form.getByRole("textbox", { name: "Option 1 of question 1", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();
});
