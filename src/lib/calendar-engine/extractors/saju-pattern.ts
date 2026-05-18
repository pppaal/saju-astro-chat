import { matchAllPatterns } from '@/lib/saju/patternMatcher'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'

/**
 * 본명 사주 패턴 (격국·구조) 추출기.
 *
 * patternMatcher는 본명 차트에서 매칭된 패턴을 반환 (정적).
 * 이걸 "lifetime" 레이어의 배경 신호로 띄움 — 평생 활성.
 * derivers는 이 배경 신호 + 현재 활성 신호 조합으로 "패턴 강화/약화" 판단 가능.
 *
 * matchScore가 높은(50+) 패턴만 emit.
 */

const sajuPatternExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'saju-pattern',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const matches = matchAllPatterns(natal.saju.pillars)
    if (matches.length === 0) return []

    const lifetimeStart = new Date(Date.UTC(natal.input.year, natal.input.month - 1, natal.input.date)).toISOString()
    const lifetimeEnd = new Date(Date.UTC(natal.input.year + 120, 0, 1)).toISOString()
    const rangeStart = new Date(range.start).toISOString()
    const rangeEnd = new Date(range.end).toISOString()

    return matches
      .filter((m) => m.matchScore >= 50)
      .map((m) => ({
        id: `saju.pattern.${m.patternId}`,
        source: 'saju' as const,
        kind: 'saju-pattern' as const,
        name: m.patternName,
        korean: m.patternName,
        themes: themesForPattern(m.category, m.keywords),
        polarity: polarityForPattern(m.rarity, m.matchScore),
        layer: 'decadal' as const,   // 평생 배경 → decadal에 매핑 (가장 긴 레이어)
        active: {
          start: rangeStart > lifetimeStart ? rangeStart : lifetimeStart,
          peak: rangeStart,
          end: rangeEnd < lifetimeEnd ? rangeEnd : lifetimeEnd,
        },
        weight: Math.min(1, 0.5 + m.matchScore / 200),   // 50점=0.75, 100점=1.0
        evidence: {
          module: 'saju-pattern',
          detail: {
            patternId: m.patternId,
            category: m.category,
            rarity: m.rarity,
            matchScore: m.matchScore,
            keywords: m.keywords,
            description: m.description,
            interpretation: m.interpretation,
          },
        },
      }))
  },
}

function polarityForPattern(rarity: string, score: number): Polarity {
  // 매우 희귀 + 고득점 = 강한 길/흉 (패턴은 본질이 길흉이 아닌 경우 많아 일단 +)
  const intensity = Math.min(3, Math.floor(score / 30) + (rarity === 'legendary' ? 1 : 0)) as 1 | 2 | 3
  return intensity
}

import type { AstroThemeKey } from '@/lib/astrology/themes/types'
function themesForPattern(category: string, keywords: string[]): AstroThemeKey[] {
  const themes = new Set<AstroThemeKey>()
  const text = (category + ' ' + keywords.join(' ')).toLowerCase()
  if (/wealth|money|재물|재성/.test(text)) themes.add('money')
  if (/love|romance|연애|도화|family|가족/.test(text)) themes.add('love')
  if (/career|관성|직업|관운|study|학문|문창|reputation|명예|장성/.test(text)) themes.add('career')
  if (/health|건강/.test(text)) themes.add('health')
  if (/creative|창의|식상|spiritual|영성|화개/.test(text)) themes.add('growth')
  if (themes.size === 0) themes.add('growth')
  return Array.from(themes)
}

export default sajuPatternExtractor
