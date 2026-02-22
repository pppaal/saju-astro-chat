const CP1252_REVERSE_MAP: Record<string, number> = {
  '\u20ac': 0x80,
  '\u201a': 0x82,
  '\u0192': 0x83,
  '\u201e': 0x84,
  '\u2026': 0x85,
  '\u2020': 0x86,
  '\u2021': 0x87,
  '\u02c6': 0x88,
  '\u2030': 0x89,
  '\u0160': 0x8a,
  '\u2039': 0x8b,
  '\u0152': 0x8c,
  '\u017d': 0x8e,
  '\u2018': 0x91,
  '\u2019': 0x92,
  '\u201c': 0x93,
  '\u201d': 0x94,
  '\u2022': 0x95,
  '\u2013': 0x96,
  '\u2014': 0x97,
  '\u02dc': 0x98,
  '\u2122': 0x99,
  '\u0161': 0x9a,
  '\u203a': 0x9b,
  '\u0153': 0x9c,
  '\u017e': 0x9e,
  '\u0178': 0x9f,
}

const MOJIBAKE_CHAR_CLASS =
  '[\u00c2\u00c3\u00e2\u00ec\u00eb\u00ea\u00ed\u00f0\u0152\u0153\u0160\u0161\u017d\u017e\u0178\u201a\u201e\u2020\u2021\u2026\u2030\u2039\u203a\u20ac\u2122\ufffd]'
const MOJIBAKE_REGEX = new RegExp(MOJIBAKE_CHAR_CLASS)
const MOJIBAKE_SEGMENT_REGEX = new RegExp(`${MOJIBAKE_CHAR_CLASS}+`, 'g')
const MOJIBAKE_SPLIT_REGEX = new RegExp(`(${MOJIBAKE_CHAR_CLASS})[ \\t]+(${MOJIBAKE_CHAR_CLASS})`, 'g')
const SUSPICIOUS_CHAR_REGEX = new RegExp(MOJIBAKE_CHAR_CLASS)

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

function normalizeLikelyMissingNbsp(value: string): string {
  let result = ''
  for (let i = 0; i < value.length; i++) {
    const current = value[i]
    const next = value[i + 1]
    const nextNext = value[i + 2]

    if (
      next === ' ' &&
      nextNext &&
      isByteLikeChar(current) &&
      isByteLikeChar(nextNext)
    ) {
      result += `${current}\u00a0`
      i += 1
      continue
    }

    result += current
  }
  return result
}

function isByteLikeChar(char: string): boolean {
  const code = char.charCodeAt(0)
  if (code <= 0xff) return true
  return CP1252_REVERSE_MAP[char] !== undefined
}

function decodeByteLikeRuns(value: string): string {
  let result = ''
  let i = 0

  while (i < value.length) {
    const char = value[i]
    if (!isByteLikeChar(char)) {
      result += char
      i += 1
      continue
    }

    let j = i + 1
    while (j < value.length && isByteLikeChar(value[j])) {
      j += 1
    }

    const chunk = value.slice(i, j)
    if (hasMojibake(chunk)) {
      const decoded = decodeLegacyUtf8(chunk)
      result += decoded && preferDecoded(chunk, decoded) ? decoded : chunk
    } else {
      result += chunk
    }
    i = j
  }

  return result
}

function normalizeSplitMojibake(value: string): string {
  let current = value
  for (let i = 0; i < 3; i++) {
    const merged = current.replace(MOJIBAKE_SPLIT_REGEX, '$1$2')
    if (merged === current) break
    current = merged
  }
  return current
}

function mojibakeScore(value: string): number {
  const matches = value.match(MOJIBAKE_SEGMENT_REGEX)
  return matches ? matches.length : 0
}

function semanticGainScore(value: string): number {
  const hangul = (value.match(/[\uac00-\ud7a3]/g) || []).length
  const emoji = (value.match(/[\u{1f300}-\u{1faff}]/gu) || []).length
  return hangul * 2 + emoji
}

function preferDecoded(original: string, decoded: string): boolean {
  if (!decoded || decoded === original) return false

  const originalScore = mojibakeScore(original)
  const decodedScore = mojibakeScore(decoded)
  if (decodedScore < originalScore) return true
  if (decodedScore === originalScore && semanticGainScore(decoded) > semanticGainScore(original)) {
    return true
  }
  if (decoded.includes('\uFFFD') && !original.includes('\uFFFD')) {
    const replacementCount = (decoded.match(/\uFFFD/g) || []).length
    if (
      replacementCount <= 2 &&
      decodedScore <= originalScore &&
      semanticGainScore(decoded) > semanticGainScore(original) + 1
    ) {
      return true
    }
  }
  return false
}

export function hasMojibake(value: string): boolean {
  return MOJIBAKE_REGEX.test(value) || SUSPICIOUS_CHAR_REGEX.test(value)
}

export function repairMojibakeText(value: string, maxPasses = 2): string {
  if (!value) return value
  if (!hasMojibake(value)) return value

  let current = normalizeSplitMojibake(value)

  for (let pass = 0; pass < maxPasses; pass++) {
    const fullDecoded = decodeLegacyUtf8(current)
    if (fullDecoded && preferDecoded(current, fullDecoded)) {
      current = fullDecoded
      if (!hasMojibake(current) && !SUSPICIOUS_CHAR_REGEX.test(current)) return current
      continue
    }

    const nbspNormalized = normalizeLikelyMissingNbsp(current)
    if (nbspNormalized !== current) {
      const nbspDecoded = decodeLegacyUtf8(nbspNormalized)
      if (nbspDecoded && preferDecoded(current, nbspDecoded)) {
        current = nbspDecoded
        if (!hasMojibake(current) && !SUSPICIOUS_CHAR_REGEX.test(current)) return current
        continue
      }
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
      if (!hasMojibake(current) && !SUSPICIOUS_CHAR_REGEX.test(current)) return current
      continue
    }

    const runDecoded = decodeByteLikeRuns(current)
    if (runDecoded !== current && preferDecoded(current, runDecoded)) {
      current = runDecoded
      if (!hasMojibake(current) && !SUSPICIOUS_CHAR_REGEX.test(current)) return current
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

export const repairMojibakeDeep = normalizeMojibakePayload
