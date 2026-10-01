import type { ActivityType } from "../activities/schema/activity";
import { STUDENT_MODE_PARAM, STUDENT_MODE_VALUE } from "../student-mode-script";

/** The link students open: the player without the site chrome, no login (spec: compartilhar). */
export function studentShareUrl(slug: string, origin: string): string {
  const url = new URL(`/play/${encodeURIComponent(slug)}`, origin);
  url.searchParams.set(STUDENT_MODE_PARAM, STUDENT_MODE_VALUE);
  return url.toString();
}

/** Types made for a whole class around one screen; sharing still works, with a heads-up (D01). */
const GROUP_TYPES: ReadonlySet<ActivityType> = new Set(["quiz-board", "prompt-cards"]);
export const isGroupActivity = (type: ActivityType) => GROUP_TYPES.has(type);
