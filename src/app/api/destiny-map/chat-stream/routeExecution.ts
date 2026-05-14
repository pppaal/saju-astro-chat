import type { CombinedResult } from '@/lib/destiny-map/astrology'
import { ErrorCodes, type ErrorCode } from '@/lib/api/errorHandler'
import { isValidDate, isValidLatitude, isValidLongitude, isValidTime } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { clampMessages, counselorSystemPrompt } from './lib/helpers'
import { loadPersonaMemory, loadUserProfile, type ProfileLoadResult } from './lib/profileLoader'
import { appendUserUtteranceToRecall } from '@/lib/ai/personaMemoryRecall'
import { calculateChartData } from './lib/chart-calculator'
import {
  buildContextSections,
  buildLongTermMemorySection,
} from './lib/context-builder'
import { assembleFinalPromptSplit } from './builders/promptAssembly'
import type { AstroDataStructure, SajuDataStructure } from './lib/types'
import { formatTimingForPrompt, type TimedTransitSnapshot } from './routeSupport'
import type { DestinyMapChatStreamInput } from './lib/validation'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'

/**
 * Slow-planet snapshots at past / current / future dates. The natal
 * chart is fixed; running `findMajorTransits` against a `transitChart`
 * built for any ISO timestamp returns the aspects active at that
 * moment. Slow planets (Jupiter+) barely move month-to-month, so
 * three snapshots over a ±12m window are enough for the LLM to answer
 * "why was last year heavy" and "what's coming next half".
 */
