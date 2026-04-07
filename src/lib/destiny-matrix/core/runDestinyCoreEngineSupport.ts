import { createHash } from 'node:crypto'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type {
  CrossAgreementDomain,
  CrossAgreementTimescale,
  CrossAgreementMatrixRow,
  DomainKey,
  MatrixCalculationInput,
  MatrixSummary,
} from '@/lib/destiny-matrix/types'
import {
  synthesizeMatrixSignals,
  type SignalSynthesisResult,
} from '@/lib/destiny-matrix/core/signalSynthesizer'
import { compileFeatureTokens } from '@/lib/destiny-matrix/core/tokenCompiler'
import { buildActivationEngine } from '@/lib/destiny-matrix/core/activationEngine'
import { buildRuleEngine } from '@/lib/destiny-matrix/core/ruleEngine'
import { buildStateEngine } from '@/lib/destiny-matrix/core/stateEngine'
import {
  buildPhaseStrategyEngine,
  type StrategyEngineResult,
} from '@/lib/destiny-matrix/core/strategyEngine'
import { buildPatternEngine, type PatternResult } from '@/lib/destiny-matrix/core/patternEngine'
import { buildScenarioEngine, type ScenarioResult } from '@/lib/destiny-matrix/core/scenarioEngine'
import {
  buildDecisionEngine,
  type DecisionEngineResult,
} from '@/lib/destiny-matrix/core/decisionEngine'
import { buildCoreCanonicalOutput } from '@/lib/destiny-matrix/core/canonical'
import type { DestinyCoreCanonicalOutput } from '@/lib/destiny-matrix/core/types'
import { normalizeMatrixInput } from '@/lib/destiny-matrix/core/inputNormalization'
import {
  buildDestinyLatentState,
  type DestinyLatentState,
} from '@/lib/destiny-matrix/core/latentState'

export type AvailabilityState = 'present' | 'empty-computed' | 'missing-upstream'

export interface MatrixInputAvailability {
  shinsal: AvailabilityState
  activeTransits: AvailabilityState
  advancedAstroSignals: AvailabilityState
}

export interface MatrixCalculationInputNormalized extends MatrixCalculationInput {
  shinsalList: NonNullable<MatrixCalculationInput['shinsalList']>
  activeTransits: NonNullable<MatrixCalculationInput['activeTransits']>
  advancedAstroSignals: NonNullable<MatrixCalculationInput['advancedAstroSignals']>
  availability: MatrixInputAvailability
}

function clampUnit(value: number): number {
  return clamp(value, 0, 1)
}

const CROSS_TIMESCALE_WEIGHTS: Record<string, number> = {
  now: 1,
  '1-3m': 0.92,
  '3-6m': 0.78,
  '6-12m': 0.64,
}

const SYNTHETIC_CROSS_DOMAINS: CrossAgreementDomain[] = [
  'career',
  'relationship',
  'wealth',
  'health',
  'move',
]

const CROSS_TIMESCALES: CrossAgreementTimescale[] = ['now', '1-3m', '3-6m', '6-12m']

const CROSS_DOMAIN_TO_SUMMARY_KEY: Record<CrossAgreementDomain, DomainKey | null> = {
  career: 'career',
  relationship: 'love',
  wealth: 'money',
  health: 'health',
  move: 'move',
  personality: null,
  spirituality: null,
  timing: null,
}

function normalizeScoreToUnit(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  if (raw <= 1) return clampUnit(raw)
  if (raw <= 10) return clampUnit(raw / 10)
  return clampUnit(raw / 100)
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function monthDiff(fromIso: string | undefined, targetMonth: string | undefined): number | null {
  if (!fromIso || !targetMonth) return null
  const from = /^(\d{4})-(\d{2})/.exec(fromIso)
  const target = /^(\d{4})-(\d{2})/.exec(targetMonth)
  if (!from || !target) return null
  const fromYear = Number(from[1])
  const fromMonth = Number(from[2])
  const targetYear = Number(target[1])
  const targetMonthNum = Number(target[2])
  if (![fromYear, fromMonth, targetYear, targetMonthNum].every(Number.isFinite)) return null
  return (targetYear - fromYear) * 12 + (targetMonthNum - fromMonth)
}

function getRelevantSibsinCount(
  distribution: MatrixCalculationInputNormalized['sibsinDistribution'],
  keys: string[]
): number {
  return keys.reduce((sum, key) => {
    const value = distribution[key as keyof typeof distribution]
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0)
  }, 0)
}

function countPlanetsInHouses(
  houses: MatrixCalculationInputNormalized['planetHouses'],
  targetHouses: number[]
): number {
  return Object.values(houses).filter(
    (house) => typeof house === 'number' && targetHouses.includes(house)
  ).length
}

function countTransitMatches(
  activeTransits: MatrixCalculationInputNormalized['activeTransits'],
  keys: string[]
): number {
  return activeTransits.filter((item) => keys.includes(String(item))).length
}

function computeHeuristicSajuSupport(
  input: MatrixCalculationInputNormalized,
  domain: CrossAgreementDomain
): number {
  if (domain === 'career') {
    const sibsin = getRelevantSibsinCount(input.sibsinDistribution, [
      'jeonggwan',
      'pyeongwan',
      'siksin',
      'sanggwan',
    ])
    return clampUnit(
      0.2 + (input.geokguk ? 0.14 : 0) + (input.currentDaeunElement ? 0.12 : 0) + sibsin * 0.08
    )
  }
  if (domain === 'relationship') {
    return clampUnit(
      0.18 +
        Math.min(0.3, input.relations.length * 0.08) +
        Math.min(0.12, input.shinsalList.length * 0.02)
    )
  }
  if (domain === 'wealth') {
    const sibsin = getRelevantSibsinCount(input.sibsinDistribution, ['jeongjae', 'pyeonjae'])
    return clampUnit(0.18 + (input.yongsin ? 0.16 : 0) + (input.geokguk ? 0.06 : 0) + sibsin * 0.1)
  }
  if (domain === 'health') {
    return clampUnit(
      0.22 +
        (input.currentSaeunElement ? 0.14 : 0) +
        (input.currentWolunElement ? 0.12 : 0) +
        (input.currentIljinElement ? 0.08 : 0)
    )
  }
  if (domain === 'move') {
    const moveShinsal = input.shinsalList.some((item) => String(item) === '역마')
    return clampUnit(
      0.18 +
        (moveShinsal ? 0.2 : 0) +
        (input.currentWolunElement ? 0.08 : 0) +
        Math.min(0.18, input.activeTransits.length * 0.04)
    )
  }
  return 0.5
}

