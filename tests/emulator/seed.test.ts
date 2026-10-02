import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { beforeAll, describe, expect, it } from "vitest";
import { prepareSeed } from "@/lib/activities/seed";
import {
  ACTIVITIES_COLLECTION,
  rebuildCatalogIndex,
  upsertActivities,
} from "@/lib/activities/seed-writer";
import { getAdminDb } from "@/lib/firebase-admin/core";
import { validQuiz } from "../unit/activities/fixtures";

const db = getAdminDb();

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Run through `npm run test:emulator`");
  await db.recursiveDelete(db.collection(ACTIVITIES_COLLECTION));
});

describe("upsertActivities", () => {
  it("creates on the first run and updates by slug on the next, keeping createdAt", async () => {
    const { activities } = prepareSeed([
      { path: "ai/grammar/quiz.json", contents: JSON.stringify(validQuiz()) },
    ]);
    const docs = activities.map((a) => a.doc);

    expect(await upsertActivities(db, docs)).toEqual({ created: 1, updated: 0, skipped: [] });
    const first = (await db.collection(ACTIVITIES_COLLECTION).get()).docs[0];

    expect(await upsertActivities(db, docs)).toEqual({ created: 0, updated: 1, skipped: [] });
    const all = await db.collection(ACTIVITIES_COLLECTION).get();

    expect(all.size).toBe(1);
    expect(all.docs[0].id).toBe(first.id);
    expect(all.docs[0].get("createdAt").isEqual(first.get("createdAt"))).toBe(true);
    expect(all.docs[0].get("origin")).toBe("ai");
  });

  it("rebuilds catalog/index with published activities only", async () => {
    const draft = { ...validQuiz(), slug: "a-draft", status: "draft" };
    const published = { ...validQuiz(), slug: "published-one", status: "published" };
    const { activities } = prepareSeed([
      { path: "a.json", contents: JSON.stringify(draft) },
      { path: "b.json", contents: JSON.stringify(published) },
    ]);
    await upsertActivities(
      db,
      activities.map((a) => a.doc),
    );

    const index = await rebuildCatalogIndex(db);

    expect(index.items.map((i) => i.slug)).toEqual(["published-one"]);
    const stored = await db.doc("catalog/index").get();
    expect(stored.get("items")).toHaveLength(1);
  });
});

describe("Firestore is the source of truth (spec: gestão completa)", () => {
  const seedFile = (overrides: Record<string, unknown> = {}) =>
    prepareSeed([
      {
        path: "ai/grammar/panel.json",
        contents: JSON.stringify({ ...validQuiz(), slug: "edited-in-panel", ...overrides }),
      },
    ]).activities.map((a) => a.doc);
  const find = async () =>
    (await db.collection(ACTIVITIES_COLLECTION).where("slug", "==", "edited-in-panel").get())
      .docs[0];

  it("the seed skips activities edited in the panel after their file (CA08)", async () => {
    await upsertActivities(db, seedFile());
    // The admin panel saves a new title.
    await (
      await find()
    ).ref.update({
      title: "Fixed in the panel",
      editedInPanelAt: FieldValue.serverTimestamp(),
    });

    expect(await upsertActivities(db, seedFile())).toEqual({
      created: 0,
      updated: 0,
      skipped: ["edited-in-panel"],
    });
    expect((await find()).get("title")).toBe("Fixed in the panel");
  });

  it("a file pulled after the panel edit is written again", async () => {
    const editedAt = ((await find()).get("editedInPanelAt") as { toDate(): Date }).toDate();
    const pulled = seedFile({
      title: "Edited in the file",
      editedInPanelAt: editedAt.toISOString(),
    });

    expect((await upsertActivities(db, pulled)).updated).toBe(1);
    expect((await find()).get("title")).toBe("Edited in the file");
  });

  it("--force overwrites the panel edit", async () => {
    await (await find()).ref.update({ editedInPanelAt: FieldValue.serverTimestamp() });

    expect((await upsertActivities(db, seedFile(), { force: true })).updated).toBe(1);
    const doc = await find();
    expect(doc.get("title")).toBe(validQuiz().title);
    expect(doc.get("editedInPanelAt")).toBeUndefined();
  });

  it("content:pull writes every activity as a valid seed file (CA09)", () => {
    const out = mkdtempSync(join(tmpdir(), "content-pull-"));
    execFileSync(
      "npx",
      ["tsx", "scripts/content-pull.ts", `--out=${relative(process.cwd(), out)}`],
      {
        env: process.env,
        stdio: "pipe",
      },
    );

    const files = readdirSync(out, { recursive: true, encoding: "utf8" }).filter((f) =>
      f.endsWith(".json"),
    );
    const plan = prepareSeed(
      files.map((f) => ({ path: f, contents: readFileSync(join(out, f), "utf8") })),
    );
    expect(plan.errors).toEqual([]);
    expect(plan.activities.map((a) => a.doc.slug).sort()).toEqual(
      ["a-draft", "edited-in-panel", "published-one", "present-perfect-quiz"].sort(),
    );
    expect(files).toContain("ai/grammar/edited-in-panel.json");
  });
});

