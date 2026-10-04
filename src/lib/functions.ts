import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "./firebase";

export interface HealthResponse {
  ok: true;
  timestamp: number;
  echo?: string;
}

/**
 * Checks the health of the Cloud Functions backend (RF02, CA01).
 */
export async function checkFunctionsHealth(echo?: string): Promise<HealthResponse> {
  const functions = getFunctionsInstance();
  const healthCallable = httpsCallable<{ echo?: string } | undefined, HealthResponse>(
    functions,
    "health",
  );
  const result = await healthCallable(echo ? { echo } : undefined);
  return result.data;
}