async function computeTimedTransitSnapshots(
  natalChartData: NatalChartData,
  latitude: number,
  longitude: number,
  lang: 'ko' | 'en',
  now: Date = new Date()
): Promise<TimedTransitSnapshot[]> {
  try {
    const astro = await import('@/lib/astrology')
    const natalChart = astro.toChart(natalChartData)

    const isoOffset = (monthsDelta: number): string => {
      const d = new Date(now)
      d.setMonth(d.getMonth() + monthsDelta)
      return d.toISOString().slice(0, 19)
    }

    const targets: Array<{ delta: number; labelKo: string; labelEn: string }> = [
      { delta: -12, labelKo: '12개월 전', labelEn: '12mo ago' },
      { delta: 0, labelKo: '현재', labelEn: 'now' },
      { delta: 6, labelKo: '6개월 후', labelEn: '+6mo' },
    ]

    const snapshots = await Promise.all(
      targets.map(async (t) => {
        const iso = isoOffset(t.delta)
        const chart = await astro.calculateTransitChart({
          iso,
          latitude,
          longitude,
          timeZone: 'Asia/Seoul',
        })
        const major = astro.findMajorTransits(chart, natalChart)
        const aspects = major.map((m) => ({
          from: { name: m.transitPlanet, sign: undefined },
          to: { name: m.natalPoint, sign: undefined },
          type: m.type,
          orb: m.orb,
          applying: m.isApplying,
        }))
        return {
          label: lang === 'ko' ? t.labelKo : t.labelEn,
          isoDate: iso,
          aspects,
        }
      })
    )
    return snapshots
  } catch (err) {
    logger.warn('[chat-stream] timed transit snapshots failed; falling back to current-only', {
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

export interface EffectiveCounselorInputs {
  name?: string
  effectiveBirthDate: string
  effectiveBirthTime: string
  effectiveLatitude: number
  effectiveLongitude: number
  effectiveGender: 'male' | 'female'
  effectiveSaju?: SajuDataStructure
  effectiveAstro?: AstroDataStructure
  advancedAstro?: Partial<CombinedResult>
  lang: 'ko' | 'en'
  trimmedHistory: DestinyMapChatStreamInput['messages']
  lastUserContent?: string
}

export interface EffectiveCounselorInputError {
  code: ErrorCode
  message: string
}

export async function resolveEffectiveCounselorInputs(params: {
  validated: DestinyMapChatStreamInput
  userId?: string | null
}): Promise<{ data?: EffectiveCounselorInputs; error?: EffectiveCounselorInputError }> {
  const { validated, userId } = params
  const {
    name,
    birthDate,
    birthTime,
    gender,
    latitude,
    longitude,
    lang,
    messages,
    saju,
    astro,
    advancedAstro,
  } = validated

  const trimmedHistory = clampMessages(messages)
  const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')

  let effectiveBirthDate = birthDate || ''
  let effectiveBirthTime = birthTime || ''
  let effectiveLatitude = latitude || 0
  let effectiveLongitude = longitude || 0
  let effectiveGender: 'male' | 'female' = gender
  let effectiveSaju = saju
  let effectiveAstro = astro

  const needsProfileLoad = userId && (!birthDate || !birthTime || !latitude || !longitude)

  if (needsProfileLoad) {
    try {
      const profileResult: ProfileLoadResult = await loadUserProfile(
        userId,
        birthDate,
        birthTime,
        latitude,
        longitude,
        saju as SajuDataStructure | undefined,
        astro as AstroDataStructure | undefined
      )
      if (profileResult.saju) effectiveSaju = profileResult.saju
      if (profileResult.astro) effectiveAstro = profileResult.astro
      if (profileResult.birthDate) effectiveBirthDate = profileResult.birthDate
      if (profileResult.birthTime) effectiveBirthTime = profileResult.birthTime
      if (profileResult.latitude) effectiveLatitude = profileResult.latitude
      if (profileResult.longitude) effectiveLongitude = profileResult.longitude
      if (profileResult.gender === 'male' || profileResult.gender === 'female') {
        effectiveGender = profileResult.gender
      }
    } catch (profileError) {
      logger.warn('[chat-stream] Failed to load user profile, proceeding with provided data', {
        userId,
        error: profileError instanceof Error ? profileError.message : 'Unknown error',
      })
    }
  }

  if (!effectiveBirthDate || !isValidDate(effectiveBirthDate)) {
    return { error: { code: ErrorCodes.INVALID_DATE, message: 'Invalid or missing birthDate' } }
  }
  if (!effectiveBirthTime || !isValidTime(effectiveBirthTime)) {
    return { error: { code: ErrorCodes.INVALID_TIME, message: 'Invalid or missing birthTime' } }
  }
  if (!isValidLatitude(effectiveLatitude)) {
    return { error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid or missing latitude' } }
  }
  if (!isValidLongitude(effectiveLongitude)) {
    return { error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid or missing longitude' } }
  }

  return {
    data: {
      name,
      effectiveBirthDate,
      effectiveBirthTime,
      effectiveLatitude,
      effectiveLongitude,
      effectiveGender,
      effectiveSaju: effectiveSaju as SajuDataStructure | undefined,
      effectiveAstro: effectiveAstro as AstroDataStructure | undefined,
      advancedAstro: advancedAstro as Partial<CombinedResult> | undefined,
      lang,
      trimmedHistory,
      lastUserContent: lastUser?.content,
    },
  }
}

export interface PreparedCounselorExecution {
  lang: 'ko' | 'en'
  /** prompt-caching stable block (system + raw chart + timing + long-term memory). */
  chatPromptCachedContext: string
  /** prompt-caching dynamic tail (history + latest question). */
  chatPromptDynamicTail: string
  backendSaju?: SajuDataStructure
  backendAstro?: AstroDataStructure
}

export async function prepareCounselorExecution(params: {
  userId?: string | null
  inputs: EffectiveCounselorInputs
}): Promise<PreparedCounselorExecution> {
  const { userId, inputs } = params
  const {
    name,
    effectiveBirthDate,
    effectiveBirthTime,
    effectiveLatitude,
    effectiveLongitude,
    effectiveGender,
    effectiveSaju,
    effectiveAstro,
    advancedAstro,
    lang,
    trimmedHistory,
    lastUserContent,
  } = inputs

  let personaMemoryContext = ''
  let recentSessionSummaries = ''
  if (userId) {
    if (lastUserContent) {
      // fire-and-forget — recall append failure must not block main response
      appendUserUtteranceToRecall(userId, lastUserContent).catch(() => {})
    }
    const memoryResult = await loadPersonaMemory(userId, lang)
    personaMemoryContext = memoryResult.personaMemoryContext
    recentSessionSummaries = memoryResult.recentSessionSummaries
  }

  const chartResult = await calculateChartData(
    {
      birthDate: effectiveBirthDate,
      birthTime: effectiveBirthTime,
      gender: effectiveGender,
      latitude: effectiveLatitude,
      longitude: effectiveLongitude,
    },
    effectiveSaju,
    effectiveAstro
  )

  const finalSaju = chartResult.saju
  const finalAstro = chartResult.astro
  const { currentTransits, natalChartData } = chartResult

  const timedTransits = natalChartData
    ? await computeTimedTransitSnapshots(
        natalChartData,
        effectiveLatitude,
        effectiveLongitude,
        lang
      )
    : []

  const contextSections = buildContextSections({
    saju: finalSaju,
    astro: finalAstro,
    advancedAstro,
    currentTransits,
    lang,
    trimmedHistory,
    lastUserMessage: lastUserContent,
  })

  const longTermMemorySection = buildLongTermMemorySection(
    personaMemoryContext,
    recentSessionSummaries,
    lang
  )

  // Astro side already has currentTransits/returns; merge so the timing
  // block sees them in one object.
  const astroWithTransits = finalAstro
    ? {
        ...(finalAstro as Record<string, unknown>),
        currentTransits: currentTransits ?? (finalAstro as Record<string, unknown>).currentTransits,
        returns: (() => {
          const advReturns = {
            solarReturn: advancedAstro?.solarReturn,
            lunarReturn: advancedAstro?.lunarReturn,
          }
          const existing = (finalAstro as Record<string, unknown>).returns as
            | Record<string, unknown>
            | undefined
          return {
            ...(existing ?? {}),
            ...(advReturns.solarReturn ? { solarReturn: advReturns.solarReturn } : {}),
            ...(advReturns.lunarReturn ? { lunarReturn: advReturns.lunarReturn } : {}),
          }
        })(),
      }
    : null

  const timingSection = formatTimingForPrompt({
    saju: finalSaju as Record<string, unknown> | null | undefined,
    astro: astroWithTransits,
    birthDate: effectiveBirthDate,
    lang,
    timedTransits,
  })

  const baseContext = [
    `Name: ${name || 'User'}`,
    contextSections.rawChartSnapshot
      ? `${lang === 'ko' ? '== 원본 차트 ==' : '== Raw Chart =='}\n${contextSections.rawChartSnapshot}`
      : '',
    timingSection,
    longTermMemorySection,
  ]
    .filter(Boolean)
    .join('\n\n')

  const split = assembleFinalPromptSplit({
    systemPrompt: counselorSystemPrompt(lang),
    baseContext,
    memoryContext: '',
    sections: [],
    messages: trimmedHistory.filter((m) => m.role !== 'system'),
    userQuestion: contextSections.userQuestion,
  })

  return {
    lang,
    chatPromptCachedContext: split.cachedContext,
    chatPromptDynamicTail: split.dynamicTail,
    backendSaju: finalSaju,
    backendAstro: finalAstro,
  }
}
