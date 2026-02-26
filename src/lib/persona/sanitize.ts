const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
const ESCAPED_UNICODE_REGEX = /\\u([0-9a-fA-F]{4})/g
const SURROGATE_REGEX = /[\uD800-\uDFFF]/g
const REPLACEMENT_CHAR_REGEX = /\uFFFD/g
const HANGUL_REGEX = /[\u3131-\u318e\uac00-\ud7a3]/g
const MOJIBAKE_MARKER_REGEX =
  /(?:\u00C3|\u00C2|\u00EC|\u00ED|\u00EB|\u00EA|\u00F0|\u0081|\u0084|\u0088|\u008B|\u008D|\u008E|\u008F|\uFFFD)/g

function decodeEscapedUnicode(input: string): string {
  if (!input.includes('\\u')) {
    return input
  }

  return input.replace(ESCAPED_UNICODE_REGEX, (_match, hex: string) => {
    const codePoint = Number.parseInt(hex, 16)
    if (!Number.isFinite(codePoint)) {
      return ''
    }
    return String.fromCharCode(codePoint)
  })
}

function scoreKoreanReadability(input: string): number {
  const hangulCount = input.match(HANGUL_REGEX)?.length ?? 0
  const replacementCount = input.match(REPLACEMENT_CHAR_REGEX)?.length ?? 0
  const mojibakeCount = input.match(MOJIBAKE_MARKER_REGEX)?.length ?? 0
  return hangulCount * 3 - replacementCount * 4 - mojibakeCount * 2
}

function hasMojibakeMarkers(input: string): boolean {
  MOJIBAKE_MARKER_REGEX.lastIndex = 0
  return MOJIBAKE_MARKER_REGEX.test(input)
}

function decodeLatin1AsUtf8(input: string): string {
  const bytes = new Uint8Array(input.length)
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i)
    if (code > 0xff) {
      return input
    }
    bytes[i] = code
  }

  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    return input
  }
}

function repairMojibake(input: string): string {
  if (!hasMojibakeMarkers(input)) {
    return input
  }

  const attempt1 = decodeLatin1AsUtf8(input)
  const attempt2 = decodeLatin1AsUtf8(attempt1)
  const originalScore = scoreKoreanReadability(input)
  const attempt1Score = scoreKoreanReadability(attempt1)
  const attempt2Score = scoreKoreanReadability(attempt2)

  if (attempt2Score > attempt1Score && attempt2Score >= originalScore + 2) {
    return attempt2
  }

  if (attempt1Score >= originalScore + 2) {
    return attempt1
  }

  return input
}

export function sanitizePersonaText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return repairMojibake(
    decodeEscapedUnicode(value)
      .replace(/\r\n?/g, '\n')
      .replace(CONTROL_CHAR_REGEX, '')
      .replace(/\uFEFF/g, '')
  )
    .replace(/\r\n?/g, '\n')
    .replace(SURROGATE_REGEX, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function sanitizePersonaList(items: unknown, limit?: number): string[] {
  if (!Array.isArray(items)) {
    return []
  }

  const seen = new Set<string>()
  const out: string[] = []

  items.forEach((item) => {
    const text = sanitizePersonaText(item)
    if (!text) {
      return
    }

    const normalizedKey = text.replace(/\s+/g, '').toLowerCase()
    if (seen.has(normalizedKey)) {
      return
    }

    seen.add(normalizedKey)
    out.push(text)
  })

  return typeof limit === 'number' ? out.slice(0, limit) : out
}

export function sanitizePersonaPayload<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizePersonaText(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePersonaPayload(entry)) as T
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      output[key] = sanitizePersonaPayload(entry)
    })
    return output as T
  }

  return value
}
