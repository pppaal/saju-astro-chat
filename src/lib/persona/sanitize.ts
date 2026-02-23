const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
const ESCAPED_UNICODE_REGEX = /\\u([0-9a-fA-F]{4})/g
const SURROGATE_REGEX = /[\uD800-\uDFFF]/g

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

export function sanitizePersonaText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return decodeEscapedUnicode(value)
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHAR_REGEX, '')
    .replace(/\uFEFF/g, '')
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
