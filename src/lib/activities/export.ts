// Firestore activity → the JSON file format of content/activities (what the seed reads).
// Shared by `npm run content:pull` (Admin SDK) and the panel's "Export all" (spec: gestão completa, RF10).

/** Fields the seed or the panel compute; they don't belong in the files. */
const SERVER_FIELDS = new Set(["searchTokens", "createdAt", "updatedAt", "schemaVersion"]);

/** Same order as the hand-written files, so `git diff` stays readable. */
const KEY_ORDER = [
  "slug",
  "title",
  "description",
  "category",
  "type",
  "levelMin",
  "levelMax",
  "tags",
  "status",
  "featured",
  "origin",
  "reviewStatus",
  "reviewedAt",
  "reviewedBy",
  "editedInPanelAt",
  "thumbnail",
  "content",
];

type TimestampLike = { toDate(): Date };
const isTimestamp = (value: unknown): value is TimestampLike =>
  typeof (value as TimestampLike | null)?.toDate === "function";

export function toSeedJson(data: Record<string, unknown>): Record<string, unknown> {
  const plain = Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !SERVER_FIELDS.has(key))
      .map(([key, value]) => [
        key,
        isTimestamp(value)
          ? value.toDate().toISOString()
          : value instanceof Date
            ? value.toISOString()
            : value,
      ]),
  );
  const ordered: Record<string, unknown> = {};
  for (const key of KEY_ORDER) if (key in plain) ordered[key] = plain[key];
  for (const [key, value] of Object.entries(plain)) if (!(key in ordered)) ordered[key] = value;
  return ordered;
}

/** "ai/grammar/some-or-any.json": the `ai/` folder marks AI-generated content. */
export function seedPathFor(activity: Record<string, unknown>) {
  const folder = activity.origin === "ai" ? "ai" : "human";
  return `${folder}/${String(activity.category)}/${String(activity.slug)}.json`;
}
