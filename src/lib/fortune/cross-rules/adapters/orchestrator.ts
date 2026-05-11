// Top-level orchestrator: birth profile + queryDate → FortuneReport.
// Calls saju + astro adapters in parallel, then runs the cross-rule pipeline.

import { runCrossRules } from '..'
import type { FortuneReport, MetaRule, Rule } from '../types'
import { buildAstroNormalizerInput } from './astro'
import { buildSajuNormalizerInput } from './saju'

export interface BirthProfile {
  birthDate: string // YYYY-MM-DD (solar, after lunar conversion if applicable)
  birthTime: string // HH:mm
  gender: 'male' | 'female'
  calendarType?: 'solar' | 'lunar'
  timezone?: string // saju timezone (e.g. 'Asia/Seoul')
  // Astro-specific (place of birth)
  latitude: number
  longitude: number
  // If absent, derived from birthDate parts.
  astroTimezone?: string
  /**
   * 사주 시간 보정 모드. 기본 'standard'.
   * 'meanSolar' 또는 'trueSolar' 시 longitude로 보정.
   */
  solarTimeMode?: 'standard' | 'meanSolar' | 'trueSolar'
  /**
   * When true, the caller did not know the birth hour and `birthTime` is a
   * placeholder. Downstream (snapshot, LLM prompt) must treat hour-dependent
   * fields — 시주, ASC, MC, houses, planetary house placements — as unreliable.
   */
  birthTimeUnknown?: boolean
}

export interface RunFortuneInput {
  birth: BirthProfile
  queryDate?: Date // defaults to now
  rules?: Rule[]
  metaRules?: MetaRule[]
  // Skip slow returns for daily-grade fortune calls.
  skipReturns?: boolean
}

function parseBirthDateTime(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return { year: y, month: m, date: d, hour: hh, minute: mm }
}

export async function runFortune(input: RunFortuneInput): Promise<FortuneReport> {
  const { report } = await runFortuneWithRaw(input)
  return report
}

/**
 * Same as {@link runFortune} but also returns the normalized raw inputs.
 * Useful for callers (e.g. counselor) that want to surface raw saju + astro
 * to an LLM in addition to the cross-matched report.
 */
export async function runFortuneWithRaw(input: RunFortuneInput): Promise<{
  saju: import('../normalizer/saju').SajuNormalizerInput
  astro: import('../normalizer/astro').AstroNormalizerInput
  report: FortuneReport
  birthTimeUnknown: boolean
}> {
  const queryDate = input.queryDate ?? new Date()
  // Saju + astro must compute against the SAME instant. Past behaviour let
  // callers pass a different astroTimezone, which silently produced two
  // mismatched moments (e.g. LA-born user with default tz='Asia/Seoul').
  // Align both to the place-of-birth timezone when caller split them.
  const tz = input.birth.timezone ?? 'Asia/Seoul'
  if (input.birth.astroTimezone && input.birth.astroTimezone !== tz) {
    console.warn(
      `[runFortune] timezone mismatch (saju=${tz}, astro=${input.birth.astroTimezone}). ` +
        `Aligning both to astroTimezone for instant consistency.`
    )
  }
  const placeTz = input.birth.astroTimezone ?? tz

  const sajuP = Promise.resolve(
    buildSajuNormalizerInput({
      birthDate: input.birth.birthDate,
      birthTime: input.birth.birthTime,
      gender: input.birth.gender,
      calendarType: input.birth.calendarType,
      timezone: placeTz,
      queryDate,
      solarTimeMode: input.birth.solarTimeMode,
      longitude: input.birth.longitude,
    })
  )

  const parts = parseBirthDateTime(input.birth.birthDate, input.birth.birthTime)
  const astroP = buildAstroNormalizerInput({
    ...parts,
    latitude: input.birth.latitude,
    longitude: input.birth.longitude,
    timeZone: placeTz,
    queryDate,
    includeSolarReturn: !input.skipReturns,
    includeLunarReturn: !input.skipReturns,
  })

  const [saju, astro] = await Promise.all([sajuP, astroP])

  const report = runCrossRules({
    saju,
    astro,
    rules: input.rules,
    metaRules: input.metaRules,
  })
  return { saju, astro, report, birthTimeUnknown: !!input.birth.birthTimeUnknown }
}