function computeHeuristicAstroSupport(
  input: MatrixCalculationInputNormalized,
  domain: CrossAgreementDomain
): number {
  if (domain === 'career') {
    const houseHits = countPlanetsInHouses(input.planetHouses, [6, 10])
    const transitHits = countTransitMatches(input.activeTransits, ['saturnReturn', 'jupiterReturn'])
    return clampUnit(
      0.18 + houseHits * 0.12 + transitHits * 0.12 + Math.min(0.14, input.aspects.length * 0.02)
    )
  }
  if (domain === 'relationship') {
    const houseHits = countPlanetsInHouses(input.planetHouses, [5, 7])
    return clampUnit(0.2 + houseHits * 0.12 + Math.min(0.22, input.aspects.length * 0.04))
  }
  if (domain === 'wealth') {
    const houseHits = countPlanetsInHouses(input.planetHouses, [2, 8, 11])
    const transitHits = countTransitMatches(input.activeTransits, [
      'jupiterReturn',
      'venusRetrograde',
    ])
    return clampUnit(
      0.16 + houseHits * 0.11 + transitHits * 0.1 + Math.min(0.12, input.aspects.length * 0.02)
    )
  }
  if (domain === 'health') {
    const houseHits = countPlanetsInHouses(input.planetHouses, [6, 12])
    const transitHits = countTransitMatches(input.activeTransits, [
      'saturnReturn',
      'marsRetrograde',
      'saturnRetrograde',
    ])
    return clampUnit(
      0.18 + houseHits * 0.1 + transitHits * 0.12 + Math.min(0.12, input.aspects.length * 0.02)
    )
  }
  if (domain === 'move') {
    const houseHits = countPlanetsInHouses(input.planetHouses, [3, 4, 9])
    const transitHits = countTransitMatches(input.activeTransits, [
      'uranusSquare',
      'eclipse',
      'plutoTransit',
    ])
    return clampUnit(
      0.16 + houseHits * 0.1 + transitHits * 0.12 + Math.min(0.12, input.aspects.length * 0.02)
    )
  }
  return 0.5
}

function resolveReportDomainSupport(
  report: FusionReport,
  domain: CrossAgreementDomain
): number | null {
  const aliases: Record<CrossAgreementDomain, string[]> = {
    career: ['career'],
    relationship: ['relationship', 'love'],
    wealth: ['wealth', 'money'],
    health: ['health'],
    move: ['move', 'mobility'],
    personality: ['personality'],
    spirituality: ['spirituality'],
    timing: ['timing'],
  }
  const hit = (report.domainAnalysis || []).find((item) =>
    aliases[domain].includes(String((item as { domain?: string }).domain || '').toLowerCase())
  ) as { score?: number } | undefined
  return normalizeScoreToUnit(hit?.score)
}

function resolveAstroTimingByTimescale(
  input: MatrixCalculationInputNormalized,
  timescale: CrossAgreementTimescale
): number {
  const astroTiming = input.crossSnapshot?.astroTimingIndex || input.astroTimingIndex
  if (!astroTiming) return 0.5
  if (timescale === 'now') {
    return clampUnit(astroTiming.daily * 0.65 + astroTiming.monthly * 0.35)
  }
  if (timescale === '1-3m') {
    return clampUnit(astroTiming.monthly * 0.7 + astroTiming.annual * 0.3)
  }
  if (timescale === '3-6m') {
    return clampUnit(
      astroTiming.annual * 0.65 + astroTiming.monthly * 0.2 + astroTiming.decade * 0.15
    )
  }
  return clampUnit(astroTiming.annual * 0.45 + astroTiming.decade * 0.55)
}

function resolveSajuTimingByTimescale(
  input: MatrixCalculationInputNormalized,
  timescale: CrossAgreementTimescale
): number {
  if (timescale === 'now') {
    return clampUnit(
      0.26 +
        (input.currentIljinElement || input.currentIljinDate ? 0.34 : 0) +
        (input.currentWolunElement ? 0.16 : 0) +
        (input.currentSaeunElement ? 0.08 : 0)
    )
  }
  if (timescale === '1-3m') {
    return clampUnit(
      0.3 +
        (input.currentWolunElement ? 0.28 : 0) +
        (input.currentSaeunElement ? 0.16 : 0) +
        (input.currentIljinElement ? 0.08 : 0)
    )
  }
  if (timescale === '3-6m') {
    return clampUnit(
      0.34 +
        (input.currentSaeunElement ? 0.26 : 0) +
        (input.currentDaeunElement ? 0.14 : 0) +
        (input.currentWolunElement ? 0.08 : 0)
    )
  }
  return clampUnit(
    0.38 + (input.currentDaeunElement ? 0.28 : 0) + (input.currentSaeunElement ? 0.12 : 0)
  )
}

function resolveTimelineProximity(
  points: NonNullable<MatrixSummary['overlapTimelineByDomain']>[DomainKey] | undefined,
  currentDateIso: string | undefined,
  timescale: CrossAgreementTimescale
): number {
  if (!points?.length) return 0.45
  const ranges: Record<CrossAgreementTimescale, [number, number]> = {
    now: [0, 1],
    '1-3m': [0, 3],
    '3-6m': [2, 6],
    '6-12m': [5, 12],
  }
  const [minDiff, maxDiff] = ranges[timescale]
  let best = 0.25
  for (const point of points) {
    const diff = monthDiff(currentDateIso, point.month)
    if (diff === null) continue
    const absDiff = Math.abs(diff)
    if (absDiff < minDiff || absDiff > maxDiff) continue
    const closeness = 1 - (absDiff - minDiff) / Math.max(1, maxDiff - minDiff + 1)
    best = Math.max(best, clampUnit(point.overlapStrength * 0.78 + closeness * 0.22))
  }
  return best
}

