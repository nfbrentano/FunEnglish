import { shuffleArray } from "./crypto-random";

/**
 * Creates balanced groups from a list of names (RF04, CA04, CA09).
 * Every student is included exactly once.
 * The difference in size between any two groups is at most 1 (|Δ| ≤ 1).
 */
export function createBalancedGroups(
  names: readonly string[],
  numGroups: number
): string[][] {
  const cleanNames = names.map((n) => n.trim()).filter(Boolean);

  if (numGroups <= 0) {
    throw new Error("Number of groups must be greater than 0");
  }

  if (numGroups > cleanNames.length) {
    throw new Error(`Not enough students for ${numGroups} groups`);
  }

  const shuffled = shuffleArray(cleanNames);
  const baseSize = Math.floor(cleanNames.length / numGroups);
  const remainder = cleanNames.length % numGroups;

  const groups: string[][] = [];
  let currentIdx = 0;

  for (let i = 0; i < numGroups; i++) {
    const size = i < remainder ? baseSize + 1 : baseSize;
    groups.push(shuffled.slice(currentIdx, currentIdx + size));
    currentIdx += size;
  }

  return groups;
}

/**
 * Divides students into groups of approximately targetSize persons (RF04).
 */
export function createGroupsBySize(
  names: readonly string[],
  targetSize: number
): string[][] {
  const cleanNames = names.map((n) => n.trim()).filter(Boolean);
  if (cleanNames.length === 0) return [];

  const safeSize = Math.max(1, targetSize);
  const numGroups = Math.max(1, Math.min(cleanNames.length, Math.round(cleanNames.length / safeSize)));

  return createBalancedGroups(cleanNames, numGroups);
}

/**
 * Formats generated groups into clean readable plain text for clipboard copying (RF05, CA04).
 */
export function formatGroupsAsText(
  groups: readonly (readonly string[])[]
): string {
  if (groups.length === 0) return "";

  return groups
    .map((group, idx) => {
      const header = `Group ${idx + 1} (${group.length}):`;
      const members = group.map((name) => `- ${name}`).join("\n");
      return `${header}\n${members}`;
    })
    .join("\n\n");
}
