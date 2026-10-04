/**
 * Generates a random 4-digit numeric string for homework access.
 */
export function generateHomeworkPin(): string {
  const pin = Math.floor(1000 + Math.random() * 9000);
  return pin.toString();
}

/**
 * Computes a SHA-256 hex hash of the given PIN.
 * Compatible with modern browser Web Crypto API and Node.js environment.
 */
export async function hashHomeworkPin(pin: string): Promise<string> {
  const normalized = pin.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
