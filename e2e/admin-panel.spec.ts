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

// Spec: gestão completa de atividades, PR 3 (growth and management).

/** A valid quiz an AI could answer with (the guide's template, filled in). */
const aiQuiz = (slug: string) => ({
  slug,
  title: "Weather Words",
  description: "Choose the right weather word.",
  category: "vocabulary",
  type: "quiz",
  levelMin: "beginner",
  levelMax: "beginner",
  tags: ["weather"],
  status: "published",
  thumbnail: {
    src: `/images/activities/${slug}/thumb.webp`,
    alt: "A sun and a cloud",
    source: "ai",
  },
  content: {
    questions: [
      {
        prompt: "It's ___ today. Take an umbrella!",
        options: [{ text: "rainy", correct: true }, { text: "sunny" }, { text: "hot" }],
        explanation: "Rainy = with rain.",
      },
    ],
  },
});

test("Create with AI: copy the prompt, paste the answer, get a pending draft (CA07)", async ({
  page,
}) => {
  await signUp(page, { admin: true });
  await page.goto("/admin/new?category=vocabulary&level=beginner&type=flashcards&mode=ai");
  await expect(page.getByLabel("Type", { exact: true })).toHaveValue("flashcards");
  await page.getByLabel("Topic").fill("weather");
  await page.getByLabel("How many items").fill("12");
  const prompt = page.getByRole("textbox", { name: "Prompt for the AI" });
  await expect(prompt).toHaveValue(
    /\*\*flashcards\*\* activity for the \*\*vocabulary\*\* category about \*\*weather\*\*/,
  );
  await expect(prompt).toHaveValue(/Write exactly 12 cards\./);

  // An invalid answer shows errors and saves nothing.
  const answer = page.getByLabel("Paste the AI's answer (the JSON) here:");
  await answer.fill('{"slug": "broken"}');
  await page.getByRole("button", { name: "Create draft" }).first().click();
  await expect(
    page.getByRole("alert").filter({ hasText: "doesn't make a valid activity" }),
  ).toBeVisible();

  const slug = `ai-weather-${Date.now()}`;
  await answer.fill("Sure! Here it is:\n```json\n" + JSON.stringify(aiQuiz(slug)) + "\n```");
  await page.getByRole("button", { name: "Create draft" }).first().click();
  await expect(page).toHaveURL(/\/admin\/edit\?id=/);
  await expect(page.getByText("AI-generated, not reviewed yet")).toBeVisible();
  const saved = (await adminDb().collection("activities").where("slug", "==", slug).get()).docs[0];
  expect(saved.data()).toMatchObject({ status: "draft", origin: "ai", reviewStatus: "pending" });
});

