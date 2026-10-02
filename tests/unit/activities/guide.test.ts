import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTIVITY_TYPES } from "@/lib/activities/schema/activity";
import { validateActivity } from "@/lib/activities/validate";

// CA06 (spec: conteúdo inicial): every JSON example in the generation guide must validate, so an
// AI that follows it produces activities that pass `npm run seed:check` without structural fixes.
const guide = readFileSync(join(process.cwd(), "content/prompts/activities.md"), "utf8");

/** "### <type>" section → its first ```json block. */
function examples(): Map<string, unknown> {
  const found = new Map<string, unknown>();
  for (const section of guide.split(/\n### /).slice(1)) {
    const type = section.split("\n")[0].trim();
    const json = /```json\n([\s\S]*?)\n```/.exec(section)?.[1];
    if (json) found.set(type, JSON.parse(json));
  }
  return found;
}

describe("activity generation guide", () => {
  const byType = examples();
  const quiz = byType.get("quiz") as Record<string, unknown>;

  it("has a template for every activity type", () => {
    expect([...byType.keys()].sort()).toEqual([...ACTIVITY_TYPES].sort());
  });

  it.each(ACTIVITY_TYPES)("the %s template validates", (type) => {
    const example = byType.get(type) as Record<string, unknown>;
    // The quiz example is a whole activity; the others show only `content`.
    const activity = type === "quiz" ? example : { ...quiz, type, content: example };
    const result = validateActivity(activity);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
