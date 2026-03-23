import {
  calculateLunarReturn,
  calculateSecondaryProgressions,
  calculateSolarReturn,
  calculateTransitChart,
  findMajorTransits,
  type Chart,
} from '@/lib/astrology'
import { buildCompleteAdvancedAstroSignals } from './inputCross'
import { mapMajorTransitsToActiveTransits } from './ai-report/transitMapping'
import { buildAstroTimingIndex } from './astroTimingIndex'
import { clamp01 } from './componentScores'
import { deriveRuntimeTimingForDate } from './timingRuntime'
import { summarizeTimingCalibration } from './monthlyTimeline'
import type {
  DomainKey,
  DomainScore,
  MatrixCalculationInput,
  MatrixSummary,
  MonthlyOverlapPoint,
} from './types'

export interface PreciseMonthlyInputPoint {
  month: string
  monthIndex: number
  probeDay: number
  input: MatrixCalculationInput
}

interface PreciseMonthlyProbeBucket {
  month: string
  monthIndex: number
  probes: PreciseMonthlyInputPoint[]
}

interface TimelineSummarySnapshot {
  overlapStrength?: number
  timeOverlapWeight?: number
  domainScores?: Record<DomainKey, DomainScore>
}

const PRECISE_MONTHLY_PROBE_DAYS = [1, 5, 10, 15, 20, 25, 28] as const
const PRECISE_DOMAIN_KEYS: DomainKey[] = ['career', 'love', 'money', 'health', 'move']
const DOMAIN_PROBE_DAY_PREFERENCE: Record<DomainKey, Record<number, number>> = {
  career: { 10: 0.02, 15: 0.03, 20: 0.02 },
  love: { 10: 0.02, 15: 0.03, 20: 0.02 },
  money: { 1: 0.025, 5: 0.02, 10: 0.015 },
  health: { 15: 0.02, 20: 0.03, 25: 0.02, 28: 0.015 },
  move: { 1: 0.03, 5: 0.025, 10: 0.015 },
}

