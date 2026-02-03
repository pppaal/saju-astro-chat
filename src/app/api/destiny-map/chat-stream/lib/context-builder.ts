// context-builder.ts
// Builds various context sections for the chat prompt

import { logger } from '@/lib/logger'
import { guardText } from '@/lib/textGuards'
import { buildAllDataPrompt } from '@/lib/destiny-map/prompt/fortune/base'
import { extractBirthYear } from '@/lib/prediction/utils'
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine'
import type { SajuDataStructure, AstroDataStructure, ChatMessage } from './index'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'
import {
  buildAdvancedTimingSection,
  buildDailyPrecisionSection,
  buildDaeunTransitSection,
  buildPastAnalysisSection,
  buildMultiYearTrendSection,
} from '../builders'
import { generateTier3Analysis, generateTier4Analysis } from '../analysis'

export interface ContextBuilderInput {
  saju?: SajuDataStructure
  astro?: AstroDataStructure
  advancedAstro?: Partial<CombinedResult>
  natalChartData?: unknown
  currentTransits: unknown[]
  birthDate: string
  gender: 'male' | 'female'
  theme: string
  lang: string
  trimmedHistory: ChatMessage[]
  lastUserMessage?: string
}

export interface ContextSections {
  v3Snapshot: string
  timingScoreSection: string
  enhancedAnalysisSection: string
  daeunTransitSection: string
  advancedAstroSection: string
  tier4AdvancedSection: string
  pastAnalysisSection: string
  lifePredictionSection: string
  historyText: string
  userQuestion: string
}

/**
 * Build v3.1 comprehensive data snapshot
 */
function buildV3Snapshot(
  saju: SajuDataStructure | undefined,
  astro: AstroDataStructure | undefined,
  advancedAstro: Partial<CombinedResult> | undefined,
  currentTransits: unknown[],
  lang: string,
  theme: string
): string {
  if (!saju && !astro) {
    return ''
  }

  try {
    // Add transits to astrology object
    const astroWithTransits = astro
      ? {
          ...astro,
          transits: currentTransits,
        }
      : undefined

    // CombinedResult 인터페이스에 맞게 구성
    const combinedResult: CombinedResult = {
      saju: (saju ?? {}) as unknown as CombinedResult['saju'],
      astrology: (astroWithTransits ?? {}) as unknown as CombinedResult['astrology'],
      extraPoints: advancedAstro?.extraPoints,
      asteroids: advancedAstro?.asteroids,
      solarReturn: advancedAstro?.solarReturn,
      lunarReturn: advancedAstro?.lunarReturn,
      progressions: advancedAstro?.progressions,
      draconic: advancedAstro?.draconic,
      harmonics: advancedAstro?.harmonics,
      fixedStars: advancedAstro?.fixedStars,
      eclipses: advancedAstro?.eclipses,
      electional: advancedAstro?.electional,
      midpoints: advancedAstro?.midpoints,
      meta: { generator: 'chat-stream', generatedAt: new Date().toISOString() },
      summary: '',
    }

    // 🔍 DEBUG: Check what advanced data is available
    logger.warn(`[context-builder] Advanced astro check:`, {
      hasExtraPoints: !!advancedAstro?.extraPoints,
      hasAsteroids: !!advancedAstro?.asteroids,
      hasSolarReturn: !!advancedAstro?.solarReturn,
      hasLunarReturn: !!advancedAstro?.lunarReturn,
      hasProgressions: !!advancedAstro?.progressions,
      hasDraconic: !!advancedAstro?.draconic,
      hasHarmonics: !!advancedAstro?.harmonics,
      hasFixedStars: !!advancedAstro?.fixedStars,
      hasEclipses: !!advancedAstro?.eclipses,
      hasElectional: !!advancedAstro?.electional,
      hasMidpoints: !!advancedAstro?.midpoints,
      hasTransits: currentTransits.length > 0,
    })

    const snapshot = buildAllDataPrompt(lang, theme, combinedResult)
    logger.warn(`[context-builder] v3.1 snapshot built: ${snapshot.length} chars`)
    return snapshot
  } catch (e) {
    logger.warn('[context-builder] Failed to build v3.1 snapshot:', e)
    return ''
  }
}

/**
 * Build prediction context section (TIER 1-10 분석 결과)
 */
