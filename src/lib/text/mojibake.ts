const CP1252_REVERSE_MAP: Record<string, number> = {
  '\u20ac': 0x80, // €
  '\u201a': 0x82, // ‚
  '\u0192': 0x83, // ƒ
  '\u201e': 0x84, // „
  '\u2026': 0x85, // …
  '\u2020': 0x86, // †
  '\u2021': 0x87, // ‡
  '\u02c6': 0x88, // ˆ
  '\u2030': 0x89, // ‰
  '\u0160': 0x8a, // Š
  '\u2039': 0x8b, // ‹
  '\u0152': 0x8c, // Œ
  '\u017d': 0x8e, // Ž
  '\u2018': 0x91, // ‘
  '\u2019': 0x92, // ’
  '\u201c': 0x93, // “
  '\u201d': 0x94, // ”
  '\u2022': 0x95, // •
  '\u2013': 0x96, // –
  '\u2014': 0x97, // —
  '\u02dc': 0x98, // ˜
  '\u2122': 0x99, // ™
  '\u0161': 0x9a, // š
  '\u203a': 0x9b, // ›
  '\u0153': 0x9c, // œ
  '\u017e': 0x9e, // ž
  '\u0178': 0x9f, // Ÿ
}

const MOJIBAKE_REGEX =
  /(ðŸ|Ã.|Â.|â.|ì.|ë.|ê.|í.|Œ|œ|Š|š|Ž|ž|Ÿ|€|™|�|\u00c2|\u00c3|\u00e2|\u00ec|\u00eb|\u00ea|\u00ed)/
const MOJIBAKE_SEGMENT_REGEX = /[ðÃÂâìëêíŒœŠšŽžŸ€™•…–—]+/g

const decoder = new TextDecoder('utf-8')

function toLegacyBytes(value: string): Uint8Array | null {
  const bytes: number[] = []

  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code <= 0xff) {
      bytes.push(code)
      continue
    }

    const mapped = CP1252_REVERSE_MAP[char]
    if (mapped !== undefined) {
      bytes.push(mapped)
      continue
    }

    return null
  }

  return Uint8Array.from(bytes)
}

function decodeLegacyUtf8(value: string): string | null {
  const bytes = toLegacyBytes(value)
  if (!bytes) return null
  return decoder.decode(bytes)
}

function mojibakeScore(value: string): number {
  const matches = value.match(
    /ðŸ|Ã.|Â.|â.|ì.|ë.|ê.|í.|Œ|œ|Š|š|Ž|ž|Ÿ|€|™|�|\u00c2|\u00c3|\u00e2|\u00ec|\u00eb|\u00ea|\u00ed/g
  )
  return matches ? matches.length : 0
}

function preferDecoded(original: string, decoded: string): boolean {
  if (!decoded || decoded === original) return false
  if (decoded.includes('\uFFFD') && !original.includes('\uFFFD')) return false
  return mojibakeScore(decoded) < mojibakeScore(original)
}

export function hasMojibake(value: string): boolean {
  return MOJIBAKE_REGEX.test(value)
}

export function repairMojibakeText(value: string, maxPasses = 2): string {
  if (!value || !hasMojibake(value)) return value

  let current = value

  for (let pass = 0; pass < maxPasses; pass++) {
    const fullDecoded = decodeLegacyUtf8(current)
    if (fullDecoded && preferDecoded(current, fullDecoded)) {
      current = fullDecoded
      if (!hasMojibake(current)) return current
      continue
    }

    let segmentChanged = false
    const segmentDecoded = current.replace(MOJIBAKE_SEGMENT_REGEX, (segment) => {
      const decoded = decodeLegacyUtf8(segment)
      if (decoded && preferDecoded(segment, decoded)) {
        segmentChanged = true
        return decoded
      }
      return segment
    })

    if (segmentChanged && preferDecoded(current, segmentDecoded)) {
      current = segmentDecoded
      if (!hasMojibake(current)) return current
      continue
    }

    break
  }

  return current
}

export function normalizeMojibakePayload<T>(input: T): T {
  if (typeof input === 'string') {
    return repairMojibakeText(input) as T
  }

  if (Array.isArray(input)) {
    return input.map((item) => normalizeMojibakePayload(item)) as T
  }

  if (input && typeof input === 'object') {
    const normalized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      normalized[key] = normalizeMojibakePayload(value)
    }
    return normalized as T
  }

  return input
}

// Backward-compatible alias used by existing callers.
export const repairMojibakeDeep = normalizeMojibakePayload