test("history: restore an older version as a new one (CA10)", async ({ page }) => {
  await signUp(page, { admin: true });
  await page.goto("/admin");
  await page.getByRole("link", { name: "Fixture Grammar 3" }).click();
  const title = editor(page).getByLabel("Title", { exact: true });
  for (const version of ["v1", "v2", "v3"]) {
    await title.fill(`Fixture Grammar 3 ${version}`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Unsaved changes")).toBeHidden();
  }

  await page.getByRole("button", { name: "History" }).click();
  const dialog = page.getByRole("dialog", { name: "Version history" });
  const versions = dialog.getByRole("list", { name: "Saved versions" }).getByRole("button");
  await expect(versions).toHaveCount(3);
  await versions.last().click();
  await expect(dialog.getByText("title", { exact: true })).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await dialog.getByRole("button", { name: "Restore this version" }).click();

  await expect(title).toHaveValue("Fixture Grammar 3 v1");
  const doc = (
    await adminDb().collection("activities").where("slug", "==", "fixture-grammar-3").get()
  ).docs[0];
  expect(doc.get("title")).toBe("Fixture Grammar 3 v1");
  const history = await doc.ref.collection("revisions").orderBy("savedAt", "desc").get();
  expect(history.size).toBe(4);
  expect(history.docs[0].get("summary")).toMatch(/^Restored from /);
});

test("bulk publish: 5 drafts at once, one catalog rebuild (CA12)", async ({ page }) => {
  const db = adminDb();
  const run = Date.now();
  for (let i = 1; i <= 5; i++) {
    const slug = `bulk-${run}-${i}`;
    await db.collection("activities").add({
      ...aiQuiz(slug),
      title: `Bulk ${run} ${i}`,
      status: "draft",
      origin: "human",
      reviewStatus: "reviewed",
      searchTokens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await signUp(page, { admin: true });
  await page.goto(`/admin?q=${run}`);
  await expect(page.getByRole("link", { name: new RegExp(`^Bulk ${run}`) })).toHaveCount(5);

  const catalogWrites: string[] = [];
  page.on("request", (r) => {
    if (
      r.url().includes(":commit") &&
      decodeURIComponent(r.postData() ?? "").includes("catalog/index")
    )
      catalogWrites.push(r.url());
  });
  await page
    .getByRole("checkbox", { name: "Select all 5 activities shown by the filters" })
    .check();
  const bar = page.getByRole("toolbar", { name: "Bulk actions" });
  await expect(bar.getByText("5 selected")).toBeVisible();
  await bar.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Done: 5 activities updated")).toBeVisible();

  const published = await db.collection("activities").where("status", "==", "published").get();
  expect(
    published.docs.filter((d) => String(d.get("slug")).startsWith(`bulk-${run}`)),
  ).toHaveLength(5);
  const index = await db.doc("catalog/index").get();
  expect(
    (index.get("items") as { slug: string }[]).filter((i) => i.slug.startsWith(`bulk-${run}`)),
  ).toHaveLength(5);
  expect(catalogWrites).toHaveLength(1);

  // Bulk delete asks for the number.
  await page
    .getByRole("checkbox", { name: "Select all 5 activities shown by the filters" })
    .check();
  await bar.getByRole("button", { name: "Delete", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Delete 5 activities?" });
  await confirm.getByRole("textbox").fill("4");
  await expect(confirm.getByRole("button", { name: "Delete forever" })).toBeDisabled();
  await confirm.getByRole("textbox").fill("5");
  await confirm.getByRole("button", { name: "Delete forever" }).click();
  await expect(page.getByText("5 activities deleted")).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          await db
            .collection("activities")
            .where("slug", ">=", `bulk-${run}`)
            .where("slug", "<", `bulk-${run}~`)
            .get()
        ).size,
    )
    .toBe(0);
});

test("missing images: badge in the list and prompts to copy (CA13, CA15)", async ({ page }) => {
  await signUp(page, { admin: true });
  await page.goto("/admin?q=fixture grammar 1");
  // Fixture thumbnails aren't in public/images.
  await expect(
    page.getByRole("row", { name: /Fixture Grammar 1/ }).getByText("Missing image"),
  ).toBeVisible();

  await page.goto("/admin/images");
  const item = page.getByRole("listitem").filter({ hasText: "fixture-grammar-1--thumb.png" });
  await expect(item).toBeVisible();
  await expect(item).toContainText("Thumbnail of Fixture Grammar 1. Flat vector illustration");
});

test("coverage: gaps are highlighted and lead to Create with AI (CA14)", async ({ page }) => {
  await signUp(page, { admin: true });
  await page.goto("/admin/coverage");
  const byLevel = page.getByRole("region", { name: "By level" });
  const cell = byLevel.getByRole("link", { name: /^Create a Advanced activity for Listening/ });
  await expect(cell).toBeVisible();
  await cell.click();
  await expect(page).toHaveURL(/\/admin\/new\?category=listening&level=advanced&mode=ai/);
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue("listening");
  await expect(page.getByLabel("Level", { exact: true })).toHaveValue("advanced");
  await expect(page.getByLabel("Topic")).toBeFocused();
});

test("an activity over 200 KB isn't saved (CA17)", async ({ page }) => {
  await signUp(page, { admin: true });
  await createQuiz(page, `Huge ${Date.now()}`);
  await page.getByRole("tab", { name: "JSON" }).click();
  const huge = {
    questions: Array.from({ length: 100 }, (_, i) => ({
      prompt: `Q${i} ${"x".repeat(2500)}`,
      options: [{ text: "a", correct: true }, { text: "b" }],
    })),
  };
  await page.getByRole("textbox", { name: "JSON" }).fill(JSON.stringify(huge));
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/This activity is too large \(\d+ KB; max 200 KB\)\./)).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/edit$/);
});

// Spec: imagens pelo painel. GitHub is faked: nothing leaves the test machine.

/** A fake api.github.com; `canWrite: false` makes the token read-only. */
async function fakeGitHub(page: Page, { canWrite = true } = {}) {
  const calls: { method: string; path: string; body: unknown; auth: string | null }[] = [];
  await page.route("https://api.github.com/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? JSON.parse(request.postData()!) : undefined;
    calls.push({
      method: request.method(),
      path,
      body,
      auth: request.headers()["authorization"] ?? null,
    });
    // The page (localhost) calls api.github.com: answer like GitHub does, with CORS headers.
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-GitHub-Api-Version, Accept",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    };
    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/user") return json({ login: "nfbrentano" });
    if (path.endsWith("/git/blobs"))
      return canWrite
        ? json({ sha: `blob${calls.length}` }, 201)
        : json({ message: "Resource not accessible" }, 403);
    if (path.endsWith("/git/ref/heads/main")) return json({ object: { sha: "p" } });
    if (path.endsWith("/git/commits/p")) return json({ tree: { sha: "t" } });
    if (path.endsWith("/git/trees")) return json({ sha: "t2" }, 201);
    if (path.endsWith("/git/commits"))
      return json({ sha: "c", html_url: "https://github.com/c" }, 201);
    if (path.endsWith("/git/refs/heads/main")) return json({});
    return json({ message: "Not Found" }, 404);
  });
  return calls;
}

