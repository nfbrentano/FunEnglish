import { collection, getDocs, limit, query, where } from "firebase/firestore/lite";
import { activityInputSchema, type ActivityInput } from "../activities/schema/activity";
import { ACTIVITIES_COLLECTION } from "../activities/collections";
import { getLiteDb } from "../firebase";

/** A published activity as the player receives it (plain JSON, from the build or Firestore). */
export type PlayableActivity = ActivityInput & { id: string };

function toPlayable(id: string, data: unknown): PlayableActivity | null {
  // editedInPanelAt is a Firestore Timestamp here and only matters to the seed (RF09).
  const { editedInPanelAt: _edited, ...authored } = (data ?? {}) as Record<string, unknown>;
  void _edited;
  const parsed = activityInputSchema.safeParse(authored);
  // Invalid content still reaches the player, which shows a friendly error (motor spec, CA07).
  if (!parsed.success) {
    console.error(`Activity ${id} is invalid`, parsed.error.issues);
    return null;
  }
  return { id, ...parsed.data };
}

/** Raw published documents, for the build and the player shell. */
async function queryPublished(slug?: string) {
  const constraints = [where("status", "==", "published")];
  if (slug) constraints.push(where("slug", "==", slug));
  const snapshot = await getDocs(
    query(
      collection(getLiteDb(), ACTIVITIES_COLLECTION),
      ...constraints,
      ...(slug ? [limit(1)] : []),
    ),
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
}

export async function fetchPublishedActivities(): Promise<
  { id: string; slug: string; activity: PlayableActivity | null }[]
> {
  const docs = await queryPublished();
  return docs.map(({ id, data }) => ({
    id,
    slug: String((data as { slug?: unknown }).slug ?? id),
    activity: toPlayable(id, data),
  }));
}

/** Player shell: one activity by slug. `undefined` = not found, `null` = found but invalid. */
export async function fetchPublishedActivity(
  slug: string,
): Promise<PlayableActivity | null | undefined> {
  const [doc] = await queryPublished(slug);
  return doc ? toPlayable(doc.id, doc.data) : undefined;
}
