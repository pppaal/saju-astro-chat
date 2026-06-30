import { timingSafeEqual } from 'crypto'

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
    return false
  }

  // 반드시 UTF-8 바이트로 인코딩한 뒤 그 바이트 길이로 패딩한다. 직전엔
  // String.length(UTF-16 코드유닛 수)로 버퍼를 잡고 write 해서, 한글 등
  // 멀티바이트(1코드유닛=3바이트) 입력이 *잘려* 비교됐다 — 절단 지점 이후만 다른
  // 두 문자열이 같다고 판정되는 보안 결함. byte 버퍼로 비교해 절단을 없앤다.
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')

  // 길이가 달라도 동일 시간이 걸리도록 더 긴 쪽으로 패딩 후 비교하되, 실제 바이트
  // 길이가 다르면 최종 결과는 false (패딩으로 우연히 같아 보이는 것 방지).
  const length = Math.max(bufA.length, bufB.length)
  const paddedA = Buffer.alloc(length)
  const paddedB = Buffer.alloc(length)
  bufA.copy(paddedA)
  bufB.copy(paddedB)

  try {
    const equal = timingSafeEqual(paddedA, paddedB)
    return equal && bufA.length === bufB.length
  } catch {
    return false
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
    return false
  }

  // Pad to same length to prevent timing leak
  const length = Math.max(a.length, b.length)
  const bufA = Buffer.alloc(length)
  const bufB = Buffer.alloc(length)

  a.copy(bufA)
  b.copy(bufB)

  try {
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
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
  return timingSafeCompare(hash1, hash2)
}
