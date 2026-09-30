export const LEVELS = ["beginner", "intermediate", "advanced"] as const;

export type Level = (typeof LEVELS)[number];

const SHORT_LABELS: Record<Level, string> = {
  beginner: "Beg",
  intermediate: "Inter",
  advanced: "Adv",
};

/** Card label for a level range: "Beg", "Beg–Inter", "Inter–Adv", "All levels"… */
export function levelLabel(min: Level, max: Level): string {
  const from = LEVELS.indexOf(min);
  const to = LEVELS.indexOf(max);
  if (from > to) throw new RangeError(`levelMin (${min}) is above levelMax (${max})`);

  if (from === 0 && to === LEVELS.length - 1) return "All levels";
  if (from === to) return SHORT_LABELS[min];
  return `${SHORT_LABELS[min]}–${SHORT_LABELS[max]}`;
}

/** Whether an activity spanning min..max suits a class at `level`. */
export function levelInRange(level: Level, min: Level, max: Level): boolean {
  const i = LEVELS.indexOf(level);
  return i >= LEVELS.indexOf(min) && i <= LEVELS.indexOf(max);
}
