import type { MatrixCalculationInput } from './types'

export const REQUIRED_ADVANCED_ASTRO_SIGNAL_KEYS = [
  'solarReturn',
  'lunarReturn',
  'progressions',
  'draconic',
  'harmonics',
  'fixedStars',
  'eclipses',
  'midpoints',
  'asteroids',
  'extraPoints',
] as const

export type AdvancedAstroSignalKey = (typeof REQUIRED_ADVANCED_ASTRO_SIGNAL_KEYS)[number]

export type MatrixServiceRoute = 'calendar' | 'counselor' | 'matrix' | 'ai-report'

export type MatrixCrossInputKey =
  | 'dayMasterElement'
  | 'pillarElements'
  | 'sibsinDistribution'
  | 'twelveStages'
  | 'relations'
  | 'geokguk'
  | 'yongsin'
  | 'currentDaeunElement'
  | 'currentSaeunElement'
  | 'currentWolunElement'
  | 'currentIljinElement'
  | 'currentIljinDate'
  | 'shinsalList'
  | 'dominantWesternElement'
  | 'planetHouses'
  | 'planetSigns'
  | 'aspects'
  | 'activeTransits'
  | 'astroTimingIndex'
  | 'asteroidHouses'
  | 'extraPointSigns'
  | 'advancedAstroSignals'
  | 'sajuSnapshot'
  | 'astrologySnapshot'
  | 'crossSnapshot'

type CrossKeyRule = {
  used_in_layers: number[]
  used_in_signals_only: boolean
  used_in_direct_scoring: boolean
}

export type MatrixCrossAuditEntry = {
  key: MatrixCrossInputKey
  used_in_layers: number[]
  used_in_signals_only: boolean
  used_in_direct_scoring: boolean
  missing_service_routes: MatrixServiceRoute[]
}

const CROSS_KEY_RULES: Record<MatrixCrossInputKey, CrossKeyRule> = {
  dayMasterElement: { used_in_layers: [1, 9, 10], used_in_signals_only: false, used_in_direct_scoring: true },
  pillarElements: { used_in_layers: [1], used_in_signals_only: false, used_in_direct_scoring: true },
  sibsinDistribution: { used_in_layers: [2, 3, 10], used_in_signals_only: false, used_in_direct_scoring: true },
  twelveStages: { used_in_layers: [6], used_in_signals_only: false, used_in_direct_scoring: true },
  relations: { used_in_layers: [5], used_in_signals_only: false, used_in_direct_scoring: true },
  geokguk: { used_in_layers: [7], used_in_signals_only: false, used_in_direct_scoring: true },
  yongsin: { used_in_layers: [7], used_in_signals_only: false, used_in_direct_scoring: true },
  currentDaeunElement: { used_in_layers: [4], used_in_signals_only: false, used_in_direct_scoring: true },
  currentSaeunElement: { used_in_layers: [4], used_in_signals_only: false, used_in_direct_scoring: true },
  currentWolunElement: { used_in_layers: [4], used_in_signals_only: false, used_in_direct_scoring: true },
  currentIljinElement: { used_in_layers: [4], used_in_signals_only: false, used_in_direct_scoring: true },
  currentIljinDate: { used_in_layers: [4], used_in_signals_only: true, used_in_direct_scoring: false },
  shinsalList: { used_in_layers: [8], used_in_signals_only: false, used_in_direct_scoring: true },
  dominantWesternElement: { used_in_layers: [1], used_in_signals_only: false, used_in_direct_scoring: true },
  planetHouses: { used_in_layers: [2, 3, 6, 8], used_in_signals_only: false, used_in_direct_scoring: true },
  planetSigns: { used_in_layers: [], used_in_signals_only: true, used_in_direct_scoring: false },
  aspects: { used_in_layers: [5], used_in_signals_only: false, used_in_direct_scoring: true },
  activeTransits: { used_in_layers: [4], used_in_signals_only: false, used_in_direct_scoring: true },
  astroTimingIndex: { used_in_layers: [], used_in_signals_only: true, used_in_direct_scoring: false },
  asteroidHouses: { used_in_layers: [9], used_in_signals_only: false, used_in_direct_scoring: true },
  extraPointSigns: { used_in_layers: [10], used_in_signals_only: false, used_in_direct_scoring: true },
  advancedAstroSignals: { used_in_layers: [7], used_in_signals_only: true, used_in_direct_scoring: true },
  sajuSnapshot: { used_in_layers: [], used_in_signals_only: true, used_in_direct_scoring: false },
  astrologySnapshot: { used_in_layers: [], used_in_signals_only: true, used_in_direct_scoring: false },
  crossSnapshot: { used_in_layers: [], used_in_signals_only: true, used_in_direct_scoring: false },
}

function hasSignalValue(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return Boolean(normalized) && !['false', '0', 'none', 'null', 'undefined', 'off'].includes(normalized)
  }
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return false
}

export function buildCompleteAdvancedAstroSignals(
  value: MatrixCalculationInput['advancedAstroSignals'] | undefined
): Record<AdvancedAstroSignalKey, boolean> {
  const source = (value || {}) as Record<string, unknown>
  const out = {} as Record<AdvancedAstroSignalKey, boolean>
  for (const key of REQUIRED_ADVANCED_ASTRO_SIGNAL_KEYS) {
    out[key] = hasSignalValue(source[key])
  }
  return out
}

export function ensureMatrixInputCrossCompleteness(
  input: MatrixCalculationInput
): MatrixCalculationInput {
  return {
    ...input,
    shinsalList: Array.isArray(input.shinsalList) ? input.shinsalList : [],
    activeTransits: Array.isArray(input.activeTransits) ? input.activeTransits : [],
    asteroidHouses: input.asteroidHouses || {},
    extraPointSigns: input.extraPointSigns || {},
    advancedAstroSignals: buildCompleteAdvancedAstroSignals(input.advancedAstroSignals),
  }
}

function isPresent(input: MatrixCalculationInput, key: MatrixCrossInputKey): boolean {
  if (!Object.prototype.hasOwnProperty.call(input, key)) return false
  const value = input[key as keyof MatrixCalculationInput]

  if (key === 'shinsalList' || key === 'activeTransits') {
    return Array.isArray(value)
  }
  if (key === 'asteroidHouses' || key === 'extraPointSigns') {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value))
  }
  if (key === 'advancedAstroSignals') {
    const obj = value as Record<string, unknown> | undefined
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
    return REQUIRED_ADVANCED_ASTRO_SIGNAL_KEYS.every((signalKey) =>
      Object.prototype.hasOwnProperty.call(obj, signalKey)
    )
  }
  return value !== undefined
}

export function buildServiceInputCrossAudit(
  input: MatrixCalculationInput,
  service: MatrixServiceRoute
): MatrixCrossAuditEntry[] {
  const normalized = ensureMatrixInputCrossCompleteness(input)
  return (Object.keys(CROSS_KEY_RULES) as MatrixCrossInputKey[]).map((key) => {
    const rule = CROSS_KEY_RULES[key]
    return {
      key,
      used_in_layers: rule.used_in_layers,
      used_in_signals_only: rule.used_in_signals_only,
      used_in_direct_scoring: rule.used_in_direct_scoring,
      missing_service_routes: isPresent(normalized, key) ? [] : [service],
    }
  })
}

export function listMissingCrossKeysForService(
  audit: MatrixCrossAuditEntry[],
  service: MatrixServiceRoute
): MatrixCrossInputKey[] {
  return audit
    .filter((entry) => entry.missing_service_routes.includes(service))
    .map((entry) => entry.key)
}