/** A tiny real PNG (the upload is processed in the browser). */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("connect GitHub: a token without write access is refused, a good one is kept only here (CA06, CA07)", async ({
  page,
  context,
}) => {
  await signUp(page, { admin: true });
  let calls = await fakeGitHub(page, { canWrite: false });
  await page.goto("/admin/settings");
  await page.getByLabel("GitHub token").fill("github_pat_readonly");
  await page.getByRole("button", { name: "Connect" }).click();
  await expect(page.locator("#github-error")).toHaveText(
    /This token can't write to nfbrentano\/FunEnglish/,
  );
  expect(await page.evaluate(() => localStorage.getItem("fun-english:github-token"))).toBeNull();

  await page.unroute("https://api.github.com/**");
  calls = await fakeGitHub(page);
  const elsewhere: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("https://api.github.com/") &&
      `${r.url()} ${r.postData() ?? ""}`.includes("github_pat_secret")
    )
      elsewhere.push(r.url());
  });
  await page.getByLabel("GitHub token").fill("github_pat_secret");
  await page.getByRole("button", { name: "Connect" }).click();
  await expect(page.getByText("Connected as nfbrentano")).toBeVisible();
  await expect(page.getByLabel("GitHub token")).toHaveCount(0);
  expect(calls.every((c) => c.auth === "Bearer github_pat_secret")).toBe(true);

  // Only in this browser: not in Firestore, not in other requests, not in another browser.
  const everything = JSON.stringify(
    await Promise.all(
      ["users", "activities", "catalog"].map(async (c) =>
        (await adminDb().collection(c).get()).docs.map((d) => d.data()),
      ),
    ),
  );
  expect(everything).not.toContain("github_pat_secret");
  expect(elsewhere).toEqual([]);
  const other = await context.browser()!.newPage();
  expect(
    await other.evaluate(() => localStorage.getItem("fun-english:github-token")).catch(() => null),
  ).toBeNull();
  await other.close();
});