function buildSyntheticCrossAgreementMatrix(input: {
  normalizedInput: MatrixCalculationInputNormalized
  matrixSummary?: MatrixSummary
  matrixReport: FusionReport
}): CrossAgreementMatrixRow[] {
  const rows: CrossAgreementMatrixRow[] = []

  for (const domain of SYNTHETIC_CROSS_DOMAINS) {
    const summaryKey = CROSS_DOMAIN_TO_SUMMARY_KEY[domain]
    const domainScore = summaryKey ? input.matrixSummary?.domainScores?.[summaryKey] : undefined
    const overlapPoints = summaryKey
      ? input.matrixSummary?.overlapTimelineByDomain?.[summaryKey]
      : undefined
    const reportSupport = resolveReportDomainSupport(input.matrixReport, domain)
    const sajuSupport = clampUnit(
      domainScore?.sajuComponentScore ?? computeHeuristicSajuSupport(input.normalizedInput, domain)
    )
    const astroSupport = clampUnit(
      domainScore?.astroComponentScore ??
        computeHeuristicAstroSupport(input.normalizedInput, domain)
    )
    const overlapStrength = clampUnit(
      overlapPoints?.[0]?.overlapStrength ??
        domainScore?.overlapStrength ??
        input.matrixSummary?.overlapStrength ??
        0.45
    )
    const confidence = clampUnit(
      domainScore?.confidenceScore ?? (reportSupport ?? 0.5) * 0.4 + overlapStrength * 0.25 + 0.3
    )
    const semanticBridge = clampUnit(1 - Math.abs(sajuSupport - astroSupport))
    const alignmentScore = clampUnit(
      domainScore?.alignmentScore ??
        semanticBridge * 0.6 + (reportSupport ?? semanticBridge) * 0.25 + overlapStrength * 0.15
    )
    const evidenceDensity = clampUnit(
      (summaryKey && domainScore ? 0.24 : 0) +
        Math.min(0.18, (overlapPoints?.length || 0) * 0.06) +
        Math.min(0.14, input.normalizedInput.aspects.length * 0.015) +
        Math.min(0.16, input.normalizedInput.relations.length * 0.04) +
        Math.min(0.12, input.normalizedInput.activeTransits.length * 0.03) +
        (reportSupport !== null ? 0.12 : 0)
    )

    const domainStrength = clampUnit(
      alignmentScore * 0.36 +
        semanticBridge * 0.24 +
        ((sajuSupport + astroSupport) / 2) * 0.22 +
        overlapStrength * 0.1 +
        confidence * 0.08
    )
    if (domainStrength < 0.33) continue

    const timescales = {} as CrossAgreementMatrixRow['timescales']
    let leadLagAccumulator = 0
    let leadLagCount = 0

    for (const timescale of CROSS_TIMESCALES) {
      const sajuTiming = resolveSajuTimingByTimescale(input.normalizedInput, timescale)
      const astroTiming = resolveAstroTimingByTimescale(input.normalizedInput, timescale)
      const proximity = resolveTimelineProximity(
        overlapPoints,
        input.normalizedInput.currentDateIso,
        timescale
      )
      const timingParity = clampUnit(1 - Math.abs(astroTiming - sajuTiming))
      const contradiction = clampUnit(
        Math.abs(sajuSupport - astroSupport) * 0.48 +
          (1 - alignmentScore) * 0.24 +
          Math.abs(astroTiming - sajuTiming) * 0.18 +
          Math.max(0, 0.52 - proximity) * 0.1
      )
      const agreement = clampUnit(
        domainStrength * 0.58 +
          timingParity * 0.16 +
          proximity * 0.12 +
          confidence * 0.08 +
          (reportSupport ?? domainStrength) * 0.06 -
          contradiction * 0.1 +
          evidenceDensity * 0.08
      )
      const leadLag = round3(clamp(astroTiming - sajuTiming, -1, 1))
      timescales[timescale] = {
        agreement: round3(agreement),
        contradiction: round3(contradiction),
        leadLag,
      }
      leadLagAccumulator += leadLag
      leadLagCount += 1
    }

    rows.push({
      domain,
      timescales,
      leadLag: leadLagCount > 0 ? round3(leadLagAccumulator / leadLagCount) : undefined,
    })
  }

  return rows
}

function mergeCrossAgreementMatrices(
  primary: CrossAgreementMatrixRow[],
  fallback: CrossAgreementMatrixRow[]
): CrossAgreementMatrixRow[] {
  if (primary.length > 0) {
    const fallbackByDomain = new Map(fallback.map((row) => [row.domain, row]))
    return primary.map((row) => {
      const fallbackRow = fallbackByDomain.get(row.domain)
      return {
        domain: row.domain,
        timescales: {
          ...(fallbackRow?.timescales || {}),
          ...(row.timescales || {}),
        },
        leadLag: typeof row.leadLag === 'number' ? row.leadLag : fallbackRow?.leadLag,
      }
    })
  }

  const merged = new Map<CrossAgreementDomain, CrossAgreementMatrixRow>()
  for (const row of fallback) {
    merged.set(row.domain, row)
  }
  return [...merged.values()]
}

