import type {
  TrackCalculatedProgress,
  TrackStepCompletion,
  TrackStepStatus,
  TrackStepView,
} from "./types";

export interface ActivityAvailabilityChecker {
  isAvailable: (activityId: string) => boolean;
}

/**
 * Calculates track progress on the client (RNF04, RF04, RF09).
 * - Total steps = only published / available activities.
 * - Completed count = available activities that have been completed.
 * - Unavailable activities are marked 'unavailable' and excluded from total & percentage (CA08).
 * - The first uncompleted available step is 'current', subsequent are 'pending'.
 */
export function calculateTrackProgress(
  activityIds: string[],
  completed: Record<string, TrackStepCompletion> | null | undefined = {},
  isAvailableInput?: ((activityId: string) => boolean) | Set<string> | Map<string, unknown>,
): TrackCalculatedProgress {
  const isAvailable = (id: string): boolean => {
    if (!isAvailableInput) return true;
    if (typeof isAvailableInput === "function") return isAvailableInput(id);
    if (isAvailableInput instanceof Set) return isAvailableInput.has(id);
    if (isAvailableInput instanceof Map) return isAvailableInput.has(id);
    return true;
  };

  const steps: TrackStepView[] = [];
  let availableTotal = 0;
  let completedCount = 0;
  let foundCurrent = false;

  const compMap = completed || {};

  activityIds.forEach((activityId, index) => {
    const available = isAvailable(activityId);
    let status: TrackStepStatus;
    const completion = compMap[activityId];

    if (!available) {
      status = "unavailable";
    } else {
      availableTotal++;
      if (completion) {
        status = "completed";
        completedCount++;
      } else if (!foundCurrent) {
        status = "current";
        foundCurrent = true;
      } else {
        status = "pending";
      }
    }

    steps.push({
      activityId,
      order: index + 1,
      status,
      available,
      completion: available ? completion : undefined,
    });
  });

  const percent =
    availableTotal > 0 ? Math.round((completedCount / availableTotal) * 100) : 0;

  return {
    total: availableTotal,
    completedCount,
    percent,
    steps,
  };
}