test("upload an image from the editor: one commit, src filled, live after the deploy (CA04)", async ({
  page,
}) => {
  await signUp(page, { admin: true });
  const calls = await fakeGitHub(page);
  await page.addInitScript(() =>
    localStorage.setItem("fun-english:github-token", "github_pat_e2e"),
  );
  await page.goto("/admin");
  await page.getByRole("link", { name: "Fixture Grammar 2" }).click();
  const thumb = page.getByRole("group", { name: "Thumbnail (card image, 16:10)" });

  await thumb.getByRole("button", { name: "Write prompt from alt" }).click();
  await expect(thumb.getByLabel("Image prompt")).toHaveValue(
    /^Thumbnail of Fixture Grammar 2\. Flat vector illustration/,
  );

  await thumb.getByLabel("Choose an image file").setInputFiles({
    name: "thumb.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(
    thumb.getByText("Uploaded. It goes live after the next deploy (~3 min)."),
  ).toBeVisible();
  const tree = calls.find((c) => c.path.endsWith("/git/trees"))!.body as {
    tree: { path: string }[];
  };
  expect(tree.tree.map((t) => t.path)).toEqual([
    "public/images/activities/fixture-grammar-2/thumb.webp",
  ]);
  expect(
    calls.find((c) => c.path.endsWith("/git/commits") && c.method === "POST")!.body,
  ).toMatchObject({
    message: "content(images): fixture-grammar-2/thumb.webp (via admin panel)",
  });
  await expect(thumb.getByLabel("Thumbnail path or URL")).toHaveValue(
    /^\/images\/activities\/fixture-grammar-2\/thumb\.webp\?v=[0-9a-f]{8}$/,
  );

  // The prompt is saved with the activity.
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const doc = (
    await adminDb().collection("activities").where("slug", "==", "fixture-grammar-2").get()
  ).docs[0];
  expect(doc.get("thumbnail.prompt")).toMatch(/^Thumbnail of Fixture Grammar 2\./);
});

test("missing images: the saved prompt, and several uploads in one commit (CA05, CA08)", async ({
  page,
}) => {
  const db = adminDb();
  const slug = `upload-many-${Date.now()}`;
  await db.collection("activities").add({
    ...aiQuiz(slug),
    status: "draft",
    featured: false,
    origin: "human",
    reviewStatus: "reviewed",
    thumbnail: {
      src: `/images/activities/${slug}/thumb.webp`,
      alt: "A desk",
      source: "ai",
      prompt: "My own saved prompt for the desk.",
    },
    content: {
      questions: [
        {
          prompt: "Look.",
          media: {
            kind: "image",
            src: `/images/activities/${slug}/lamp.webp`,
            alt: "A lamp",
            source: "ai",
          },
          options: [{ text: "a", correct: true }, { text: "b" }],
        },
      ],
    },
    searchTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await signUp(page, { admin: true });
  const calls = await fakeGitHub(page);
  await page.addInitScript(() =>
    localStorage.setItem("fun-english:github-token", "github_pat_e2e"),
  );
  await page.goto("/admin/images");
  const thumbItem = page.getByRole("listitem").filter({ hasText: `${slug}--thumb.png` });
  await expect(thumbItem).toContainText("My own saved prompt for the desk.");
  await expect(page.getByRole("listitem").filter({ hasText: `${slug}--lamp.png` })).toContainText(
    "A lamp. Flat vector illustration",
  );

  await page.getByLabel("Upload several", { exact: true }).setInputFiles([
    { name: `${slug}--thumb.png`, mimeType: "image/png", buffer: PNG },
    { name: `${slug}--lamp.png`, mimeType: "image/png", buffer: PNG },
    { name: "not-in-the-list.png", mimeType: "image/png", buffer: PNG },
  ]);
  await expect(page.getByText("Skipped (name not in the list): not-in-the-list.png")).toBeVisible();
  await expect(
    page.getByText("Uploaded. It goes live after the next deploy (~3 min).").first(),
  ).toBeVisible();
  expect(calls.filter((c) => c.path.endsWith("/git/commits") && c.method === "POST")).toHaveLength(
    1,
  );
  const tree = calls.find((c) => c.path.endsWith("/git/trees"))!.body as {
    tree: { path: string }[];
  };
  expect(tree.tree.map((t) => t.path).sort()).toEqual([
    `public/images/activities/${slug}/lamp.webp`,
    `public/images/activities/${slug}/thumb.webp`,
  ]);
});

// Spec: mais imagens nas atividades, PR 2 (planning pictures).

test("Plan images: a picture for every question, then listed in Missing images (CA06)", async ({
  page,
}) => {
  await signUp(page, { admin: true });
  await page.goto("/admin");
  await page.getByRole("link", { name: "Fixture Grammar 4" }).click();
  await expect(editor(page).getByLabel("Title", { exact: true })).toHaveValue("Fixture Grammar 4");
  await page.getByRole("button", { name: "Plan images" }).click();
  const dialog = page.getByRole("dialog", { name: "Plan a picture for every item" });
  await expect(dialog.getByText("1 picture to plan")).toBeVisible();
  await dialog.getByLabel("Also picture answers (an image for every option)").check();
  await expect(dialog.getByText("3 pictures to plan")).toBeVisible();
  await dialog.getByRole("button", { name: "Plan 3 pictures" }).click();
  await expect(
    page.getByText("3 pictures planned. Review the descriptions and save."),
  ).toBeVisible();

  const form = page.getByRole("tabpanel", { name: "Form" });
  await expect(form.getByLabel("Image description (alt)").first()).not.toHaveValue("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  const doc = (
    await adminDb().collection("activities").where("slug", "==", "fixture-grammar-4").get()
  ).docs[0];
  const question = doc.get("content.questions")[0];
  expect(question.media).toMatchObject({
    kind: "image",
    src: "/images/activities/fixture-grammar-4/question-1.webp",
  });
  expect(question.media.prompt).toMatch(/Flat vector illustration/);
  expect(question.options[0].image.src).toBe(
    "/images/activities/fixture-grammar-4/question-1-option-1.webp",
  );

  await page.goto("/admin/images");
  await expect(page.getByText("fixture-grammar-4--question-1.png")).toBeVisible();
  await expect(page.getByText("fixture-grammar-4--question-1-option-2.png")).toBeVisible();
});

test("Create with AI asks for pictures and plans the ones the AI describes (CA07)", async ({
  page,
}) => {
  await signUp(page, { admin: true });
  await page.goto("/admin/new?type=quiz&category=vocabulary&level=beginner");
  await expect(page.getByRole("textbox", { name: "Prompt for the AI" })).toHaveValue(
    /Give every question a picture: "media": \{"kind": "image", "alt": "what the picture shows"\}/,
  );
  const slug = `ai-pictures-${Date.now()}`;
  const answer = {
    ...aiQuiz(slug),
    thumbnail: { alt: "A sun and a cloud" },
    content: {
      questions: [
        {
          prompt: "It's ___ today. Take an umbrella!",
          media: { kind: "image", alt: "Rain falling on a city street" },
          options: [{ text: "rainy", correct: true }, { text: "sunny" }],
        },
      ],
    },
  };
  await page.getByLabel("Paste the AI's answer (the JSON) here:").fill(JSON.stringify(answer));
  await page.getByRole("button", { name: "Create draft" }).first().click();
  await expect(page).toHaveURL(/\/admin\/edit\?id=/);
  const doc = (await adminDb().collection("activities").where("slug", "==", slug).get()).docs[0];
  expect(doc.get("thumbnail")).toMatchObject({
    src: `/images/activities/${slug}/thumb.webp`,
    source: "ai",
  });
  expect(doc.get("content.questions")[0].media).toMatchObject({
    src: `/images/activities/${slug}/question-1.webp`,
    alt: "Rain falling on a city street",
    prompt: expect.stringMatching(/^Rain falling on a city street\. Flat vector illustration/),
  });
});

test("coverage shows pictures per activity and the list filters the ones with few (CA08)", async ({
  page,
}) => {
  await signUp(page, { admin: true });
  await page.goto("/admin/coverage");
  const pictures = page.getByRole("region", { name: "Pictures per activity" });
  const row = pictures.getByRole("row", { name: /Fixture Grammar 1/ });
  await expect(row).toContainText("0%");
  // Intermediate–Advanced: the target goes by the lowest level, 80%.
  await expect(row).toContainText("(below the 80% target)");

  await page.goto("/admin?images=few&q=fixture grammar 1");
  await expect(page.getByLabel("Few images")).toBeChecked();
  await expect(page.getByRole("link", { name: "Fixture Grammar 1" })).toBeVisible();
});
