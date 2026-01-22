import { timingSafeEqual } from "crypto";

/**
 * Timing-safe string comparison to prevent timing attacks
 *
 * This function prevents attackers from determining the correct value
 * by measuring response times. All comparisons take the same amount of time
 * regardless of where the strings differ.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * ```ts
 * // DO NOT use regular comparison for secrets:
 * if (userToken === expectedToken) { } // ❌ Vulnerable to timing attacks
 *
 * // Use timing-safe comparison instead:
 * if (timingSafeCompare(userToken, expectedToken)) { } // ✅ Safe
 * ```
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // If lengths don't match, pad shorter string to prevent timing leak
  // This ensures comparison always takes the same time regardless of input lengths
  const length = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(length);
  const bufB = Buffer.alloc(length);

  bufA.write(a);
  bufB.write(b);

  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    // timingSafeEqual throws if buffers have different lengths (shouldn't happen here)
    return false;
  }
}

/**
 * Timing-safe buffer comparison
 *
 * @param a - First buffer
 * @param b - Second buffer
 * @returns true if buffers are equal, false otherwise
 */
export function timingSafeCompareBuffers(a: Buffer, b: Buffer): boolean {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    return false;
  }

  // Pad to same length to prevent timing leak
  const length = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(length);
  const bufB = Buffer.alloc(length);

  a.copy(bufA);
  b.copy(bufB);

  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Timing-safe hash comparison (for hashed passwords, API keys, etc.)
 *
 * @param hash1 - First hash to compare
 * @param hash2 - Second hash to compare
 * @returns true if hashes are equal, false otherwise
 */
export function timingSafeCompareHashes(hash1: string, hash2: string): boolean {
  return timingSafeCompare(hash1, hash2);
}
