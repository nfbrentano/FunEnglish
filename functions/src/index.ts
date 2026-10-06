import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { z } from "zod";
import { createCallable } from "./helpers/callable.js";

// Regional & resource defaults (RF01, RF10):
// Functions are co-located in southamerica-east1 (São Paulo) alongside Firestore to minimize latency
// and avoid cross-region egress costs.
setGlobalOptions({
  region: "southamerica-east1",
  maxInstances: 10,
  minInstances: 0,
});

export const healthSchema = z
  .object({
    echo: z.string().optional(),
  })
  .optional();

export type HealthInput = z.infer<typeof healthSchema>;

export interface HealthOutput {
  ok: true;
  timestamp: number;
  echo?: string;
}

/**
 * Health check callable (RF02, CA01).
 * Returns status ok and timestamp. Can be called locally via emulator or in production.
 */
export const health = createCallable<HealthInput, HealthOutput>({
  schema: healthSchema,
  handler: async (data) => {
    return {
      ok: true,
      timestamp: Date.now(),
      echo: data?.echo,
    };
  },
});

/**
 * Example callable with App Check enforcement enabled (RF07, CA04).
 * Rejects requests without a valid App Check token.
 */
export const appCheckProtected = createCallable({
  enforceAppCheck: true,
  handler: async () => {
    return { protected: true };
  },
});

// Student management functions (spec 01: Turmas e Alunos)
export { deleteStudent } from "./students.js";

// Student portal invite functions (spec 03: Portal do Aluno)
export {
  createStudentInvite,
  getStudentInvite,
  revokeStudentInvite,
  removePortalAccess,
  validateInvite,
  redeemInvite,
} from "./invites.js";

// Classroom session functions (spec 08: Sessão de Aula, RF11, spec 11: RF06b)
export { autoCloseInactiveSessions, onSessionEnded } from "./sessions.js";

// Homework functions (spec 10: Tarefa de Casa)
export {
  createHomework,
  getHomeworkForStudent,
  verifyStudentPin,
  regenerateStudentHomeworkToken,
  submitHomework,
  onHomeworkSubmissionCreated,
} from "./homework.js";

// Billing and credits functions (spec 19: Pacotes de aulas e créditos)
export {
  onLessonUpdated,
  renewMonthlyPlans,
} from "./billing.js";

// Booking and availability functions (spec 20: Agendamento pelo aluno)
export {
  getAvailableSlots,
  bookLesson,
  cancelLesson,
  respondToProposal,
  rescheduleLesson,
  joinLesson,
} from "./booking.js";

// Re-export helpers and secret definitions for subsequent specs
export { defineSecret };
export { createCallable } from "./helpers/callable.js";
export { checkRateLimit, resetRateLimits } from "./helpers/rate-limit.js";

