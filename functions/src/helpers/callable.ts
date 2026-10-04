import {
  HttpsError,
  onCall,
  type CallableOptions as FirebaseCallableOptions,
  type CallableRequest,
} from "firebase-functions/v2/https";
import { type ZodType, type ZodError } from "zod";
import { checkRateLimit, type RateLimitOptions } from "./rate-limit.js";

export interface CreateCallableConfig<TInput, TOutput> {
  schema?: ZodType<TInput>;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  enforceAppCheck?: boolean;
  rateLimit?: RateLimitOptions;
  options?: Omit<FirebaseCallableOptions, "enforceAppCheck">;
  handler: (data: TInput, request: CallableRequest<TInput>) => Promise<TOutput> | TOutput;
}

/**
 * Creates a strongly-typed Firebase 2nd-gen callable function with
 * built-in Zod validation, authentication/authorization checks, rate limiting,
 * and standardized HttpsErrors (invalid-argument, unauthenticated, permission-denied, resource-exhausted).
 */
export function createCallable<TInput = unknown, TOutput = unknown>(
  config: CreateCallableConfig<TInput, TOutput>,
) {
  return onCall<TInput>(
    {
      enforceAppCheck: config.enforceAppCheck ?? false,
      ...config.options,
    },
    async (request: CallableRequest<TInput>) => {
      // 1. Authentication check
      if (config.requireAuth && !request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required to call this function.");
      }

      // 2. Administrator authorization check
      if (config.requireAdmin) {
        if (!request.auth) {
          throw new HttpsError("unauthenticated", "Authentication required to call this function.");
        }
        if (!request.auth.token.admin) {
          throw new HttpsError(
            "permission-denied",
            "Administrator privileges required to call this function.",
          );
        }
      }

      // 3. Rate limiting check
      if (config.rateLimit) {
        const identifier = request.auth?.uid || request.rawRequest?.ip || "anonymous";
        const allowed = await checkRateLimit(identifier, config.rateLimit);
        if (!allowed) {
          throw new HttpsError(
            "resource-exhausted",
            "Too many requests. Please slow down and try again later.",
          );
        }
      }

      // 4. Schema validation with Zod
      let validatedData: TInput = request.data;
      if (config.schema) {
        const result = config.schema.safeParse(request.data);
        if (!result.success) {
          const zodError = result.error as ZodError;
          const details = zodError.issues
            .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
            .join("; ");
          throw new HttpsError("invalid-argument", `Invalid input: ${details}`);
        }
        validatedData = result.data;
      }

      // 5. Execute handler
      return await config.handler(validatedData, request);
    },
  );
}
