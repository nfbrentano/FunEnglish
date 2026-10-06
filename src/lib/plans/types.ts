export type PlanTargetType = "student" | "class";

export type PlanItemKind = "activity" | "block";

export interface PlanItem {
  kind: PlanItemKind;
  activityId?: string; // Used when kind === "activity"
  title: string;
  minutes: number;
}

export type PlanStatus = "draft" | "used";

export interface Plan {
  id: string;
  targetType: PlanTargetType;
  classId?: string;
  studentId?: string;
  lessonId?: string;
  title: string;
  goal?: string;
  scheduledFor?: Date;
  durationMin?: number;
  items: PlanItem[];
  words: string[];
  status: PlanStatus;
  sessionId?: string;
  updatedAt: Date;
}

export interface CreatePlanInput {
  targetType: PlanTargetType;
  classId?: string;
  studentId?: string;
  lessonId?: string;
  title: string;
  goal?: string;
  scheduledFor?: Date;
  durationMin?: number;
  items: PlanItem[];
  words: string[];
  status?: PlanStatus;
  sessionId?: string;
}

/**
 * Calculates total planned minutes across all items.
 */
export function sumMinutes(items: PlanItem[]): number {
  return items.reduce((acc, item) => acc + (Number(item.minutes) || 0), 0);
}

/**
 * Compares planned minutes to scheduled lesson duration (RF03, CA02).
 */
export function calculateDurationDifference(
  planMinutes: number,
  lessonDurationMin?: number,
): { exceeds: boolean; diffMinutes: number; warning?: string } {
  if (typeof lessonDurationMin !== "number" || lessonDurationMin <= 0) {
    return { exceeds: false, diffMinutes: 0 };
  }
  const diffMinutes = planMinutes - lessonDurationMin;
  const exceeds = diffMinutes > 0;
  return {
    exceeds,
    diffMinutes,
    warning: exceeds ? `Plan is ${diffMinutes} min longer than the lesson` : undefined,
  };
}

/**
 * Pre-populates default goal and suggested words for a new plan (RF09, CA10).
 */
export function newPlanDefaults(
  lastSession?: { nextFocus?: string } | null,
  unlearnedWords?: string[],
): { goal: string; words: string[] } {
  return {
    goal: lastSession?.nextFocus?.trim() || "",
    words: (unlearnedWords || []).slice(0, 10),
  };
}
