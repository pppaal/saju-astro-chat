export type I18nMessages = Record<string, unknown>

export function toSafeFallbackText(path: string): string {
  const candidate = path.split('.').pop() || path
  const normalized = candidate
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()

  if (!normalized) {
    return 'Content unavailable'
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function getPathValue(source: unknown, path: string): unknown {
  if (!path) {
    return undefined
  }

  const parts = path.split('.')
  let current: unknown = source

  for (const part of parts) {
    if (
      current !== null &&
      typeof current === 'object' &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part]
      continue
    }
    return undefined
  }

  return current
}

export function isPlaceholderTranslation(value: string, path: string): boolean {
  const leaf = path.split('.').pop() || path
  return value === path || value === leaf || value === toSafeFallbackText(path)
}
