import { describe, expect, it } from "vitest";
import { generateHomeworkPin, hashHomeworkPin } from "@/lib/classes/pin";

describe("Homework PIN helpers (RNF01)", () => {
  it("generates a 4-digit numeric string", () => {
    for (let i = 0; i < 20; i++) {
      const pin = generateHomeworkPin();
      expect(pin).toMatch(/^\d{4}$/);
      const num = parseInt(pin, 10);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThan(10000);
    }
  });

  it("hashes PIN with SHA-256 to a 64-character hex string", async () => {
    const pin = "1234";
    const hash = await hashHomeworkPin(pin);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    // sha256("1234") is well-known: 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
    expect(hash).toBe("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4");
  });

  it("produces deterministic hashes for the same PIN and different hashes for different PINs", async () => {
    const hash1 = await hashHomeworkPin("5678");
    const hash2 = await hashHomeworkPin("5678");
    const hash3 = await hashHomeworkPin("5679");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});
