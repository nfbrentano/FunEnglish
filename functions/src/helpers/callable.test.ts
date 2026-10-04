import { describe, expect, it, beforeEach } from "vitest";
import type { CallableRequest } from "firebase-functions/v2/https";
import { z } from "zod";
import { createCallable } from "./callable.js";
import { resetRateLimits } from "./rate-limit.js";

function mockRequest<T>(
  data: T,
  auth?: { uid: string; token: Record<string, unknown> },
): CallableRequest<T> {
  return {
    data,
    auth,
    rawRequest: { ip: "127.0.0.1" } as unknown as CallableRequest<T>["rawRequest"],
  } as unknown as CallableRequest<T>;
}

describe("createCallable helper", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("validates input against zod schema", async () => {
    const fn = createCallable({
      schema: z.object({ name: z.string().min(2) }),
      handler: (data) => ({ greeting: `Hello, ${data.name}!` }),
    });

    // Invoke the underlying handler logic with valid data
    const validResult = await fn.run(mockRequest({ name: "Alice" }));
    expect(validResult).toEqual({ greeting: "Hello, Alice!" });

    // Invalid data throws invalid-argument HttpsError
    await expect(fn.run(mockRequest({ name: "A" }))).rejects.toThrow(/Invalid input/);
  });

  it("enforces authentication when requireAuth is true", async () => {
    const fn = createCallable({
      requireAuth: true,
      handler: () => ({ success: true }),
    });

    // Unauthenticated call throws unauthenticated error
    await expect(fn.run(mockRequest({}))).rejects.toMatchObject({
      code: "unauthenticated",
    });

    // Authenticated call succeeds
    const authedResult = await fn.run(mockRequest({}, { uid: "user-123", token: {} }));
    expect(authedResult).toEqual({ success: true });
  });

  it("enforces admin privileges when requireAdmin is true", async () => {
    const fn = createCallable({
      requireAdmin: true,
      handler: () => ({ adminOnly: true }),
    });

    // Non-admin token throws permission-denied error
    await expect(
      fn.run(mockRequest({}, { uid: "teacher-1", token: { admin: false } })),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });

    // Admin token succeeds
    const adminResult = await fn.run(
      mockRequest({}, { uid: "admin-1", token: { admin: true } }),
    );
    expect(adminResult).toEqual({ adminOnly: true });
  });

  it("enforces rate limits when configured", async () => {
    const fn = createCallable({
      rateLimit: { maxRequests: 2, windowMs: 60_000, prefix: "test" },
      handler: () => ({ ok: true }),
    });

    const requestContext = mockRequest({}, { uid: "spammer-1", token: {} });

    expect(await fn.run(requestContext)).toEqual({ ok: true });
    expect(await fn.run(requestContext)).toEqual({ ok: true });

    // 3rd request exceeds limit
    await expect(fn.run(requestContext)).rejects.toMatchObject({
      code: "resource-exhausted",
    });
  });
});