export function buildPredictionSection(predictionContext: unknown, lang: string): string {
  if (!predictionContext) {
    return ''
  }

  try {
    const pc = predictionContext as {
      eventType?: string
      eventLabel?: string
      optimalPeriods?: Array<{
        startDate: string
        endDate: string
        score: number
        grade: string
        reasons?: string[]
      }>
      avoidPeriods?: Array<{ startDate: string; score: number; reasons?: string[] }>
      advice?: string
      tierAnalysis?: { tier7to10?: { confidence: number } }
    }
    const lines: string[] = []

    if (lang === 'ko') {
      lines.push('\n\n[🔮 인생 예측 분석 결과 (TIER 1-10)]')
      if (pc.eventType) {
        lines.push(`이벤트 유형: ${pc.eventLabel || pc.eventType}`)
      }

      if (pc.optimalPeriods?.length) {
        lines.push('\n✅ 최적 시기:')
        for (const period of pc.optimalPeriods.slice(0, 5)) {
          const start = new Date(period.startDate).toLocaleDateString('ko-KR')
          const end = new Date(period.endDate).toLocaleDateString('ko-KR')
          lines.push(`• ${start} ~ ${end} (${period.grade}등급, ${period.score}점)`)
          if (period.reasons?.length) {
            lines.push(`  이유: ${period.reasons.slice(0, 3).join(', ')}`)
          }
        }
      }

      if (pc.avoidPeriods?.length) {
        lines.push('\n⚠️ 피해야 할 시기:')
        for (const period of pc.avoidPeriods.slice(0, 3)) {
          const start = new Date(period.startDate).toLocaleDateString('ko-KR')
          lines.push(`• ${start} (${period.score}점) - ${period.reasons?.slice(0, 2).join(', ')}`)
        }
      }

      if (pc.advice) {
        lines.push(`\n💡 조언: ${pc.advice}`)
      }
      if (pc.tierAnalysis?.tier7to10?.confidence) {
        lines.push(`\n📊 분석 신뢰도: ${Math.round(pc.tierAnalysis.tier7to10.confidence * 100)}%`)
      }
    } else {
      lines.push('\n\n[🔮 Life Prediction Analysis (TIER 1-10)]')
      if (pc.eventType) {
        lines.push(`Event Type: ${pc.eventLabel || pc.eventType}`)
      }

      if (pc.optimalPeriods?.length) {
        lines.push('\n✅ Optimal Periods:')
        for (const period of pc.optimalPeriods.slice(0, 5)) {
          const start = new Date(period.startDate).toLocaleDateString('en-US')
          const end = new Date(period.endDate).toLocaleDateString('en-US')
          lines.push(`• ${start} ~ ${end} (Grade ${period.grade}, Score ${period.score})`)
          if (period.reasons?.length) {
            lines.push(`  Reasons: ${period.reasons.slice(0, 3).join(', ')}`)
          }
        }
      }

      if (pc.avoidPeriods?.length) {
        lines.push('\n⚠️ Periods to Avoid:')
        for (const period of pc.avoidPeriods.slice(0, 3)) {
          const start = new Date(period.startDate).toLocaleDateString('en-US')
          lines.push(
            `• ${start} (Score ${period.score}) - ${period.reasons?.slice(0, 2).join(', ')}`
          )
        }
      }

      if (pc.advice) {
        lines.push(`\n💡 Advice: ${pc.advice}`)
      }
      if (pc.tierAnalysis?.tier7to10?.confidence) {
        lines.push(
          `\n📊 Analysis Confidence: ${Math.round(pc.tierAnalysis.tier7to10.confidence * 100)}%`
        )
      }
    }

    const section = lines.join('\n')
    logger.warn(`[context-builder] Prediction context built: ${section.length} chars`)
    return section
  } catch (e) {
    logger.warn('[context-builder] Failed to build prediction context:', e)
    return ''
  }
}

/**
 * Build long-term memory context section
 */
