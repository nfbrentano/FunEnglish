import { levelLabel, type Level } from "@/lib/activities/levels";

export function LevelPill({ min, max }: { min: Level; max: Level }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-strong px-2 py-0.5 text-xs text-fg-secondary">
      {levelLabel(min, max)}
    </span>
  );
}
