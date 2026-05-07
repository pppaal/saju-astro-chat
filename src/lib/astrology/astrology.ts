// src/lib/astrology/astrology.ts
//
// Main astrology entry point — mirrors src/lib/Saju/saju.ts.
// One function call returns natal + transit (일운) + lunar return (월운) +
// solar return (세운) + secondary progressions (대운). Mirrors the full
// timing coverage we already have in the Saju engine.

import { calculateNatalChart, toChart } from './foundation/astrologyService'
import type { NatalChartData, NatalChartInput } from './foundation/astrologyService'
import { calculateTransitChart, findTransitAspects } from './foundation/transit'
import type { TransitAspect } from './foundation/transit'
import { calculateSolarReturn, calculateLunarReturn } from './foundation/returns'
import { calculateSecondaryProgressions } from './foundation/progressions'
import type {
  Chart,
  NatalInput,
  ProgressedChart,
  ReturnChart,
} from './foundation/types'

export interface CalculateAstrologyInput {
  /** Birth profile — same shape as `NatalChartInput`. */
  birth: NatalChartInput
  /** ISO timestamp for transit calculations. Defaults to now. */
  nowIso?: string
  /**
   * Year for the solar return. Defaults to the year of `nowIso` (or current year).
   */
  solarReturnYear?: number
  /**
   * Year/month pair for the lunar return. Defaults to year+month of `nowIso`.
   */
  lunarReturn?: { year: number; month: number }
  /**
   * ISO date for secondary progressions (defaults to nowIso, day-only). Mirrors
   * "현재 대운 시점" — what the saju engine returns inside `daeWoon.current`.
   */
  progressionTargetDate?: string
  /**
   * Optional: cap aspects/transits returned to keep the result light.
   * Defaults are conservative.
   */
  limits?: {
    transitAspects?: number
  }
}

export interface AstrologyData {
  /** Birth (natal) chart — equivalent of saju 4-pillar. */
  natal: NatalChartData
  /**
   * 일운 (daily transits) — chart at `nowIso` plus aspects to natal.
   */
  daily: {
    asOfIso: string
    chart: Chart
    aspects: TransitAspect[]
  }
  /** 월운 (lunar return for the given month). */
  monthly: ReturnChart
  /** 세운 (solar return for the given year). */
  yearly: ReturnChart
  /** 대운 (secondary progressions to the target date). */
  daewoon: ProgressedChart
  meta: {
    computedAtIso: string
    nowIso: string
    progressionTargetDate: string
    solarReturnYear: number
    lunarReturnYear: number
    lunarReturnMonth: number
  }
}

const DEFAULT_TRANSIT_LIMIT = 80

export async function calculateAstrologyData(
  input: CalculateAstrologyInput
): Promise<AstrologyData> {
  const nowIso = input.nowIso ?? new Date().toISOString()
  const now = new Date(nowIso)
  const solarReturnYear = input.solarReturnYear ?? now.getUTCFullYear()
  const lunarReturnYear = input.lunarReturn?.year ?? now.getUTCFullYear()
  const lunarReturnMonth = input.lunarReturn?.month ?? now.getUTCMonth() + 1
  const progressionTargetDate =
    input.progressionTargetDate ?? nowIso.slice(0, 10)
  const transitLimit = input.limits?.transitAspects ?? DEFAULT_TRANSIT_LIMIT

  // 1. Natal — mirrors `calculateSajuData` for the birth pillars.
  const natal = await calculateNatalChart(input.birth)
  const natalChart = toChart(natal)

  // Build NatalInput for downstream calls (returns/progressions accept this shape).
  const natalInput: NatalInput = {
    year: input.birth.year,
    month: input.birth.month,
    date: input.birth.date,
    hour: input.birth.hour,
    minute: input.birth.minute,
    latitude: input.birth.latitude,
    longitude: input.birth.longitude,
    timeZone: input.birth.timeZone,
  }

  // Run the timing layers in parallel — they are independent.
  const [transitChart, yearly, monthly, daewoon] = await Promise.all([
    calculateTransitChart({
      iso: nowIso,
      latitude: input.birth.latitude,
      longitude: input.birth.longitude,
      timeZone: input.birth.timeZone,
    }),
    calculateSolarReturn({ natal: natalInput, year: solarReturnYear }),
    calculateLunarReturn({
      natal: natalInput,
      year: lunarReturnYear,
      month: lunarReturnMonth,
    }),
    calculateSecondaryProgressions({
      natal: natalInput,
      targetDate: progressionTargetDate,
    }),
  ])

  // 2. Daily transits — aspects + biggest moves. Mirrors `getIljinCalendar`.
  const aspects = findTransitAspects(
    transitChart,
    natalChart,
    ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
    1.0
  ).slice(0, transitLimit)

  return {
    natal,
    daily: {
      asOfIso: nowIso,
      chart: transitChart,
      aspects,
    },
    monthly,
    yearly,
    daewoon,
    meta: {
      computedAtIso: new Date().toISOString(),
      nowIso,
      progressionTargetDate,
      solarReturnYear,
      lunarReturnYear,
      lunarReturnMonth,
    },
  }
}
