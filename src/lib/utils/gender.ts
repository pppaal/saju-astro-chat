export type NormalizedGender = 'male' | 'female' | 'other' | 'prefer_not'

const PREFER_NOT_VALUES = new Set([
  'prefer_not',
  'prefer-not',
  'prefer not',
  'prefer not to say',
  'prefer not to disclose',
  'rather not say',
])

export function normalizeGender(value?: string | null): NormalizedGender | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const normalized = trimmed.toLowerCase()

  if (normalized === 'm' || normalized === 'male') {
    return 'male'
  }
  if (normalized === 'f' || normalized === 'female') {
    return 'female'
  }
  if (normalized === 'other') {
    return 'other'
  }
  if (PREFER_NOT_VALUES.has(normalized)) {
    return 'prefer_not'
  }

  return undefined
}

export function toShortGender(value?: string | null): 'M' | 'F' | undefined {
  const normalized = normalizeGender(value)
  if (normalized === 'male') {
    return 'M'
  }
  if (normalized === 'female') {
    return 'F'
  }
  return undefined
}

export function toLongGender(value?: string | null): 'Male' | 'Female' | undefined {
  const normalized = normalizeGender(value)
  if (normalized === 'male') {
    return 'Male'
  }
  if (normalized === 'female') {
    return 'Female'
  }
  return undefined
}