function toPeakLevel(overlapStrength: number): MonthlyOverlapPoint['peakLevel'] {
  if (overlapStrength >= 0.75) return 'peak'
  if (overlapStrength >= 0.6) return 'high'
  return 'normal'
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

function isoForMonthStart(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`
}

function isoForMonthDay(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function isChartLike(value: unknown): value is Chart {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Array.isArray((value as Record<string, unknown>).planets) &&
    Array.isArray((value as Record<string, unknown>).houses)
  )
}

function hasBirthContext(input: MatrixCalculationInput): boolean {
  return Boolean(
    input.profileContext?.birthDate &&
    input.profileContext?.birthTime &&
    typeof input.profileContext?.latitude === 'number' &&
    typeof input.profileContext?.longitude === 'number'
  )
}

function collectPersistentAdvancedSignals(
  input: MatrixCalculationInput
): MatrixCalculationInput['advancedAstroSignals'] {
  const base = input.advancedAstroSignals
  if (!base) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(base)) {
    if (/draconic|harmonics|fixedStars|midpoints|asteroids|extraPoints/i.test(key)) {
      out[key] = value
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

async function buildPreciseMonthlyInputsInternal(
  input: MatrixCalculationInput,
  startYearMonth?: string,
  direction: 'future' | 'past' = 'future'
): Promise<PreciseMonthlyInputPoint[]> {
  const buckets = await buildPreciseMonthlyProbeBucketsInternal(input, startYearMonth, direction)
  return buckets.map((bucket) => bucket.probes[0]).filter(Boolean)
}

async function buildPreciseMonthlyProbeBucketsInternal(
  input: MatrixCalculationInput,
  startYearMonth?: string,
  direction: 'future' | 'past' = 'future'
): Promise<PreciseMonthlyProbeBucket[]> {
  if (!hasBirthContext(input)) {
    return []
  }

  const natalChart = input.astrologySnapshot?.natalChart
  if (!isChartLike(natalChart)) {
    return []
  }

  const timezone = input.profileContext?.timezone || 'Asia/Seoul'
  const latitude = input.profileContext?.latitude as number
  const longitude = input.profileContext?.longitude as number
  const birthDate = input.profileContext?.birthDate as string
  const birthTime = input.profileContext?.birthTime as string
  const [yearStr, monthStr, dayStr] = birthDate.replace(/[./]/g, '-').split('-')
  const [hourStr, minuteStr] = birthTime.split(':')
  const natalInput = {
    year: Number(yearStr),
    month: Number(monthStr),
    date: Number(dayStr),
    hour: Number(hourStr || '0'),
    minute: Number(minuteStr || '0'),
    latitude,
    longitude,
    timeZone: timezone,
  }

  const start = parseStartYearMonth(startYearMonth || input.startYearMonth)
  const persistentAdvanced = collectPersistentAdvancedSignals(input)

  const buckets = await Promise.all(
    Array.from({ length: 12 }, async (_, monthIndex) => {
      const offset = direction === 'future' ? monthIndex : -(12 - monthIndex)
      const ym = addMonths(start.year, start.month, offset)
      const month = `${ym.year}-${pad2(ym.month)}`
      const solarReturn = await calculateSolarReturn({
        natal: natalInput,
        year: ym.year,
      })
      const lunarReturn = await calculateLunarReturn({
        natal: natalInput,
        year: ym.year,
        month: ym.month,
      })
      const probes = await Promise.all(
        PRECISE_MONTHLY_PROBE_DAYS.map(async (probeDay) => {
          const targetDateIso = isoForMonthDay(ym.year, ym.month, probeDay)
          const targetDate = new Date(`${targetDateIso}T12:00:00.000Z`)

          const runtimeTiming = deriveRuntimeTimingForDate(input, targetDate, { targetDateIso })
          const transitChart = await calculateTransitChart({
            iso: `${targetDateIso}T12:00:00.000Z`,
            latitude,
            longitude,
            timeZone: timezone,
          })
          const majorTransits = findMajorTransits(transitChart, natalChart, 1.0)
          const mappedTransits = mapMajorTransitsToActiveTransits(majorTransits, 8)

          const progressions = await calculateSecondaryProgressions({
            natal: natalInput,
            targetDate: targetDateIso,
          })

          const advancedAstroSignals = buildCompleteAdvancedAstroSignals({
            ...(persistentAdvanced || {}),
            solarReturn: Boolean(solarReturn),
            lunarReturn: Boolean(lunarReturn),
            progressions: Boolean(progressions),
          })

          const activeTransits = Array.from(
            new Set([...(runtimeTiming.activeTransits || []), ...mappedTransits])
          )

          return {
            month,
            monthIndex,
            probeDay,
            input: {
              ...input,
              startYearMonth: month,
              ...runtimeTiming,
              activeTransits,
              advancedAstroSignals,
              astroTimingIndex: buildAstroTimingIndex({
                activeTransits,
                advancedAstroSignals,
              }),
              astrologySnapshot: {
                ...(input.astrologySnapshot || {}),
                currentTransits: {
                  ...(input.astrologySnapshot?.currentTransits || {}),
                  asOfIso: `${targetDateIso}T12:00:00.000Z`,
                  majorTransits,
                },
              },
            },
          } satisfies PreciseMonthlyInputPoint
        })
      )

      return {
        month,
        monthIndex,
        probes,
      } satisfies PreciseMonthlyProbeBucket
    })
  )

  return buckets
}

export async function buildPreciseMonthlyInputs(
  input: MatrixCalculationInput,
  startYearMonth?: string
): Promise<PreciseMonthlyInputPoint[]> {
  return buildPreciseMonthlyInputsInternal(input, startYearMonth, 'future')
}

export async function buildHistoricalPreciseMonthlyInputs(
  input: MatrixCalculationInput,
  startYearMonth?: string
): Promise<PreciseMonthlyInputPoint[]> {
  return buildPreciseMonthlyInputsInternal(input, startYearMonth, 'past')
}

export function selectStrongestMonthlyProbe<T extends TimelineSummarySnapshot>(
  probes: Array<{ probe: PreciseMonthlyInputPoint; summary: T }>
): { probe: PreciseMonthlyInputPoint; summary: T } | null {
  if (probes.length === 0) return null
  return probes.slice().sort((a, b) => {
    const overlapDelta = (b.summary.overlapStrength || 0) - (a.summary.overlapStrength || 0)
    if (overlapDelta !== 0) return overlapDelta
    const weightDelta = (b.summary.timeOverlapWeight || 0) - (a.summary.timeOverlapWeight || 0)
    if (weightDelta !== 0) return weightDelta
    return Number(b.probe.input.astroTimingIndex || 0) - Number(a.probe.input.astroTimingIndex || 0)
  })[0]
}

export function selectStrongestMonthlyProbeForDomain<T extends TimelineSummarySnapshot>(
  domain: DomainKey,
  probes: Array<{ probe: PreciseMonthlyInputPoint; summary: T }>
): { probe: PreciseMonthlyInputPoint; summary: T } | null {
  if (probes.length === 0) return null
  return probes.slice().sort((a, b) => {
    const aDomain = a.summary.domainScores?.[domain]
    const bDomain = b.summary.domainScores?.[domain]
    const aSignal =
      ((aDomain?.finalScoreAdjusted || 0) / 10) * 0.6 +
      (aDomain?.overlapStrength || 0) * 0.3 +
      ((DOMAIN_PROBE_DAY_PREFERENCE[domain] || {})[a.probe.probeDay] || 0) * 1
    const bSignal =
      ((bDomain?.finalScoreAdjusted || 0) / 10) * 0.6 +
      (bDomain?.overlapStrength || 0) * 0.3 +
      ((DOMAIN_PROBE_DAY_PREFERENCE[domain] || {})[b.probe.probeDay] || 0) * 1
    const signalDelta = bSignal - aSignal
    if (signalDelta !== 0) return signalDelta
    const overlapDelta = (bDomain?.overlapStrength || 0) - (aDomain?.overlapStrength || 0)
    if (overlapDelta !== 0) return overlapDelta
    const weightDelta = (bDomain?.timeOverlapWeight || 0) - (aDomain?.timeOverlapWeight || 0)
    if (weightDelta !== 0) return weightDelta
    return Number(b.probe.input.astroTimingIndex || 0) - Number(a.probe.input.astroTimingIndex || 0)
  })[0]
}

function toMonthlyOverlapPoint(
  month: string,
  summary: TimelineSummarySnapshot
): MonthlyOverlapPoint {
  const overlapStrength = Math.round((summary.overlapStrength || 0) * 1000) / 1000
  const peakLevel: MonthlyOverlapPoint['peakLevel'] =
    (summary.overlapStrength || 0) >= 0.75
      ? 'peak'
      : (summary.overlapStrength || 0) >= 0.6
        ? 'high'
        : 'normal'

  return {
    month,
    overlapStrength,
    timeOverlapWeight: Math.round((summary.timeOverlapWeight || 1) * 1000) / 1000,
    peakLevel,
  }
}

function toDomainMonthlyOverlapPoint(
  month: string,
  domainScore: DomainScore,
  probeDay?: number
): MonthlyOverlapPoint {
  const overlapStrength = clamp01(
    (domainScore.overlapStrength || 0) * (domainScore.timeOverlapWeight || 1)
  )
  const timeOverlapWeight = Math.min(1.3, Math.max(1.0, 1 + 0.3 * overlapStrength))
  return {
    month,
    overlapStrength: Math.round(overlapStrength * 1000) / 1000,
    timeOverlapWeight: Math.round(timeOverlapWeight * 1000) / 1000,
    peakLevel: toPeakLevel(overlapStrength),
    probeDay,
  }
}

function toMonthlyDomainScorePoint(
  month: string,
  summary: TimelineSummarySnapshot
): { month: string; domainScores: Record<DomainKey, DomainScore> } | null {
  if (!summary.domainScores) return null
  return { month, domainScores: summary.domainScores }
}

function resolveDomainScoreFromProbeSet(
  domain: DomainKey,
  summary: TimelineSummarySnapshot,
  evaluated: Array<{ probe: PreciseMonthlyInputPoint; summary: TimelineSummarySnapshot }>
): DomainScore {
  const selected = selectStrongestMonthlyProbeForDomain(domain, evaluated)
  const resolved =
    selected?.summary.domainScores?.[domain] ||
    summary.domainScores?.[domain] ||
    evaluated[0]?.summary.domainScores?.[domain]

  if (!resolved) {
    throw new Error(`Missing domain score for ${domain} in precise monthly timeline recompute`)
  }

  return resolved
}

export async function buildPreciseTimelineSummary(
  input: MatrixCalculationInput,
  baseSummary: MatrixSummary,
  recalculateSummary: (input: MatrixCalculationInput) => TimelineSummarySnapshot
): Promise<Partial<MatrixSummary>> {
  const futureBuckets = await buildPreciseMonthlyProbeBucketsInternal(
    input,
    input.startYearMonth,
    'future'
  )
  const pastBuckets = await buildPreciseMonthlyProbeBucketsInternal(
    input,
    input.startYearMonth,
    'past'
  )
  if (futureBuckets.length === 0) {
    return {}
  }

  const future = futureBuckets
    .map((bucket) => {
      const firstProbe = bucket.probes[0]
      if (!firstProbe) return null
      const evaluated = bucket.probes.map((probe) => ({
        probe,
        summary: recalculateSummary(probe.input),
      }))
      const best = selectStrongestMonthlyProbe(evaluated) || {
        probe: firstProbe,
        summary: recalculateSummary(firstProbe.input),
      }
      return {
        month: bucket.month,
        summary: best.summary,
        evaluated,
      }
    })
    .filter(
      (
        bucket
      ): bucket is {
        month: string
        summary: TimelineSummarySnapshot
        evaluated: Array<{ probe: PreciseMonthlyInputPoint; summary: TimelineSummarySnapshot }>
      } => bucket !== null
    )
  const past = pastBuckets
    .map((bucket) => {
      const firstProbe = bucket.probes[0]
      if (!firstProbe) return null
      const evaluated = bucket.probes.map((probe) => ({
        probe,
        summary: recalculateSummary(probe.input),
      }))
      const best = selectStrongestMonthlyProbe(evaluated) || {
        probe: firstProbe,
        summary: recalculateSummary(firstProbe.input),
      }
      return {
        month: bucket.month,
        summary: best.summary,
        evaluated,
      }
    })
    .filter(
      (
        bucket
      ): bucket is {
        month: string
        summary: TimelineSummarySnapshot
        evaluated: Array<{ probe: PreciseMonthlyInputPoint; summary: TimelineSummarySnapshot }>
      } => bucket !== null
    )

  const overlapTimeline = future.map(({ month, summary }) => toMonthlyOverlapPoint(month, summary))
  const overlapTimelinePast = past.map(({ month, summary }) =>
    toMonthlyOverlapPoint(month, summary)
  )
  const overlapTimelineByDomain = {} as Record<DomainKey, MonthlyOverlapPoint[]>
  const overlapTimelineByDomainPast = {} as Record<DomainKey, MonthlyOverlapPoint[]>
  for (const domain of PRECISE_DOMAIN_KEYS) {
    overlapTimelineByDomain[domain] = future.map(({ month, summary, evaluated }) => {
      const selected = selectStrongestMonthlyProbeForDomain(domain, evaluated)
      const domainScore = resolveDomainScoreFromProbeSet(domain, summary, evaluated)
      return toDomainMonthlyOverlapPoint(month, domainScore, selected?.probe.probeDay)
    })
    overlapTimelineByDomainPast[domain] = past.map(({ month, summary, evaluated }) => {
      const selected = selectStrongestMonthlyProbeForDomain(domain, evaluated)
      const domainScore = resolveDomainScoreFromProbeSet(domain, summary, evaluated)
      return toDomainMonthlyOverlapPoint(month, domainScore, selected?.probe.probeDay)
    })
  }

  const monthlyDomainScores = future
    .map(({ month, summary, evaluated }) => {
      const domainScores = {} as Record<DomainKey, DomainScore>
      for (const domain of PRECISE_DOMAIN_KEYS) {
        domainScores[domain] = resolveDomainScoreFromProbeSet(domain, summary, evaluated)
      }
      return toMonthlyDomainScorePoint(month, { ...summary, domainScores })
    })
    .filter(
      (point): point is { month: string; domainScores: Record<DomainKey, DomainScore> } =>
        point !== null
    )
  const historicalDomainScores = past
    .map(({ month, summary, evaluated }) => {
      const domainScores = {} as Record<DomainKey, DomainScore>
      for (const domain of PRECISE_DOMAIN_KEYS) {
        domainScores[domain] = resolveDomainScoreFromProbeSet(domain, summary, evaluated)
      }
      return toMonthlyDomainScorePoint(month, { ...summary, domainScores })
    })
    .filter(
      (point): point is { month: string; domainScores: Record<DomainKey, DomainScore> } =>
        point !== null
    )

  return {
    overlapTimeline,
    overlapTimelinePast,
    overlapTimelineByDomain:
      monthlyDomainScores.length > 0
        ? overlapTimelineByDomain
        : baseSummary.overlapTimelineByDomain,
    overlapTimelineByDomainPast:
      historicalDomainScores.length > 0
        ? overlapTimelineByDomainPast
        : baseSummary.overlapTimelineByDomainPast,
    timingCalibration: summarizeTimingCalibration({
      input,
      layer4: {},
      layer7: {},
      futureTimeline: overlapTimeline,
      pastTimeline: overlapTimelinePast,
    }),
  }
}