function normalizeCrossAgreementMatrix(
  raw: CrossAgreementMatrixRow[] | undefined | null
): CrossAgreementMatrixRow[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((row) => row && typeof row.domain === 'string')
    .map((row) => ({
      domain: row.domain,
      timescales: Object.fromEntries(
        Object.entries(row.timescales || {})
          .filter(([, cell]) => cell && typeof cell.agreement === 'number')
          .map(([timescale, cell]) => [
            timescale,
            {
              agreement: clampUnit(Number(cell?.agreement || 0)),
              contradiction:
                typeof cell?.contradiction === 'number'
                  ? clampUnit(Number(cell.contradiction))
                  : undefined,
              leadLag:
                typeof cell?.leadLag === 'number' ? clamp(Number(cell.leadLag), -1, 1) : undefined,
            },
          ])
      ) as CrossAgreementMatrixRow['timescales'],
      leadLag: typeof row.leadLag === 'number' ? clamp(Number(row.leadLag), -1, 1) : undefined,
    }))
}

function deriveScalarCrossAgreement(
  matrix: CrossAgreementMatrixRow[],
  fallback?: number | null
): number | null {
  let weightedAgreementSum = 0
  let weightedBaseSum = 0
  let cellCount = 0
  const coveredDomains = new Set<string>()

  for (const row of matrix) {
    const domainLeadLag =
      typeof row.leadLag === 'number' && Number.isFinite(row.leadLag)
        ? clamp(Math.abs(row.leadLag), 0, 1)
        : 0
    for (const [timescale, cell] of Object.entries(row.timescales || {})) {
      if (!cell || typeof cell.agreement !== 'number' || !Number.isFinite(cell.agreement)) continue
      const agreement = clampUnit(cell.agreement)
      const contradiction =
        typeof cell.contradiction === 'number' && Number.isFinite(cell.contradiction)
          ? clampUnit(cell.contradiction)
          : 0
      const leadLag =
        typeof cell.leadLag === 'number' && Number.isFinite(cell.leadLag)
          ? clamp(Math.abs(cell.leadLag), 0, 1)
          : domainLeadLag
      const baseWeight = CROSS_TIMESCALE_WEIGHTS[timescale] || 0.58
      const stabilityWeight = clamp(1 - contradiction * 0.68 - leadLag * 0.26, 0.24, 1)
      const emphasisWeight = baseWeight * (0.85 + agreement * 0.15)
      weightedAgreementSum += agreement * stabilityWeight * emphasisWeight
      weightedBaseSum += emphasisWeight
      cellCount += 1
      coveredDomains.add(row.domain)
    }
  }

  if (cellCount > 0 && weightedBaseSum > 0) {
    const weightedAgreement = weightedAgreementSum / weightedBaseSum
    const coverageFactor = clamp(
      0.92 + Math.min(coveredDomains.size, 4) * 0.03 + Math.min(cellCount, 6) * 0.012,
      0.92,
      1
    )
    const matrixScore = round2(clampUnit(weightedAgreement * coverageFactor))

    if (typeof fallback === 'number' && Number.isFinite(fallback)) {
      const matrixShare = clamp(0.4 + cellCount * 0.08 + coveredDomains.size * 0.05, 0.45, 0.88)
      return round2(clampUnit(matrixScore * matrixShare + clampUnit(fallback) * (1 - matrixShare)))
    }

    return matrixScore
  }
  return typeof fallback === 'number' && Number.isFinite(fallback)
    ? round2(clampUnit(fallback))
    : null
}

export interface RunDestinyCoreParams {
  mode: 'comprehensive' | 'timing' | 'themed' | 'calendar'
  lang: 'ko' | 'en'
  matrixInput: MatrixCalculationInput
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
}

export interface DestinyCoreResult {
  normalizedInput: MatrixCalculationInputNormalized
  availability: MatrixInputAvailability
  signalSynthesis: SignalSynthesisResult
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  decisionEngine: DecisionEngineResult
  strategyEngine: StrategyEngineResult
  canonical: DestinyCoreCanonicalOutput
  quality: DestinyCoreQuality
  latentState: DestinyLatentState
  coreHash: string
}

export interface DestinyCoreQuality {
  score: number
  grade: 'A' | 'B' | 'C' | 'D'
  warnings: string[]
  dataQuality: {
    missingFields: string[]
    derivedFields: string[]
    conflictingFields: string[]
    qualityPenalties: string[]
    confidenceReason: string
  }
  metrics: {
    normalizedSignalCount: number
    selectedSignalCount: number
    selectedDomainCount: number
    patternCount: number
    compositePatternCount: number
    scenarioCount: number
    scenarioDomainCount: number
    advancedSignalCount: number
    snapshotSignalCount: number
    shinsalSignalCount: number
    relationSignalCount: number
    timingSignalCount: number
    strategySumValid: boolean
    decisionOptionCount: number
    decisionDomainCount: number
    gatedDecisionCount: number
    domainConflictCount: number
    verificationBias: boolean
    topScenarioGap: number
    topDecisionGap: number
    scenarioClusterCompression: number
    focusDomainAmbiguity: number
  }
}

