// Version history helpers (spec: gestão completa, RF11). Pure: no Firestore here.

export const MAX_REVISIONS = 20;

/** Fields that change on every save and say nothing about the content. */
const IGNORED = new Set(["searchTokens", "createdAt", "updatedAt", "editedInPanelAt"]);

type Flat = Map<string, string>;

function flatten(value: unknown, path: string, out: Flat) {
  if (Array.isArray(value)) {
    if (value.length === 0) out.set(path, "[]");
    value.forEach((item, i) => flatten(item, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => !(path === "" && IGNORED.has(key)),
    );
    if (entries.length === 0 && path) out.set(path, "{}");
    for (const [key, child] of entries) flatten(child, path ? `${path}.${key}` : key, out);
  } else if (value !== undefined) {
    out.set(path, JSON.stringify(value));
  }
}

export type Change = { path: string; before?: string; after?: string };

/** Leaf-level differences between two versions, e.g. content.questions[2].options[0].text. */
export function diffActivities(before: unknown, after: unknown): Change[] {
  const a: Flat = new Map();
  const b: Flat = new Map();
  flatten(before, "", a);
  flatten(after, "", b);
  const changes: Change[] = [];
  for (const path of new Set([...a.keys(), ...b.keys()])) {
    if (a.get(path) !== b.get(path))
      changes.push({ path, before: a.get(path), after: b.get(path) });
  }
  return changes.sort((x, y) => x.path.localeCompare(y.path, "en", { numeric: true }));
}

/** "Created", "1 field changed", "3 fields changed", or "No changes". */
export function revisionSummary(before: unknown, after: unknown): string {
  if (before === null || before === undefined) return "Created";
  const n = diffActivities(before, after).length;
  if (n === 0) return "No changes";
  return `${n} ${n === 1 ? "field" : "fields"} changed`;
}

/** Size of a document as Firestore roughly counts it (UTF-8 JSON). */
export const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
