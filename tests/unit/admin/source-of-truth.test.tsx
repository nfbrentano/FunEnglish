import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { seedPathFor, toSeedJson } from "@/lib/activities/export";
import { seedDecision } from "@/lib/activities/seed";
import { validateActivity } from "@/lib/activities/validate";
import { clearLocalDraft, readLocalDraft, writeLocalDraft } from "@/lib/admin/local-draft";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { validQuiz } from "../activities/fixtures";

describe("seedDecision (RF09)", () => {
  const edited = new Date("2026-10-01T12:00:00Z");

  it("writes activities never edited in the panel", () => {
    expect(seedDecision(null, undefined)).toBe("write");
  });

  it("skips a panel edit newer than the file (or a file that never saw it)", () => {
    expect(seedDecision(edited, undefined)).toBe("skip");
    expect(seedDecision(edited, "2026-09-30T00:00:00.000Z")).toBe("skip");
  });

  it("writes a file pulled at or after the edit, and anything with force", () => {
    expect(seedDecision(edited, "2026-10-01T12:00:00.000Z")).toBe("write");
    expect(seedDecision(edited, undefined, true)).toBe("write");
  });
});

describe("toSeedJson (RF10)", () => {
  const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });

  it("drops server fields, turns timestamps into ISO strings and keeps the file key order", () => {
    const json = toSeedJson({
      content: validQuiz().content,
      searchTokens: ["x"],
      createdAt: timestamp("2026-09-30T10:00:00.000Z"),
      updatedAt: timestamp("2026-10-01T10:00:00.000Z"),
      schemaVersion: 1,
      editedInPanelAt: timestamp("2026-10-01T10:00:00.000Z"),
      origin: "ai",
      ...validQuiz(),
    });
    expect(Object.keys(json)).not.toContain("searchTokens");
    expect(Object.keys(json)).not.toContain("createdAt");
    expect(Object.keys(json).slice(0, 3)).toEqual(["slug", "title", "description"]);
    expect(Object.keys(json).at(-1)).toBe("content");
    expect(json.editedInPanelAt).toBe("2026-10-01T10:00:00.000Z");
    expect(validateActivity(json).ok).toBe(true);
  });

  it("puts AI content under ai/ and the rest under human/", () => {
    expect(seedPathFor({ origin: "ai", category: "grammar", slug: "some-or-any" })).toBe(
      "ai/grammar/some-or-any.json",
    );
    expect(seedPathFor({ origin: "human", category: "fun", slug: "x" })).toBe("human/fun/x.json");
  });
});

describe("local draft (RF12)", () => {
  afterEach(() => localStorage.clear());

  it("keeps one draft per activity until cleared", () => {
    writeLocalDraft("a1", { title: "Mine" }, new Date("2026-10-01T10:00:00Z"));
    writeLocalDraft(null, { title: "New one" });
    expect(readLocalDraft("a1")).toEqual({
      savedAt: "2026-10-01T10:00:00.000Z",
      draft: { title: "Mine" },
    });
    expect(readLocalDraft<{ title: string }>(null)?.draft.title).toBe("New one");
    clearLocalDraft("a1");
    expect(readLocalDraft("a1")).toBeNull();
  });

  it("doesn't throw when storage is blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(() => writeLocalDraft("a1", {})).not.toThrow();
    spy.mockRestore();
  });
});

function Guarded({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty, "Leave without saving?");
  return (
    <a
      href="/admin"
      onClick={(event) => {
        event.preventDefault();
        (window as unknown as { navigated: boolean }).navigated = true;
      }}
    >
      Back
    </a>
  );
}

describe("useUnsavedChanges (RF12)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { navigated?: boolean }).navigated;
  });

  it("asks before following a link with unsaved changes, and stays if cancelled", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Guarded dirty />);
    await userEvent.click(screen.getByRole("link", { name: "Back" }));
    expect(confirm).toHaveBeenCalledWith("Leave without saving?");
    expect((window as unknown as { navigated?: boolean }).navigated).toBeUndefined();
  });

  it("lets links through without unsaved changes", async () => {
    const confirm = vi.spyOn(window, "confirm");
    render(<Guarded dirty={false} />);
    await userEvent.click(screen.getByRole("link", { name: "Back" }));
    expect(confirm).not.toHaveBeenCalled();
    expect((window as unknown as { navigated?: boolean }).navigated).toBe(true);
  });

  it("asks the browser to confirm closing the tab", () => {
    render(<Guarded dirty />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
