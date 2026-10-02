// Coverage of the collection (spec: gestão completa, RF15): where activities are missing.
import { CATEGORY_IDS, type CategoryId } from "../activities/categories";
import { LEVELS, levelInRange, type Level } from "../activities/levels";
import { ACTIVITY_TYPES, type ActivityType } from "../activities/schema/activity";

export const LOW_COVERAGE = 3;

export type Cell = { published: number; drafts: number };
type Item = {
  category: CategoryId;
  type: ActivityType;
  levelMin: Level;
  levelMax: Level;
  status: "draft" | "published";
};

const empty = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, { published: 0, drafts: 0 }])) as Record<K, Cell>;

export function computeCoverage(items: readonly Item[]) {
  const byLevel = Object.fromEntries(CATEGORY_IDS.map((c) => [c, empty(LEVELS)])) as Record<
    CategoryId,
    Record<Level, Cell>
  >;
  const byType = Object.fromEntries(CATEGORY_IDS.map((c) => [c, empty(ACTIVITY_TYPES)])) as Record<
    CategoryId,
    Record<ActivityType, Cell>
  >;
  for (const item of items) {
    const key = item.status === "published" ? "published" : "drafts";
    // An activity for Beginner–Advanced counts in every level it covers.
    for (const level of LEVELS)
      if (levelInRange(level, item.levelMin, item.levelMax)) byLevel[item.category][level][key]++;
    byType[item.category][item.type][key]++;
  }
  return { byLevel, byType };
}

/** Fewer than 3 published: a gap worth filling. */
export const isLow = (cell: Cell) => cell.published < LOW_COVERAGE;
