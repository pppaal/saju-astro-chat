import type {
  DomainKey,
  DomainScore,
  MatrixCalculationInput,
  MatrixCell,
  MonthlyOverlapPoint,
} from './types'
import { clamp01 } from './componentScores'
import { calculateTimeOverlapWeight } from './timeOverlap'
import { DOMAIN_KEYS } from './domainMap'

interface MonthlyTimelineParams {
  input: MatrixCalculationInput
  layer4: Record<string, MatrixCell>
  layer7: Record<string, MatrixCell>
  startYearMonth?: string
  baseOverlapStrength?: number
}

function stableHash(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
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

function buildInputSignature(input: MatrixCalculationInput): string {
  return JSON.stringify({
    dayMasterElement: input.dayMasterElement,
    pillarElements: input.pillarElements,
    sibsinDistribution: input.sibsinDistribution,
    twelveStages: input.twelveStages,
    geokguk: input.geokguk,
    yongsin: input.yongsin,
    currentDaeunElement: input.currentDaeunElement,
    currentSaeunElement: input.currentSaeunElement,
    shinsalList: input.shinsalList,
    dominantWesternElement: input.dominantWesternElement,
    planetHouses: input.planetHouses,
    planetSigns: input.planetSigns,
    aspects: input.aspects,
    activeTransits: input.activeTransits,
    asteroidHouses: input.asteroidHouses,
    extraPointSigns: input.extraPointSigns,
  })
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
  const signature = buildInputSignature(input)

  const points: MonthlyOverlapPoint[] = []
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const ym = addMonths(start.year, start.month, monthIndex)
    const monthKey = `${ym.year}-${pad2(ym.month)}`

    const monthHash = stableHash(`${signature}|${monthKey}|${monthIndex}`)
    const hashBump = ((monthHash % 2001) / 1000 - 1) * 0.1 // -0.1..0.1
    const seasonalBump = Math.sin((monthIndex / 12) * Math.PI * 2) * 0.08

    const overlapStrength = clamp01(base + seasonalBump + hashBump)
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

    out[domain] = globalTimeline.map((point) => {
      const overlapStrength = clamp01(point.overlapStrength * (0.7 + 0.6 * domainIntensity))
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