function buildDataQualityMetadata(input: {
  normalizedInput: MatrixCalculationInputNormalized
  canonical: DestinyCoreCanonicalOutput
  warnings: string[]
  strategySumValid: boolean
  focusDomainAmbiguity: number
}): DestinyCoreQuality['dataQuality'] {
  const profile = input.normalizedInput.profileContext
  const missingFields = [
    ...(profile?.birthDate ? [] : ['birthDate']),
    ...(profile?.birthTime ? [] : ['birthTime']),
    ...(profile?.timezone ? [] : ['timezone']),
    ...(typeof profile?.latitude === 'number' && typeof profile?.longitude === 'number'
      ? []
      : ['coordinates']),
    ...(input.normalizedInput.astroTimingIndex ||
    input.normalizedInput.crossSnapshot?.astroTimingIndex
      ? []
      : ['astroTimingIndex']),
    ...(input.normalizedInput.currentDaeunElement ? [] : ['currentDaeunElement']),
    ...(input.normalizedInput.currentSaeunElement ? [] : ['currentSaeunElement']),
    ...(input.normalizedInput.currentWolunElement ? [] : ['currentWolunElement']),
    ...(input.normalizedInput.currentIljinElement || input.normalizedInput.currentIljinDate
      ? []
      : ['currentIljin']),
    ...(input.normalizedInput.availability.activeTransits === 'missing-upstream'
      ? ['activeTransits']
      : []),
    ...(input.normalizedInput.availability.shinsal === 'missing-upstream' ? ['shinsalList'] : []),
    ...(input.normalizedInput.availability.advancedAstroSignals === 'missing-upstream'
      ? ['advancedAstroSignals']
      : []),
  ]

  const derivedFields = [
    ...(String(input.normalizedInput.sajuSnapshot?.source || '').includes('auto-derived')
      ? ['sajuSnapshot']
      : []),
    ...(String(input.normalizedInput.crossSnapshot?.source || '').includes('auto-derived')
      ? ['crossSnapshot']
      : []),
    ...(input.normalizedInput.astrologySnapshot?.currentTransits
      ? ['astrologySnapshot.currentTransits']
      : []),
    ...(input.normalizedInput.currentIljinDate ? ['currentIljinDate'] : []),
  ]

  const conflictingFields = [
    ...(typeof input.canonical.crossAgreement === 'number' && input.canonical.crossAgreement < 0.4
      ? ['crossAgreement']
      : []),
    ...(input.canonical.coherenceAudit.domainConflictCount > 0 ? ['domainSignals'] : []),
    ...(input.focusDomainAmbiguity >= 0.55 ? ['focusDomain'] : []),
    ...(input.strategySumValid ? [] : ['strategyBalance']),
  ]

  const qualityPenalties = [
    ...missingFields.map((field) => `missing:${field}`),
    ...derivedFields.map((field) => `derived:${field}`),
    ...conflictingFields.map((field) => `conflict:${field}`),
    ...(input.warnings || []).map((warning) => `warning:${warning}`),
  ]

  const confidenceReasonParts: string[] = []
  if (conflictingFields.length > 0) {
    confidenceReasonParts.push(`conflicts in ${conflictingFields.join(', ')}`)
  }
  if (missingFields.length > 0) {
    confidenceReasonParts.push(`missing ${missingFields.slice(0, 4).join(', ')}`)
  }
  if (derivedFields.length > 0) {
    confidenceReasonParts.push(`derived support from ${derivedFields.slice(0, 3).join(', ')}`)
  }
  if (input.canonical.coherenceAudit.verificationBias) {
    confidenceReasonParts.push('verification-first bias is active')
  }
  if (confidenceReasonParts.length === 0) {
    confidenceReasonParts.push('inputs are sufficiently aligned and grounded')
  }

  return {
    missingFields: [...new Set(missingFields)],
    derivedFields: [...new Set(derivedFields)],
    conflictingFields: [...new Set(conflictingFields)],
    qualityPenalties: [...new Set(qualityPenalties)],
    confidenceReason: confidenceReasonParts.join('; '),
  }
}

function normalizeArrayAvailability<T>(value: T[] | undefined): {
  items: T[]
  state: AvailabilityState
} {
  if (value === undefined) return { items: [], state: 'missing-upstream' }
  if (!Array.isArray(value) || value.length === 0) return { items: [], state: 'empty-computed' }
  return { items: value, state: 'present' }
}

function normalizeAdvancedAstroSignals(value: MatrixCalculationInput['advancedAstroSignals']): {
  value: NonNullable<MatrixCalculationInput['advancedAstroSignals']>
  state: AvailabilityState
} {
  if (!value) return { value: {}, state: 'missing-upstream' }
  const enabledCount = Object.values(value).filter((flag) => {
    if (flag === true) return true
    if (typeof flag === 'number') return Number.isFinite(flag) && flag !== 0
    if (typeof flag === 'string') {
      const normalized = flag.trim().toLowerCase()
      return (
        Boolean(normalized) && !['false', '0', 'none', 'null', 'undefined'].includes(normalized)
      )
    }
    if (Array.isArray(flag)) return flag.length > 0
    if (flag && typeof flag === 'object') return Object.keys(flag).length > 0
    return false
  }).length
  if (enabledCount === 0) return { value, state: 'empty-computed' }
  return { value, state: 'present' }
}

export function buildNormalizedMatrixInput(
  raw: MatrixCalculationInput
): MatrixCalculationInputNormalized {
  const shinsal = normalizeArrayAvailability(raw.shinsalList)
  const transits = normalizeArrayAvailability(raw.activeTransits)
  const advanced = normalizeAdvancedAstroSignals(raw.advancedAstroSignals)
  const availability: MatrixInputAvailability = {
    shinsal: shinsal.state,
    activeTransits: transits.state,
    advancedAstroSignals: advanced.state,
  }

  return {
    ...raw,
    shinsalList: shinsal.items,
    activeTransits: transits.items,
    advancedAstroSignals: advanced.value,
    availability,
  }
}

