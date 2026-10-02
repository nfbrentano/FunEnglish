import type { ActivityInput, ActivityServerFields } from "./schema/activity";
import { buildSearchTokens } from "./search";
import { validateActivity } from "./validate";

export type SeedFile = {
  /** Path relative to content/activities, e.g. "ai/grammar/some-or-any.json". */
  path: string;
  contents: string;
};

export type SeedDoc = ActivityInput & Omit<ActivityServerFields<never>, "createdAt" | "updatedAt">;

export type SeedPlan = {
  activities: { path: string; doc: SeedDoc }[];
  errors: { path: string; messages: string[] }[];
};

/** Files under an "ai" folder are AI-generated and start pending review (spec: conteúdo inicial gerado por IA). */
function isAiGenerated(path: string): boolean {
  return path.split(/[\\/]/).includes("ai");
}

/** Parses and validates every file. Invalid files are reported and left out; valid ones are ready to upsert. */
export function prepareSeed(files: readonly SeedFile[]): SeedPlan {
  const plan: SeedPlan = { activities: [], errors: [] };
  const slugOwners = new Map<string, string>();

  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(file.contents);
    } catch (error) {
      plan.errors.push({
        path: file.path,
        messages: [`Invalid JSON: ${(error as Error).message}`],
      });
      continue;
    }

    const result = validateActivity(raw);
    if (!result.ok) {
      plan.errors.push({ path: file.path, messages: result.errors });
      continue;
    }

    const activity = result.activity;
    const owner = slugOwners.get(activity.slug);
    if (owner) {
      plan.errors.push({
        path: file.path,
        messages: [`slug: "${activity.slug}" is already used by ${owner}`],
      });
      continue;
    }
    slugOwners.set(activity.slug, file.path);

    const origin = activity.origin ?? (isAiGenerated(file.path) ? "ai" : "human");
    plan.activities.push({
      path: file.path,
      doc: {
        ...activity,
        origin,
        reviewStatus: activity.reviewStatus ?? (origin === "ai" ? "pending" : "reviewed"),
        searchTokens: buildSearchTokens(activity.title, activity.tags),
      },
    });
  }

  return plan;
}

export type SeedDecision = "write" | "skip";

/**
 * Firestore is the source of truth (spec: gestão completa, RF09). An activity edited in the admin
 * panel after the file's `editedInPanelAt` (set by `npm run content:pull`) is kept, unless forced.
 */
export function seedDecision(
  editedInPanelAt: Date | null,
  fileEditedInPanelAt: string | undefined,
  force = false,
): SeedDecision {
  if (force || !editedInPanelAt) return "write";
  const fileTime = fileEditedInPanelAt ? Date.parse(fileEditedInPanelAt) : Number.NaN;
  return Number.isNaN(fileTime) || editedInPanelAt.getTime() > fileTime ? "skip" : "write";
}
