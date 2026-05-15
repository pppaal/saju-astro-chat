import { getIljuArchetype } from '@/lib/saju/iljuDictionary'
import type { ActiveSignal, ExtractorContext, SignalExtractor } from '../types'

/**
 * 본명 일주 사전 (60갑자 archetype) 추출기.
 *
 * 사용자의 본명 일주가 60갑자 중 어느 archetype에 해당하는지.
 * 한 사용자에 1회만 emit (평생 동일). 모든 셀에 같은 배경 신호로 들어감.
 * UI에서 "본명 archetype" 컨텍스트로 표시 가능.
 *
 * 활성 윈도우: 평생 (range 전체).
 * polarity: 0 (중립 — 성격 정보, 길흉 아님)
 * weight: 0.6 (강한 배경)
 */
const sajuIljuArchetypeExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'saju-pattern',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const stem = natal.saju.pillars.day.heavenlyStem.name
    const branch = natal.saju.pillars.day.earthlyBranch.name
    const archetype = getIljuArchetype(stem, branch)
    if (!archetype) return []

    const ganji = `${stem}${branch}`

    return [
      {
        id: `saju.ilju-archetype.${ganji}`,
        source: 'saju',
        kind: 'saju-pattern',
        name: `${ganji} 일주 — ${archetype.character}`,
        korean: `${ganji} 일주: ${archetype.character}`,
        themes: ['personality'],
        polarity: 0,
        layer: 'decadal',   // 평생 배경
        active: { start: range.start, peak: range.start, end: range.end },
        weight: 0.6,
        evidence: {
          module: 'saju-ilju-archetype',
          pillars: [ganji],
          detail: {
            ganji,
            character: archetype.character,
            strengths: archetype.strengths,
            weaknesses: archetype.weaknesses,
            career: archetype.career,
            relationship: archetype.relationship,
          },
        },
      },
    ]
  },
}

export default sajuIljuArchetypeExtractor
