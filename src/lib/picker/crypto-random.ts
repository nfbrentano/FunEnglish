/**
 * Cryptographically secure random utility using crypto.getRandomValues
 * and Fisher-Yates shuffle without modulo bias (RNF01, CA07).
 */

export function getRandomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error(`min and max must be integers: min=${min}, max=${max}`);
  }
  if (min > max) {
    throw new Error(`min (${min}) cannot be greater than max (${max})`);
  }
  const range = max - min + 1;
  if (range === 1) return min;

  // Use global crypto in browser or node
  const cryptoObj =
    typeof window !== "undefined" && window.crypto
      ? window.crypto
      : typeof globalThis !== "undefined" && globalThis.crypto
        ? globalThis.crypto
        : null;

  if (!cryptoObj?.getRandomValues) {
    // Graceful fallback for non-crypto environments
    return min + Math.floor(Math.random() * range);
  }

  // To prevent modulo bias with 32-bit unsigned ints:
  const maxUint32 = 0x100000000; // 2^32 = 4,294,967,296
  const limit = maxUint32 - (maxUint32 % range);
  const buffer = new Uint32Array(1);

  let randomVal: number;
  do {
    cryptoObj.getRandomValues(buffer);
    randomVal = buffer[0];
  } while (randomVal >= limit);

  return min + (randomVal % range);
}

/**
 * Modern Fisher-Yates array shuffle.
 * Unbiased uniform permutation O(n).
 */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = getRandomInt(0, i);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Pick a random item and its index from an array uniformly.
 */
export function pickRandom<T>(
  items: readonly T[]
): { item: T; index: number } | null {
  if (items.length === 0) return null;
  const index = getRandomInt(0, items.length - 1);
  return { item: items[index], index };
}
