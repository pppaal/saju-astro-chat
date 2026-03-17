import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { SignalDomain } from './signalSynthesizer'
import type { OntologyToken } from './ontology'
import {
  mapAdvancedAstroOntology,
  mapAspectOntology,
  mapAsteroidHouseOntology,
  mapCycleOntology,
  mapElementOntology,
  mapExtraPointOntology,
  mapPlanetHouseOntology,
  mapPlanetSignOntology,
  mapRelationOntology,
  mapShinsalOntology,
  mapSibsinOntology,
  mapSnapshotOntology,
  mapTransitOntology,
  mapTwelveStageOntology,
} from './ontology'

export interface CompiledFeatureToken extends OntologyToken {
  label: string
}

export interface FeatureCompilationResult {
  tokens: CompiledFeatureToken[]
  domainCoverage: Record<SignalDomain, number>
  sourceCoverage: Record<string, number>
}

const DOMAINS: SignalDomain[] = [
  'career',
  'relationship',
  'wealth',
  'health',
  'timing',
  'personality',
  'spirituality',
  'move',
]

function pushToken(
  target: CompiledFeatureToken[],
  token: Omit<CompiledFeatureToken, 'label'> & { label?: string }
) {
  target.push({
    ...token,
    label: token.label || token.sourceValue,
  })
}

function normalizePathKey(path: string[]): string {
  return path
    .join('.')
    .replace(/\.\d+/g, '[]')
    .replace(/[^a-zA-Z0-9_.[\]-]/g, '')
}

function isScalar(value: unknown): value is string | number | boolean {
  return ['string', 'number', 'boolean'].includes(typeof value)
}

function walkNestedEntries(
  value: unknown,
  visit: (path: string[], value: string | number | boolean) => void,
  path: string[] = [],
  depth = 0,
  limit = { count: 0, max: 60 }
) {
  if (limit.count >= limit.max || value == null) return
  if (isScalar(value)) {
    visit(path, value)
    limit.count += 1
    return
  }
  if (depth >= 3) return
  if (Array.isArray(value)) {
    value.slice(0, 8).forEach((item, index) => walkNestedEntries(item, visit, [...path, String(index)], depth + 1, limit))
    return
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>)
      .slice(0, 16)
      .forEach(([key, nested]) => walkNestedEntries(nested, visit, [...path, key], depth + 1, limit))
  }
}

function compileSnapshotTokens(
  tokens: CompiledFeatureToken[],
  source: 'sajuSnapshot' | 'astrologySnapshot' | 'crossSnapshot',
  snapshot: Record<string, unknown> | undefined
) {
  if (!snapshot) return
  const preferredKeys: Record<typeof source, string[]> = {
    sajuSnapshot: ['unse', 'sinsal', 'advancedAnalysis', 'facts', 'pillars'],
    astrologySnapshot: ['natalChart', 'natalAspects', 'advancedAstroSignals', 'transits'],
    crossSnapshot: ['crossEvidence', 'crossAgreement', 'source', 'category', 'astroTimingIndex'],
  }
  for (const key of preferredKeys[source]) {
    if (!(key in snapshot)) continue
    const mapped = mapSnapshotOntology(source, key, snapshot[key])
    pushToken(tokens, {
      id: `${source}:${key}`,
      sourceKind: 'snapshot',
      sourceValue: `${source}:${key}`,
      ...mapped,
    })
  }

  walkNestedEntries(snapshot, (path, value) => {
    if (path.length === 0) return
    const pathKey = normalizePathKey(path)
    const mapped = mapSnapshotOntology(source, pathKey, value)
    pushToken(tokens, {
      id: `${source}:${pathKey}`,
      sourceKind: 'snapshot',
      sourceValue: `${source}:${pathKey}=${String(value)}`,
      ...mapped,
      weight: Math.min(mapped.weight + 0.04, 0.74),
    })
  })
}

function compileProfileContextTokens(
  tokens: CompiledFeatureToken[],
  profileContext: MatrixCalculationInput['profileContext'] | undefined,
  currentDateIso: string | undefined,
  startYearMonth: string | undefined
) {
  if (!profileContext && !currentDateIso && !startYearMonth) return

  const profileSnapshot = {
    ...(profileContext || {}),
    ...(currentDateIso ? { currentDateIso } : {}),
    ...(startYearMonth ? { startYearMonth } : {}),
  }

  walkNestedEntries(profileSnapshot, (path, value) => {
    if (path.length === 0) return
    const pathKey = normalizePathKey(path)
    const mapped = mapSnapshotOntology('crossSnapshot', pathKey, value)
    pushToken(tokens, {
      id: `profileContext:${pathKey}`,
      sourceKind: 'snapshot',
      sourceValue: `profileContext:${pathKey}=${String(value)}`,
      ...mapped,
      weight: Math.min(mapped.weight + 0.02, 0.68),
    })
  })
}

