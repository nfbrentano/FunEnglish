import type { z } from "zod";
import { activityInputSchema, type ActivityInput } from "./schema/activity";

/** Firestore documents max out at 1 MiB; we keep activities well below that. */
export const MAX_ACTIVITY_BYTES = 200 * 1024;

export type ValidationResult =
  { ok: true; activity: ActivityInput } | { ok: false; errors: string[] };

/** "questions", 2, "options" → "questions[2].options" */
export function formatIssuePath(path: readonly PropertyKey[]): string {
  return path
    .map((segment, i) =>
      typeof segment === "number" ? `[${segment}]` : `${i === 0 ? "" : "."}${String(segment)}`,
    )
    .join("");
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = formatIssuePath(issue.path);
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export function validateActivity(raw: unknown): ValidationResult {
  const size = new TextEncoder().encode(JSON.stringify(raw)).length;
  if (size > MAX_ACTIVITY_BYTES) {
    return {
      ok: false,
      errors: [
        `Activity is ${Math.ceil(size / 1024)} KB; the limit is ${MAX_ACTIVITY_BYTES / 1024} KB`,
      ],
    };
  }

  const result = activityInputSchema.safeParse(raw);
  return result.success
    ? { ok: true, activity: result.data }
    : { ok: false, errors: formatIssues(result.error) };
}
