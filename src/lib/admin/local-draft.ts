/**
 * Unsaved editor changes kept on this device, so a closed tab or a crash doesn't lose work
 * (spec: gestão completa, RF12). Per-viewer convenience only: storage may be unavailable.
 */
const PREFIX = "fun-english:admin-draft:";

export type LocalDraft<T> = { savedAt: string; draft: T };

const key = (activityId: string | null) => PREFIX + (activityId ?? "new");

export function readLocalDraft<T>(activityId: string | null): LocalDraft<T> | null {
  try {
    const raw = localStorage.getItem(key(activityId));
    return raw ? (JSON.parse(raw) as LocalDraft<T>) : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft<T>(activityId: string | null, draft: T, now = new Date()) {
  try {
    localStorage.setItem(
      key(activityId),
      JSON.stringify({ savedAt: now.toISOString(), draft } satisfies LocalDraft<T>),
    );
  } catch {
    // Full or blocked storage: the unsaved-changes warning still protects the work.
  }
}

export function clearLocalDraft(activityId: string | null) {
  try {
    localStorage.removeItem(key(activityId));
  } catch {}
}