function compileAdvancedAstroTokens(
  tokens: CompiledFeatureToken[],
  advancedAstroSignals: NonNullable<MatrixCalculationInput['advancedAstroSignals']> | undefined
) {
  if (!advancedAstroSignals) return

  for (const [key, value] of Object.entries(advancedAstroSignals)) {
    if (!value) continue
    const mapped = mapAdvancedAstroOntology(key)
    pushToken(tokens, {
      id: `advanced:${key}`,
      sourceKind: 'advanced_astro',
      sourceValue: key,
      ...mapped,
    })

    if (typeof value === 'object') {
      walkNestedEntries(value, (path, nestedValue) => {
        const pathKey = normalizePathKey([key, ...path])
        const nestedMapped = mapAdvancedAstroOntology(pathKey)
        pushToken(tokens, {
          id: `advanced:${pathKey}`,
          sourceKind: 'advanced_astro',
          sourceValue: `${pathKey}=${String(nestedValue)}`,
          ...nestedMapped,
          weight: Math.min(nestedMapped.weight + 0.03, 0.76),
        })
      })
    } else if (isScalar(value) && value !== true) {
      const pathKey = normalizePathKey([key, String(value)])
      const nestedMapped = mapAdvancedAstroOntology(pathKey)
      pushToken(tokens, {
        id: `advanced:${pathKey}`,
        sourceKind: 'advanced_astro',
        sourceValue: `${key}=${String(value)}`,
        ...nestedMapped,
        weight: Math.min(nestedMapped.weight + 0.02, 0.74),
      })
    }
  }
}

