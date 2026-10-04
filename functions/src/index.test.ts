import { describe, expect, it } from "vitest";
import type { CallableRequest } from "firebase-functions/v2/https";
import { health, type HealthInput } from "./index.js";

function mockRequest(data: HealthInput): CallableRequest<HealthInput> {
  return {
    data,
    rawRequest: { ip: "127.0.0.1" } as unknown as CallableRequest<HealthInput>["rawRequest"],
  } as unknown as CallableRequest<HealthInput>;
}

describe("health callable function (CA01)", () => {
  it("returns ok: true with timestamp", async () => {
    const result = await health.run(mockRequest(undefined));

    expect(result.ok).toBe(true);
    expect(typeof result.timestamp).toBe("number");
  });

  it("accepts and echoes optional string", async () => {
    const result = await health.run(mockRequest({ echo: "ping" }));

    expect(result.ok).toBe(true);
    expect(result.echo).toBe("ping");
  });

  it("rejects invalid input schema", async () => {
    await expect(
      health.run(mockRequest({ echo: 12345 as unknown as string })),
    ).rejects.toThrow(/Invalid input/);
  });
});
