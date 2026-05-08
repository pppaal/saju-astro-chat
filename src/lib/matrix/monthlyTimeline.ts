import type {
  DomainKey,
  DomainScore,
  MatrixCalculationInput,
  MatrixCell,
  MonthlyOverlapPoint,
  TimingCalibrationSummary,
} from './types'
import { clamp01 } from './componentScores'
import { calculateTimeOverlapWeight } from './timeOverlap'
import { DOMAIN_KEYS } from './domainMap'
import { deriveRuntimeTimingForDate } from './timingRuntime'

interface MonthlyTimelineParams {
  input: MatrixCalculationInput
  layer4: Record<string, MatrixCell>
  layer7: Record<string, MatrixCell>
  startYearMonth?: string
  baseOverlapStrength?: number
}

export interface ProjectedMonthlyInputPoint {
  month: string
  monthIndex: number
  input: MatrixCalculationInput
}

interface TimingCalibrationParams {
  input: MatrixCalculationInput
  layer4: Record<string, MatrixCell>
  layer7: Record<string, MatrixCell>
  futureTimeline: MonthlyOverlapPoint[]
  pastTimeline: MonthlyOverlapPoint[]
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

function parseStartYearMonth(startYearMonth?: string): { year: number; month: number } {
  if (startYearMonth) {
    const match = /^(\d{4})-(\d{2})$/.exec(startYearMonth.trim())
    if (match) {
      const year = Number(match[1])
      const month = Number(match[2])
      if (year >= 1900 && month >= 1 && month <= 12) {
        return { year, month }
      }
    }
  }

  const now = new Date()
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

function addMonths(year: number, month: number, offset: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + offset
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  return { year: nextYear, month: nextMonth }
}

function toPeakLevel(overlapStrength: number): MonthlyOverlapPoint['peakLevel'] {
  if (overlapStrength >= 0.75) {
    return 'peak'
  }
  if (overlapStrength >= 0.6) {
    return 'high'
  }
  return 'normal'
}

function countAdvancedSignals(input: MatrixCalculationInput): number {
  return Object.values(input.advancedAstroSignals || {}).filter(Boolean).length
}

function computeStructuralReadiness(input: MatrixCalculationInput): number {
  const cycleSupport =
    (input.currentDaeunElement ? 0.34 : 0) +
    (input.currentSaeunElement ? 0.22 : 0) +
    (input.currentWolunElement ? 0.12 : 0) +
    (input.currentIljinElement || input.currentIljinDate ? 0.05 : 0)
  const structuralSupport =
    (input.geokguk ? 0.08 : 0) +
    (input.yongsin ? 0.06 : 0) +
    Math.min((input.relations || []).length * 0.01, 0.05) +
    Math.min((input.shinsalList || []).length * 0.004, 0.04)

  return clamp01(cycleSupport + structuralSupport)
}

function computeTriggerStrength(
  input: MatrixCalculationInput,
  layer4: Record<string, MatrixCell>,
  layer7: Record<string, MatrixCell>
): number {
  const transitStrength = Math.min((input.activeTransits || []).length * 0.08, 0.32)
  const advancedStrength = Math.min(countAdvancedSignals(input) * 0.025, 0.15)
  const layerStrength = Math.min(
    Object.keys(layer4).length * 0.01 + Object.keys(layer7).length * 0.006,
    0.12
  )
  const shortTermSupport =
    (input.currentWolunElement ? 0.08 : 0) +
    (input.currentIljinElement || input.currentIljinDate ? 0.05 : 0)

  return clamp01(transitStrength + advancedStrength + layerStrength + shortTermSupport)
}

function computeMonthlySeasonalCurve(monthIndex: number, startMonth: number): number {
  const seasonPhase = ((startMonth - 1 + monthIndex) / 12) * Math.PI * 2
  const seasonalWave = Math.sin(seasonPhase) * 0.05
  const quarterlyPulse = Math.cos((monthIndex / 3) * Math.PI) * 0.025
  return seasonalWave + quarterlyPulse
}

function computeMonthlyTriggerCurve(monthIndex: number): number {
  if (monthIndex === 0) return 0.12
  if (monthIndex === 1) return 0.08
  if (monthIndex === 2) return 0.05
  if (monthIndex <= 5) return 0.02
  return -0.015 * Math.min(monthIndex - 5, 4)
}

function isoForMonthStart(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`
}

export function buildProjectedMonthlyInputs(
  input: MatrixCalculationInput,
  startYearMonth?: string
): ProjectedMonthlyInputPoint[] {
  const start = parseStartYearMonth(startYearMonth || input.startYearMonth)
  const points: ProjectedMonthlyInputPoint[] = []

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const ym = addMonths(start.year, start.month, monthIndex)
    const month = `${ym.year}-${pad2(ym.month)}`
    const targetDateIso = isoForMonthStart(ym.year, ym.month)
    const targetDate = new Date(`${targetDateIso}T12:00:00.000Z`)
    const runtimeTiming = deriveRuntimeTimingForDate(input, targetDate, { targetDateIso })
    const projected: MatrixCalculationInput = {
      ...input,
      startYearMonth: month,
      ...runtimeTiming,
    }
    points.push({
      month,
      monthIndex,
      input: projected,
    })
  }

  return points
}

export function buildHistoricalMonthlyInputs(
  input: MatrixCalculationInput,
  startYearMonth?: string
): ProjectedMonthlyInputPoint[] {
  const start = parseStartYearMonth(startYearMonth || input.startYearMonth)
  const points: ProjectedMonthlyInputPoint[] = []

  for (let step = 12; step >= 1; step -= 1) {
    const monthIndex = 12 - step
    const ym = addMonths(start.year, start.month, -step)
    const month = `${ym.year}-${pad2(ym.month)}`
    const targetDateIso = isoForMonthStart(ym.year, ym.month)
    const targetDate = new Date(`${targetDateIso}T12:00:00.000Z`)
    const runtimeTiming = deriveRuntimeTimingForDate(input, targetDate, { targetDateIso })
    const projected: MatrixCalculationInput = {
      ...input,
      startYearMonth: month,
      ...runtimeTiming,
    }
    points.push({
      month,
      monthIndex,
      input: projected,
    })
  }

  return points
}

export function buildTimelineByDomainFromMonthlyScores(
  monthlyDomainScores: Array<{
    month: string
    domainScores: Record<DomainKey, DomainScore>
  }>
): Record<DomainKey, MonthlyOverlapPoint[]> {
  const out = {} as Record<DomainKey, MonthlyOverlapPoint[]>
  for (const domain of DOMAIN_KEYS) {
    out[domain] = monthlyDomainScores.map(({ month, domainScores }) => {
      const domainScore = domainScores[domain]
      const overlapStrength = clamp01(
        (domainScore?.overlapStrength || 0) * (domainScore?.timeOverlapWeight || 1)
      )
      const timeOverlapWeight = Math.min(1.3, Math.max(1.0, 1 + 0.3 * overlapStrength))
      return {
        month,
        overlapStrength: Math.round(overlapStrength * 1000) / 1000,
        timeOverlapWeight: Math.round(timeOverlapWeight * 1000) / 1000,
        peakLevel: toPeakLevel(overlapStrength),
      }
    })
  }
  return out
}

function averageStepVolatility(points: MonthlyOverlapPoint[]): number {
  if (points.length <= 1) return 0
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += Math.abs(points[i].overlapStrength - points[i - 1].overlapStrength)
  }
  return total / (points.length - 1)
}

function averageStrength(points: MonthlyOverlapPoint[], start: number, end: number): number {
  const slice = points.slice(start, end)
  if (slice.length === 0) return 0
  return slice.reduce((sum, point) => sum + point.overlapStrength, 0) / slice.length
}

export function summarizeTimingCalibration({
  input,
  layer4,
  layer7,
  futureTimeline,
  pastTimeline,
}: TimingCalibrationParams): TimingCalibrationSummary {
  const readinessScore = Math.round(computeStructuralReadiness(input) * 1000) / 1000
  const triggerScore = Math.round(computeTriggerStrength(input, layer4, layer7) * 1000) / 1000
  const convergenceScore =
    Math.round(clamp01(1 - Math.abs(readinessScore - triggerScore)) * 1000) / 1000

  const futureVolatility = averageStepVolatility(futureTimeline)
  const pastVolatility = averageStepVolatility(pastTimeline)
  const futureStability = Math.round(clamp01(1 - futureVolatility / 0.18) * 1000) / 1000
  const pastStability = Math.round(clamp01(1 - pastVolatility / 0.18) * 1000) / 1000

  const pastRecent = averageStrength(
    pastTimeline,
    Math.max(0, pastTimeline.length - 3),
    pastTimeline.length
  )
  const futureNear = averageStrength(futureTimeline, 0, Math.min(3, futureTimeline.length))
  const backtestConsistency =
    Math.round(clamp01(1 - Math.abs(futureNear - pastRecent) / 0.35) * 1000) / 1000

  const reliabilityScore =
    Math.round(
      clamp01(
        readinessScore * 0.18 +
          triggerScore * 0.14 +
          convergenceScore * 0.28 +
          futureStability * 0.22 +
          pastStability * 0.1 +
          backtestConsistency * 0.08
      ) * 1000
    ) / 1000

  return {
    readinessScore,
    triggerScore,
    convergenceScore,
    pastStability,
    futureStability,
    backtestConsistency,
    reliabilityScore,
    reliabilityBand:
      reliabilityScore >= 0.72 ? 'high' : reliabilityScore >= 0.46 ? 'medium' : 'low',
  }
}

export function generateMonthlyOverlapTimeline({
  input,
  layer4,
  layer7,
  startYearMonth,
  baseOverlapStrength,
}: MonthlyTimelineParams): MonthlyOverlapPoint[] {
  const baseFromModel = calculateTimeOverlapWeight(input, layer4, layer7).overlapStrength
  const base = clamp01(baseOverlapStrength ?? baseFromModel)

  const start = parseStartYearMonth(startYearMonth)
  const readiness = computeStructuralReadiness(input)
  const triggerStrength = computeTriggerStrength(input, layer4, layer7)

  const points: MonthlyOverlapPoint[] = []
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const ym = addMonths(start.year, start.month, monthIndex)
    const monthKey = `${ym.year}-${pad2(ym.month)}`

    const seasonalBump = computeMonthlySeasonalCurve(monthIndex, start.month)
    const triggerBump = computeMonthlyTriggerCurve(monthIndex) * triggerStrength
    const readinessDrift = Math.max(0, readiness - 0.45) * 0.06
    const overlapStrength = clamp01(
      base * 0.58 +
        readiness * 0.24 +
        triggerStrength * 0.12 +
        seasonalBump +
        triggerBump +
        readinessDrift
    )
    const timeOverlapWeight = Math.min(1.3, Math.max(1.0, 1 + 0.3 * overlapStrength))

    points.push({
      month: monthKey,
      overlapStrength: Math.round(overlapStrength * 1000) / 1000,
      timeOverlapWeight: Math.round(timeOverlapWeight * 1000) / 1000,
      peakLevel: toPeakLevel(overlapStrength),
    })
  }

  return points
}

export function generateTimelineByDomain(
  globalTimeline: MonthlyOverlapPoint[],
  domainScores: Record<DomainKey, DomainScore>
): Record<DomainKey, MonthlyOverlapPoint[]> {
  const out = {} as Record<DomainKey, MonthlyOverlapPoint[]>

  for (const domain of DOMAIN_KEYS) {
    const score = domainScores[domain]?.finalScoreAdjusted ?? 5
    const domainIntensity = clamp01((score - 5) / 5)
    const domainSeasonalBias =
      domain === 'career' ? 0.03 : domain === 'move' ? 0.015 : domain === 'health' ? -0.01 : 0

    out[domain] = globalTimeline.map((point, monthIndex) => {
      const domainPulse =
        domain === 'move'
          ? monthIndex <= 2
            ? 0.02
            : 0
          : domain === 'health'
            ? monthIndex >= 5 && monthIndex <= 8
              ? 0.015
              : 0
            : 0
      const overlapStrength = clamp01(
        point.overlapStrength * (0.7 + 0.6 * domainIntensity) + domainSeasonalBias + domainPulse
      )
      const timeOverlapWeight = Math.min(1.3, Math.max(1.0, 1 + 0.3 * overlapStrength))
      return {
        month: point.month,
        overlapStrength: Math.round(overlapStrength * 1000) / 1000,
        timeOverlapWeight: Math.round(timeOverlapWeight * 1000) / 1000,
        peakLevel: toPeakLevel(overlapStrength),
      }
    })
  }

  return out
}