describe("images:migrate-prompts (spec: imagens pelo painel, CA02)", () => {
  it("writes each .txt prompt into the matching image, in Firestore and in the files", async () => {
    const root = mkdtempSync(join(tmpdir(), "migrate-"));
    const prompts = join(root, "prompts");
    const content = join(root, "content");
    mkdirSync(join(prompts, "migrate-me"), { recursive: true });
    mkdirSync(join(content, "ai", "grammar"), { recursive: true });
    writeFileSync(
      join(prompts, "migrate-me", "thumb.txt"),
      "NOME DO ARQUIVO: x\n\nPROMPT (copie tudo abaixo):\nA tidy desk. Flat style.\n",
    );
    writeFileSync(join(prompts, "migrate-me", "gone.txt"), "PROMPT:\nNo image uses this.\n");
    const quiz = {
      ...validQuiz(),
      slug: "migrate-me",
      thumbnail: { src: "/images/activities/migrate-me/thumb.webp", alt: "A desk", source: "ai" },
    };
    writeFileSync(join(content, "ai", "grammar", "migrate-me.json"), JSON.stringify(quiz));
    await upsertActivities(
      db,
      prepareSeed([{ path: "ai/grammar/m.json", contents: JSON.stringify(quiz) }]).activities.map(
        (a) => a.doc,
      ),
    );

    const output = execFileSync(
      "npx",
      [
        "tsx",
        "scripts/migrate-image-prompts.ts",
        "--emulator",
        `--prompts=${relative(process.cwd(), prompts)}`,
        `--content=${relative(process.cwd(), content)}`,
      ],
      { env: process.env, encoding: "utf8" },
    );

    const stored = (
      await db.collection(ACTIVITIES_COLLECTION).where("slug", "==", "migrate-me").get()
    ).docs[0];
    expect(stored.get("thumbnail.prompt")).toBe("A tidy desk. Flat style.");
    const file = JSON.parse(
      readFileSync(join(content, "ai", "grammar", "migrate-me.json"), "utf8"),
    );
    expect(file.thumbnail.prompt).toBe("A tidy desk. Flat style.");
    expect(output).toContain("/images/activities/migrate-me/gone.webp");
  });
});

describe("images:migrate-prompts without .txt files", () => {
  it("copies the prompts already in the activity files to Firestore", async () => {
    const root = mkdtempSync(join(tmpdir(), "migrate-files-"));
    const content = join(root, "content");
    mkdirSync(join(content, "ai", "grammar"), { recursive: true });
    const quiz = {
      ...validQuiz(),
      slug: "prompt-in-file",
      thumbnail: {
        src: "/images/activities/prompt-in-file/thumb.webp",
        alt: "A desk",
        source: "ai",
      },
    };
    await upsertActivities(
      db,
      prepareSeed([{ path: "ai/grammar/p.json", contents: JSON.stringify(quiz) }]).activities.map(
        (a) => a.doc,
      ),
    );
    writeFileSync(
      join(content, "ai", "grammar", "prompt-in-file.json"),
      JSON.stringify({ ...quiz, thumbnail: { ...quiz.thumbnail, prompt: "From the file." } }),
    );

    execFileSync(
      "npx",
      [
        "tsx",
        "scripts/migrate-image-prompts.ts",
        "--emulator",
        "--prompts=does-not-exist",
        `--content=${relative(process.cwd(), content)}`,
      ],
      { env: process.env, encoding: "utf8" },
    );
    const stored = (
      await db.collection(ACTIVITIES_COLLECTION).where("slug", "==", "prompt-in-file").get()
    ).docs[0];
    expect(stored.get("thumbnail.prompt")).toBe("From the file.");
  });
});
