const MOJIBAKE_PATTERN = /[ÃÂâðìíêë]/

export function hasMojibake(value: string): boolean {
  return MOJIBAKE_PATTERN.test(value)
}

export function repairMojibakeText(value: string): string {
  if (!value || !hasMojibake(value)) return value
  try {
    const bytes = Uint8Array.from([...value].map((ch) => ch.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8').decode(bytes)
    if (decoded && !decoded.includes('\ufffd')) {
      return decoded
    }
  } catch {
    // keep original when decode fails
  }
  return value
}

export function repairMojibakeDeep<T>(input: T): T {
  if (typeof input === 'string') {
    return repairMojibakeText(input) as T
  }
  if (Array.isArray(input)) {
    return input.map((item) => repairMojibakeDeep(item)) as T
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = repairMojibakeDeep(value)
    }
    return out as T
  }
  return input
}