export function buildLongTermMemorySection(
  personaMemoryContext: string,
  recentSessionSummaries: string,
  lang: string
): string {
  if (!personaMemoryContext && !recentSessionSummaries) {
    return ''
  }

  const memoryParts: string[] = []

  if (personaMemoryContext) {
    memoryParts.push(
      lang === 'ko'
        ? `[사용자 프로필] ${personaMemoryContext}`
        : `[User Profile] ${personaMemoryContext}`
    )
  }

  if (recentSessionSummaries) {
    memoryParts.push(
      lang === 'ko'
        ? `[이전 상담 기록]\n${recentSessionSummaries}`
        : `[Previous Sessions]\n${recentSessionSummaries}`
    )
  }

  return [
    '',
    '═══════════════════════════════════════════════════════════════',
    lang === 'ko'
      ? '[🧠 장기 기억 - 이전 상담 컨텍스트]'
      : '[🧠 LONG-TERM MEMORY - Previous Context]',
    '═══════════════════════════════════════════════════════════════',
    lang === 'ko'
      ? '아래 정보를 참고하여 더 개인화된 상담을 제공하세요:'
      : 'Use this context for more personalized counseling:',
    ...memoryParts,
    '',
  ].join('\n')
}

/**
 * Build conversation history text
 */
function buildHistoryText(trimmedHistory: ChatMessage[]): string {
  return trimmedHistory
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${guardText(m.content, 300)}`)
    .join('\n')
    .slice(0, 1500)
}

/**
 * Build all advanced analysis sections using modular builders
 */
function buildAdvancedSections(
  saju: SajuDataStructure | undefined,
  astro: AstroDataStructure | undefined,
  natalChartData: unknown,
  birthDate: string,
  gender: 'male' | 'female',
  theme: string,
  lang: string,
  lastUserMessage: string
): {
  timingScoreSection: string
  enhancedAnalysisSection: string
  daeunTransitSection: string
  advancedAstroSection: string
  tier4AdvancedSection: string
  pastAnalysisSection: string
  lifePredictionSection: string
} {
  if (!saju?.dayMaster) {
    return {
      timingScoreSection: '',
      enhancedAnalysisSection: '',
      daeunTransitSection: '',
      advancedAstroSection: '',
      tier4AdvancedSection: '',
      pastAnalysisSection: '',
      lifePredictionSection: '',
    }
  }

  try {
    const currentYear = new Date().getFullYear()
    const birthYear = extractBirthYear(birthDate)
    const currentAge = birthYear ? currentYear - birthYear : undefined

    const timingScoreSection = buildAdvancedTimingSection(saju, birthDate, theme, lang)
    const enhancedAnalysisSection = buildDailyPrecisionSection(saju, theme, lang)
    const daeunTransitSection = buildDaeunTransitSection(saju, birthDate, lang)
    const pastAnalysisSection = buildPastAnalysisSection(
      saju,
      astro,
      birthDate,
      gender,
      lastUserMessage,
      lang
    )
    const lifePredictionSection = buildMultiYearTrendSection(
      saju,
      astro,
      birthDate,
      gender,
      theme,
      lang
    )
    const advancedAstroSection = generateTier3Analysis({ saju, astro, lang }).section
    const tier4AdvancedSection = generateTier4Analysis({
      natalChartData: (natalChartData as NatalChartData | undefined) || null,
      userAge: currentAge,
      currentYear,
      lang,
    }).section

    logger.warn('[context-builder] All analysis sections built using modular builders')

    return {
      timingScoreSection,
      enhancedAnalysisSection,
      daeunTransitSection,
      advancedAstroSection,
      tier4AdvancedSection,
      pastAnalysisSection,
      lifePredictionSection,
    }
  } catch (e) {
    logger.warn('[context-builder] Failed to generate advanced sections:', e)
    return {
      timingScoreSection: '',
      enhancedAnalysisSection: '',
      daeunTransitSection: '',
      advancedAstroSection: '',
      tier4AdvancedSection: '',
      pastAnalysisSection: '',
      lifePredictionSection: '',
    }
  }
}

/**
 * Main function: Build all context sections
 */
export function buildContextSections(input: ContextBuilderInput): ContextSections {
  const {
    saju,
    astro,
    advancedAstro,
    natalChartData,
    currentTransits,
    birthDate,
    gender,
    theme,
    lang,
    trimmedHistory,
    lastUserMessage = '',
  } = input

  const v3Snapshot = buildV3Snapshot(saju, astro, advancedAstro, currentTransits, lang, theme)

  const historyText = buildHistoryText(trimmedHistory)
  const userQuestion = guardText(lastUserMessage, 500)

  const advancedSections = buildAdvancedSections(
    saju,
    astro,
    natalChartData,
    birthDate,
    gender,
    theme,
    lang,
    lastUserMessage
  )

  return {
    v3Snapshot,
    ...advancedSections,
    historyText,
    userQuestion,
  }
}
