const MOJIBAKE_MARKER_RE = /(?:Ã.|Â.|â€|â€™|â€œ|â€¢|ì.|ë.|ê.|í.|ð.)/u

function countMatches(value: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const globalPattern = new RegExp(pattern.source, flags)
  return value.match(globalPattern)?.length || 0
}

function countKoreanCharacters(value: string): number {
  return countMatches(value, /[가-힣]/u)
}

function countMojibakeMarkers(value: string): number {
  return countMatches(value, MOJIBAKE_MARKER_RE)
}

function encodeCharToByte(char: string): number {
  const codePoint = char.codePointAt(0) || 0
  if (codePoint <= 0xff) return codePoint

  const cp1252Map: Record<number, number> = {
    0x20ac: 0x80,
    0x201a: 0x82,
    0x0192: 0x83,
    0x201e: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02c6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8a,
    0x2039: 0x8b,
    0x0152: 0x8c,
    0x017d: 0x8e,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02dc: 0x98,
    0x2122: 0x99,
    0x0161: 0x9a,
    0x203a: 0x9b,
    0x0153: 0x9c,
    0x017e: 0x9e,
    0x0178: 0x9f,
  }

  return cp1252Map[codePoint] ?? 0x3f
}

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from([...value].map((char) => encodeCharToByte(char)))
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

function shouldKeepRepair(original: string, repaired: string): boolean {
  if (!repaired || repaired === original) return false

  const originalMarkers = countMojibakeMarkers(original)
  const repairedMarkers = countMojibakeMarkers(repaired)
  const originalKorean = countKoreanCharacters(original)
  const repairedKorean = countKoreanCharacters(repaired)

  if (repairedMarkers > originalMarkers) return false
  if (repairedKorean > originalKorean) return true
  if (repairedMarkers < originalMarkers) return true
  return false
}

export function repairPossiblyMojibakeText(value: string | undefined | null): string {
  let current = String(value || '')

  for (let index = 0; index < 2; index += 1) {
    if (!MOJIBAKE_MARKER_RE.test(current)) break
    const repaired = decodeLatin1AsUtf8(current)
    if (!shouldKeepRepair(current, repaired)) break
    current = repaired
  }

  return current
}
