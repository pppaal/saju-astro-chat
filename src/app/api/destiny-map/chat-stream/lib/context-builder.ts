// context-builder.ts
// Builds the raw chart snapshot, history, and current question for the
// destiny counselor prompt.
//
// Prior versions also ran a stack of "advanced" builders (daeun×transit
// synchronization, daily precision, tier3/tier4 astro narratives) that
// pre-interpreted the chart into emoji-heavy prose. Those layers framed
// the LLM into a fixed narrative shape and duplicated information the
// raw chart already carries. They are gone — timing is delivered by
// `formatTimingForPrompt` and chart facts come straight from
// `buildAllDataPrompt`.

import { logger } from '@/lib/logger'
import { guardText } from '@/lib/textGuards'
import { buildAllDataPrompt } from '@/lib/destiny-map/prompt/fortune/base'
import type { CombinedResult } from '@/lib/destiny-map/astrology'
import type { SajuDataStructure, AstroDataStructure, ChatMessage } from './types'

export interface ContextBuilderInput {
  saju?: SajuDataStructure
  astro?: AstroDataStructure
  advancedAstro?: Partial<CombinedResult>
  currentTransits: unknown[]
  lang: string
  trimmedHistory: ChatMessage[]
  lastUserMessage?: string
}

export interface ContextSections {
  rawChartSnapshot: string
  historyText: string
  userQuestion: string
}

function buildRawChartSnapshot(
  saju: SajuDataStructure | undefined,
  astro: AstroDataStructure | undefined,
  advancedAstro: Partial<CombinedResult> | undefined,
  currentTransits: unknown[],
  lang: string
): string {
  if (!saju && !astro) return ''

  try {
    const astroWithTransits = astro
      ? {
          ...astro,
          transits: currentTransits,
        }
      : undefined

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

    return buildAllDataPrompt(lang, 'chat', combinedResult)
  } catch (e) {
    logger.warn('[context-builder] Failed to build raw chart snapshot:', e)
    return ''
  }
}

export function buildLongTermMemorySection(
  personaMemoryContext: string,
  recentSessionSummaries: string,
  lang: string
): string {
  if (!personaMemoryContext && !recentSessionSummaries) return ''

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
    lang === 'ko' ? '[장기 기억]' : '[Long-term memory]',
    ...memoryParts,
  ].join('\n')
}

function buildHistoryText(trimmedHistory: ChatMessage[]): string {
  return trimmedHistory
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${guardText(m.content, 300)}`)
    .join('\n')
    .slice(0, 1500)
}

export function buildContextSections(input: ContextBuilderInput): ContextSections {
  const {
    saju,
    astro,
    advancedAstro,
    currentTransits,
    lang,
    trimmedHistory,
    lastUserMessage = '',
  } = input

  return {
    rawChartSnapshot: buildRawChartSnapshot(saju, astro, advancedAstro, currentTransits, lang),
    historyText: buildHistoryText(trimmedHistory),
    userQuestion: guardText(lastUserMessage, 500),
  }
}