export function compileFeatureTokens(input: MatrixCalculationInput): FeatureCompilationResult {
  const tokens: CompiledFeatureToken[] = []

  pushToken(tokens, {
    id: `day-master:${input.dayMasterElement}`,
    sourceKind: 'day_master',
    sourceValue: `dayMaster:${String(input.dayMasterElement)}`,
    ...mapElementOntology('day_master', String(input.dayMasterElement)),
  })

  const pillarCounts = new Map<string, number>()
  for (const element of input.pillarElements || []) {
    const key = String(element)
    pillarCounts.set(key, (pillarCounts.get(key) || 0) + 1)
  }
  for (const [element, count] of pillarCounts.entries()) {
    pushToken(tokens, {
      id: `pillar:${element}`,
      sourceKind: 'pillar_element',
      sourceValue: `pillar:${element}x${count}`,
      ...mapElementOntology('pillar_element', element),
      weight: Math.min(0.3 + count * 0.08, 0.58),
    })
  }

  if (input.dominantWesternElement) {
    pushToken(tokens, {
      id: `dominant:${input.dominantWesternElement}`,
      sourceKind: 'dominant_element',
      sourceValue: `dominant:${input.dominantWesternElement}`,
      ...mapElementOntology('dominant_element', String(input.dominantWesternElement)),
    })
  }

  const sibsinEntries = Object.entries(input.sibsinDistribution || {}).filter(([, count]) => (count || 0) > 0)
  for (const [sibsin, count] of sibsinEntries) {
    const mapped = mapSibsinOntology(sibsin, Number(count || 0))
    pushToken(tokens, {
      id: `sibsin:${sibsin}`,
      sourceKind: 'sibsin',
      sourceValue: `${sibsin}:${count}`,
      ...mapped,
    })
  }

  const stageEntries = Object.entries(input.twelveStages || {}).filter(([, count]) => (count || 0) > 0)
  for (const [stage, count] of stageEntries) {
    const mapped = mapTwelveStageOntology(stage, Number(count || 0))
    pushToken(tokens, {
      id: `stage:${stage}`,
      sourceKind: 'twelve_stage',
      sourceValue: `${stage}:${count}`,
      ...mapped,
    })
  }

  for (const relation of input.relations || []) {
    const mapped = mapRelationOntology(relation)
    const relationKey = `${String((relation as any)?.kind || 'relation')}:${String((relation as any)?.detail || '')}`
    pushToken(tokens, {
      id: `relation:${relationKey}`,
      sourceKind: 'relation',
      sourceValue: relationKey,
      ...mapped,
    })
  }

  for (const shinsal of input.shinsalList || []) {
    const mapped = mapShinsalOntology(shinsal)
    pushToken(tokens, {
      id: `shinsal:${shinsal}`,
      sourceKind: 'shinsal',
      sourceValue: String(shinsal),
      ...mapped,
    })
  }

  for (const transit of input.activeTransits || []) {
    const mapped = mapTransitOntology(transit)
    pushToken(tokens, {
      id: `transit:${transit}`,
      sourceKind: 'transit',
      sourceValue: String(transit),
      ...mapped,
    })
  }

  for (const [planet, house] of Object.entries(input.planetHouses || {})) {
    if (!house) continue
    const mapped = mapPlanetHouseOntology(planet, Number(house))
    pushToken(tokens, {
      id: `planet-house:${planet}:${house}`,
      sourceKind: 'planet_house',
      sourceValue: `${planet}@H${house}`,
      ...mapped,
    })
  }

  for (const [planet, sign] of Object.entries(input.planetSigns || {})) {
    if (!sign) continue
    const mapped = mapPlanetSignOntology(planet, String(sign))
    pushToken(tokens, {
      id: `planet-sign:${planet}:${sign}`,
      sourceKind: 'planet_sign',
      sourceValue: `${planet}@${sign}`,
      ...mapped,
    })
  }

  for (const aspect of input.aspects || []) {
    const mapped = mapAspectOntology(aspect.type, aspect.planet1, aspect.planet2)
    pushToken(tokens, {
      id: `aspect:${aspect.planet1}:${aspect.planet2}:${aspect.type}`,
      sourceKind: 'aspect',
      sourceValue: `${aspect.planet1}-${aspect.planet2}-${aspect.type}`,
      ...mapped,
    })
  }

  for (const [asteroid, house] of Object.entries(input.asteroidHouses || {})) {
    if (!house) continue
    const mapped = mapAsteroidHouseOntology(asteroid, Number(house))
    pushToken(tokens, {
      id: `asteroid:${asteroid}:${house}`,
      sourceKind: 'asteroid_house',
      sourceValue: `${asteroid}@H${house}`,
      ...mapped,
    })
  }

  for (const [point, sign] of Object.entries(input.extraPointSigns || {})) {
    if (!sign) continue
    const mapped = mapExtraPointOntology(point, String(sign))
    pushToken(tokens, {
      id: `extra-point:${point}:${sign}`,
      sourceKind: 'extra_point',
      sourceValue: `${point}@${sign}`,
      ...mapped,
    })
  }

  if (input.geokguk) {
    pushToken(tokens, {
      id: `geokguk:${input.geokguk}`,
      sourceKind: 'geokguk',
      sourceValue: input.geokguk,
      domainHints: ['career', 'wealth', 'personality'],
      axes: ['structure', 'meaning', 'resource_flow'],
      weight: 0.78,
      role: 'core',
    })
  }

  if (input.yongsin) {
    pushToken(tokens, {
      id: `yongsin:${input.yongsin}`,
      sourceKind: 'yongsin',
      sourceValue: String(input.yongsin),
      domainHints: ['personality', 'health', 'wealth'],
      axes: ['structure', 'recovery', 'resource_flow'],
      weight: 0.72,
      role: 'core',
    })
  }

  const cycles: Array<['daeun' | 'saeun' | 'wolun' | 'ilun', string | undefined]> = [
    ['daeun', input.currentDaeunElement],
    ['saeun', input.currentSaeunElement],
    ['wolun', input.currentWolunElement],
    ['ilun', input.currentIljinElement || input.currentIljinDate],
  ]
  for (const [cycle, value] of cycles) {
    if (!value) continue
    const mapped = mapCycleOntology(cycle, String(value))
    pushToken(tokens, {
      id: `${cycle}:${value}`,
      sourceKind: 'cycle',
      sourceValue: `${cycle}:${value}`,
      ...mapped,
    })
  }

  if (input.currentIljinDate) {
    const mapped = mapCycleOntology('ilun', String(input.currentIljinDate))
    pushToken(tokens, {
      id: `ilun-date:${input.currentIljinDate}`,
      sourceKind: 'cycle',
      sourceValue: `ilun-date:${input.currentIljinDate}`,
      ...mapped,
      weight: Math.min(mapped.weight + 0.04, 0.72),
    })
  }

  compileAdvancedAstroTokens(tokens, input.advancedAstroSignals)

  compileSnapshotTokens(tokens, 'sajuSnapshot', input.sajuSnapshot)
  compileSnapshotTokens(tokens, 'astrologySnapshot', input.astrologySnapshot)
  compileSnapshotTokens(tokens, 'crossSnapshot', input.crossSnapshot)
  compileProfileContextTokens(tokens, input.profileContext, input.currentDateIso, input.startYearMonth)

  const domainCoverage = Object.fromEntries(DOMAINS.map((domain) => [domain, 0])) as Record<
    SignalDomain,
    number
  >
  const sourceCoverage: Record<string, number> = {}
  for (const token of tokens) {
    for (const domain of token.domainHints) {
      domainCoverage[domain] += token.weight
    }
    sourceCoverage[token.sourceKind] = (sourceCoverage[token.sourceKind] || 0) + 1
  }

  return {
    tokens,
    domainCoverage,
    sourceCoverage,
  }
}