function buildSafeStrategyFallback(lang: 'ko' | 'en'): StrategyEngineResult {
  return {
    overallPhase: 'stabilize',
    overallPhaseLabel: lang === 'ko' ? 'Stabilize' : 'Stabilize',
    attackPercent: 50,
    defensePercent: 50,
    thesis: 'Signal density is low; operate in verification-first mode.',
    vector: { expansion: 0.5, volatility: 0.5, structure: 0.5 },
    vectorMode: 'v1-multi-domain',
    domainStrategies: [],
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function scoreByThreshold(value: number, target: number, maxPoints: number): number {
  if (target <= 0) return maxPoints
  return clamp(Math.round((value / target) * maxPoints), 0, maxPoints)
}

function computeScenarioSharpness(scenarios: ScenarioResult[]): {
  topScenarioGap: number
  scenarioClusterCompression: number
} {
  const ranked = [...(scenarios || [])]
    .sort((a, b) => (b.rawScore ?? b.probability) - (a.rawScore ?? a.probability))
    .slice(0, 5)
  if (ranked.length === 0) {
    return { topScenarioGap: 0, scenarioClusterCompression: 0 }
  }
  const top = ranked[0]?.rawScore ?? ranked[0]?.probability ?? 0
  const second = ranked[1]?.rawScore ?? ranked[1]?.probability ?? 0
  const meanTop =
    ranked.reduce((sum, scenario) => sum + (scenario.rawScore ?? scenario.probability), 0) /
    ranked.length
  const topScenarioGap = top > 0 ? round2((top - second) / top) : 0
  const scenarioClusterCompression = top > 0 ? round2(clamp(meanTop / top, 0, 1)) : 0
  return { topScenarioGap, scenarioClusterCompression }
}

function computeDecisionSharpness(decisionEngine: DecisionEngineResult): number {
  const ranked = [...decisionEngine.options].sort((a, b) => b.scores.total - a.scores.total)
  const top = ranked[0]?.scores.total ?? 0
  const second = ranked[1]?.scores.total ?? 0
  return top > 0 ? round2((top - second) / top) : 0
}

function computeFocusDomainAmbiguity(
  focusDomain: string | null | undefined,
  scenarios: ScenarioResult[],
  options: DecisionEngineResult['options']
): number {
  if (!focusDomain) return 1
  const topScenarios = [...scenarios]
    .sort((a, b) => (b.rawScore ?? b.probability) - (a.rawScore ?? a.probability))
    .slice(0, 5)
  const topOptions = [...options].sort((a, b) => b.scores.total - a.scores.total).slice(0, 4)
  const scenarioTotal = topScenarios.reduce(
    (sum, scenario) => sum + Math.max(0, scenario.rawScore ?? scenario.probability),
    0
  )
  const focusScenarioShare =
    scenarioTotal <= 0
      ? 0
      : topScenarios
          .filter((scenario) => scenario.domain === focusDomain)
          .reduce(
            (sum, scenario) => sum + Math.max(0, scenario.rawScore ?? scenario.probability),
            0
          ) / scenarioTotal
  const scenarioLeakage = topScenarios.length === 0 ? 1 : 1 - focusScenarioShare

  const optionTotal = topOptions.reduce((sum, option) => sum + Math.max(0, option.scores.total), 0)
  const focusOptionShare =
    optionTotal <= 0
      ? 0
      : topOptions
          .filter((option) => option.domain === focusDomain)
          .reduce((sum, option) => sum + Math.max(0, option.scores.total), 0) / optionTotal
  const optionLeakage = topOptions.length === 0 ? 1 : 1 - focusOptionShare
  return round2(clamp(scenarioLeakage * 0.6 + optionLeakage * 0.4, 0, 1))
}

function buildDestinyCoreQuality(input: {
  normalizedInput: MatrixCalculationInputNormalized
  signalSynthesis: SignalSynthesisResult
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  decisionEngine: DecisionEngineResult
  strategyEngine: StrategyEngineResult
  canonical: DestinyCoreCanonicalOutput
}): DestinyCoreQuality {
  const selectedDomains = new Set(
    (input.signalSynthesis.selectedSignals || []).flatMap((signal) => signal.domainHints || [])
  )
  const scenarioDomains = new Set((input.scenarios || []).map((scenario) => scenario.domain))
  const tags = (input.signalSynthesis.normalizedSignals || []).flatMap(
    (signal) => signal.tags || []
  )
  const countByTag = (tag: string) => tags.filter((item) => item === tag).length
  const timingSignalCount = (input.signalSynthesis.normalizedSignals || []).filter((signal) =>
    signal.domainHints.includes('timing')
  ).length
  const strategySumValid =
    input.strategyEngine.attackPercent + input.strategyEngine.defensePercent === 100
  const gatedDecisionCount = input.decisionEngine.options.filter((option) => option.gated).length
  const { topScenarioGap, scenarioClusterCompression } = computeScenarioSharpness(input.scenarios)
  const topDecisionGap = computeDecisionSharpness(input.decisionEngine)
  const focusDomainAmbiguity = computeFocusDomainAmbiguity(
    input.canonical.focusDomain,
    input.scenarios,
    input.decisionEngine.options
  )

  let score = 0
  score += scoreByThreshold(input.signalSynthesis.selectedSignals.length, 7, 14)
  score += scoreByThreshold(selectedDomains.size, 4, 10)
  score += scoreByThreshold(input.signalSynthesis.normalizedSignals.length, 24, 15)
  score += scoreByThreshold(input.patterns.length, 10, 13)
  score += scoreByThreshold(
    input.patterns.filter((pattern) => pattern.id.startsWith('composite_')).length,
    2,
    10
  )
  score += scoreByThreshold(input.scenarios.length, 18, 14)
  score += scoreByThreshold(scenarioDomains.size, 4, 8)
  score += scoreByThreshold(countByTag('advanced-astro'), 6, 6)
  score += scoreByThreshold(countByTag('snapshot'), 4, 4)
  score += scoreByThreshold(countByTag('shinsal'), 2, 3)
  score += scoreByThreshold(countByTag('relation'), 2, 3)
  score += scoreByThreshold(timingSignalCount, 6, 3)
  score += strategySumValid ? 7 : 0
  score += scoreByThreshold(input.decisionEngine.options.length, 9, 4)
  score += scoreByThreshold(input.decisionEngine.domains.length, 3, 3)
  score +=
    gatedDecisionCount <= Math.ceil(Math.max(1, input.decisionEngine.options.length) * 0.5) ? 2 : 0
  score += Math.round((1 - scenarioClusterCompression) * 6)
  score += Math.round(topScenarioGap * 6)
  score += Math.round(topDecisionGap * 6)
  score += Math.round((1 - focusDomainAmbiguity) * 6)

  const warnings: string[] = []
  if (input.signalSynthesis.selectedSignals.length < 7) warnings.push('selected_signals_under_7')
  if (selectedDomains.size < 3) warnings.push('low_selected_domain_diversity')
  if (input.patterns.length < 8) warnings.push('pattern_count_low')
  if (input.scenarios.length < 12) warnings.push('scenario_count_low')
  if (scenarioDomains.size < 3) warnings.push('scenario_domain_coverage_low')
  if (!strategySumValid) warnings.push('strategy_percent_sum_invalid')
  if (input.decisionEngine.options.length < 6) warnings.push('decision_option_count_low')
  if (input.decisionEngine.domains.length < 2) warnings.push('decision_domain_coverage_low')
  if (input.canonical.coherenceAudit.domainConflictCount > 2) {
    warnings.push('domain_conflict_count_high')
  }
  if (input.canonical.coherenceAudit.gatedDecision && gatedDecisionCount >= 3) {
    warnings.push('gated_decision_pressure_high')
  }
  if (scenarioClusterCompression >= 0.94) warnings.push('scenario_cluster_compression_high')
  if (topScenarioGap <= 0.03) warnings.push('top_scenario_gap_low')
  if (topDecisionGap <= 0.05) warnings.push('top_decision_gap_low')
  if (focusDomainAmbiguity >= 0.45) warnings.push('focus_domain_ambiguity_high')
  const specificVerificationAction = new Set([
    'review_first',
    'negotiate_first',
    'boundary_first',
    'pilot_first',
    'route_recheck_first',
    'lease_review_first',
    'basecamp_reset_first',
  ])
  if (
    input.canonical.coherenceAudit.verificationBias &&
    !specificVerificationAction.has(input.canonical.topDecision?.action || '')
  ) {
    warnings.push('verification_bias_active')
  }
  if (
    input.normalizedInput.availability.advancedAstroSignals === 'present' &&
    countByTag('advanced-astro') < 2
  ) {
    warnings.push('advanced_astro_signal_coverage_low')
  }
  if (input.normalizedInput.availability.shinsal === 'present' && countByTag('shinsal') < 1) {
    warnings.push('shinsal_signal_coverage_low')
  }
  if (input.normalizedInput.availability.activeTransits === 'present' && timingSignalCount < 2) {
    warnings.push('timing_signal_coverage_low')
  }

  const normalizedScore = clamp(score, 0, 100)
  const grade: DestinyCoreQuality['grade'] =
    normalizedScore >= 90 ? 'A' : normalizedScore >= 80 ? 'B' : normalizedScore >= 70 ? 'C' : 'D'
  const dataQuality = buildDataQualityMetadata({
    normalizedInput: input.normalizedInput,
    canonical: input.canonical,
    warnings,
    strategySumValid,
    focusDomainAmbiguity,
  })

  return {
    score: normalizedScore,
    grade,
    warnings,
    dataQuality,
    metrics: {
      normalizedSignalCount: input.signalSynthesis.normalizedSignals.length,
      selectedSignalCount: input.signalSynthesis.selectedSignals.length,
      selectedDomainCount: selectedDomains.size,
      patternCount: input.patterns.length,
      compositePatternCount: input.patterns.filter((pattern) => pattern.id.startsWith('composite_'))
        .length,
      scenarioCount: input.scenarios.length,
      scenarioDomainCount: scenarioDomains.size,
      advancedSignalCount: countByTag('advanced-astro'),
      snapshotSignalCount: countByTag('snapshot'),
      shinsalSignalCount: countByTag('shinsal'),
      relationSignalCount: countByTag('relation'),
      timingSignalCount,
      strategySumValid,
      decisionOptionCount: input.decisionEngine.options.length,
      decisionDomainCount: input.decisionEngine.domains.length,
      gatedDecisionCount,
      domainConflictCount: input.canonical.coherenceAudit.domainConflictCount,
      verificationBias: input.canonical.coherenceAudit.verificationBias,
      topScenarioGap,
      topDecisionGap,
      scenarioClusterCompression,
      focusDomainAmbiguity,
    },
  }
}

export function computeDestinyCoreHash(input: {
  canonical: DestinyCoreCanonicalOutput
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  decisionEngine: DecisionEngineResult
}): string {
  const patternKeys = input.patterns
    .map((pattern) => `${pattern.id}:${pattern.family}:${pattern.profile}:${pattern.score}`)
    .sort()
  const scenarioKeys = input.scenarios
    .slice(0, 12)
    .map(
      (scenario) =>
        `${scenario.id}:${scenario.probability}:${scenario.window}:${scenario.timingRelevance}:${scenario.reversible ? 1 : 0}`
    )
    .sort()
  const decisionKeys = input.decisionEngine.options
    .slice(0, 8)
    .map((option) => `${option.id}:${option.scores.total}:${option.confidence}`)
    .sort()

  const payload = JSON.stringify({
    claimIds: [...input.canonical.claimIds].sort(),
    evidenceRefKeys: Object.keys(input.canonical.evidenceRefs).sort(),
    cautions: [...input.canonical.cautions].sort(),
    gradeLabel: input.canonical.gradeLabel,
    focusDomain: input.canonical.focusDomain,
    phase: input.canonical.phase,
    primaryAction: input.canonical.primaryAction,
    primaryCaution: input.canonical.primaryCaution,
    coherenceAudit: input.canonical.coherenceAudit,
    judgmentPolicy: input.canonical.judgmentPolicy,
    domainVerdicts: input.canonical.domainVerdicts.map((verdict) => ({
      domain: verdict.domain,
      mode: verdict.mode,
      confidence: verdict.confidence,
      leadPatternFamily: verdict.leadPatternFamily,
      leadScenarioId: verdict.leadScenarioId,
      allowedActions: verdict.allowedActions,
      blockedActions: verdict.blockedActions,
    })),
    advisories: input.canonical.advisories.map((advisory) => ({
      domain: advisory.domain,
      phase: advisory.phase,
      leadSignalIds: advisory.leadSignalIds,
      leadPatternIds: advisory.leadPatternIds,
      leadScenarioIds: advisory.leadScenarioIds,
    })),
    domainTimingWindows: input.canonical.domainTimingWindows.map((window) => ({
      domain: window.domain,
      window: window.window,
      confidence: window.confidence,
      timingRelevance: window.timingRelevance,
    })),
    manifestations: input.canonical.manifestations.map((item) => ({
      domain: item.domain,
      timingWindow: item.timingWindow,
      sourceCount: item.activationSources.length,
      likelyExpressions: item.likelyExpressions.slice(0, 3),
      riskExpressions: item.riskExpressions.slice(0, 3),
    })),
    attackPercent: input.canonical.attackPercent,
    defensePercent: input.canonical.defensePercent,
    confidence: input.canonical.confidence,
    leadPatternId: input.canonical.leadPatternId,
    leadScenarioId: input.canonical.leadScenarioId,
    topPatternFamilies: input.canonical.topPatterns.map(
      (pattern) => `${pattern.id}:${pattern.family}:${pattern.profile}`
    ),
    topPatternIds: input.canonical.topPatterns.map((pattern) => pattern.id),
    topScenarioIds: input.canonical.topScenarios.map((scenario) => scenario.id),
    topScenarioTiming: input.canonical.topScenarios.map(
      (scenario) => `${scenario.id}:${scenario.window}:${scenario.timingRelevance}`
    ),
    topDecisionId: input.canonical.topDecision?.id || null,
    patternKeys,
    scenarioKeys,
    decisionKeys,
  })
  return createHash('sha256').update(payload).digest('hex').slice(0, 20)
}

export function runDestinyCore(params: RunDestinyCoreParams): DestinyCoreResult {
  const normalizedInput = buildNormalizedMatrixInput(normalizeMatrixInput(params.matrixInput))
  const rawCrossAgreementMatrix = normalizeCrossAgreementMatrix(
    normalizedInput.crossSnapshot?.crossAgreementMatrix
  )
  const syntheticCrossAgreementMatrix = buildSyntheticCrossAgreementMatrix({
    normalizedInput,
    matrixSummary: params.matrixSummary,
    matrixReport: params.matrixReport,
  })
  const crossAgreementMatrix = mergeCrossAgreementMatrices(
    rawCrossAgreementMatrix,
    syntheticCrossAgreementMatrix
  )
  const crossAgreement = deriveScalarCrossAgreement(
    crossAgreementMatrix,
    typeof normalizedInput.crossSnapshot?.crossAgreement === 'number'
      ? normalizedInput.crossSnapshot.crossAgreement
      : null
  )
  const featureTokens = compileFeatureTokens(normalizedInput)
  const preActivation = buildActivationEngine({
    matrixInput: normalizedInput,
    tokens: featureTokens.tokens,
  })
  const preRules = buildRuleEngine({
    activation: preActivation,
    tokens: featureTokens.tokens,
  })
  const preStates = buildStateEngine({
    lang: params.lang,
    activation: preActivation,
    rules: preRules,
  })
  const signalSynthesis = synthesizeMatrixSignals({
    lang: params.lang,
    matrixReport: params.matrixReport,
    matrixSummary: params.matrixSummary,
    matrixInput: normalizedInput,
    resolvedContext: {
      activation: preActivation,
      rules: preRules,
      states: preStates,
    },
  })
  const strategyEngine =
    buildPhaseStrategyEngine(signalSynthesis, params.lang, {
      daeunActive: Boolean(normalizedInput.currentDaeunElement),
      seunActive: Boolean(normalizedInput.currentSaeunElement),
      wolunActive: Boolean(normalizedInput.currentWolunElement),
      iljinActive: Boolean(normalizedInput.currentIljinElement || normalizedInput.currentIljinDate),
      activeTransitCount: normalizedInput.activeTransits.length,
    }) || buildSafeStrategyFallback(params.lang)
  const patterns = buildPatternEngine(signalSynthesis, strategyEngine, {
    activation: preActivation,
    rules: preRules,
    states: preStates,
    crossAgreement,
    crossAgreementMatrix,
  })
  const scenarios = buildScenarioEngine(patterns, strategyEngine, normalizedInput, params.lang, {
    activation: preActivation,
    rules: preRules,
    states: preStates,
  })
  const decisionEngine = buildDecisionEngine({
    lang: params.lang,
    patterns,
    scenarios,
    strategyEngine,
  })
  const canonical = buildCoreCanonicalOutput({
    lang: params.lang,
    matrixInput: normalizedInput,
    signalSynthesis,
    patterns,
    scenarios,
    decisionEngine,
    matrixSummary: params.matrixSummary,
    strategy: {
      phase: strategyEngine.overallPhase,
      phaseLabel: strategyEngine.overallPhaseLabel,
      attackPercent: strategyEngine.attackPercent,
      defensePercent: strategyEngine.defensePercent,
      thesis: strategyEngine.thesis,
      riskControl:
        strategyEngine.domainStrategies[0]?.riskControl ||
        strategyEngine.domainStrategies.find((item) => item.riskControl)?.riskControl ||
        '',
      focusDomain: strategyEngine.domainStrategies[0]?.domain,
      domainStrategies: strategyEngine.domainStrategies.map((item) => ({
        domain: item.domain,
        phase: item.phase,
        evidenceIds: item.evidenceIds,
        metrics: {
          strengthScore: item.metrics.strengthScore,
          cautionScore: item.metrics.cautionScore,
          balanceScore: item.metrics.balanceScore,
        },
      })),
    },
    crossAgreement,
    crossAgreementMatrix,
  })
  const quality = buildDestinyCoreQuality({
    normalizedInput,
    signalSynthesis,
    patterns,
    scenarios,
    decisionEngine,
    strategyEngine,
    canonical,
  })
  const latentState = buildDestinyLatentState({
    normalizedInput,
    matrixSummary: params.matrixSummary,
    strategyEngine,
    canonical,
    quality,
  })

  return {
    normalizedInput,
    availability: normalizedInput.availability,
    signalSynthesis,
    patterns,
    scenarios,
    decisionEngine,
    strategyEngine,
    canonical,
    quality,
    latentState,
    coreHash: computeDestinyCoreHash({
      canonical,
      patterns,
      scenarios,
      decisionEngine,
    }),
  }
}
