import { getIljuArchetype } from '@/lib/saju/iljuDictionary'
import type { ActiveSignal, ExtractorContext, SignalExtractor } from '../types'
import { civilYearWindows } from './shared/natalWindows'

/**
 * 본명 일주 사전 (60갑자 archetype) 추출기.
 *
 * 사용자의 본명 일주가 60갑자 중 어느 archetype에 해당하는지.
 * 내용은 평생 동일하고, 범위가 닿는 민용 연도마다 한 신호로 낸다 — 모든 셀에 같은 배경
 * 신호로 들어감. UI에서 "본명 archetype" 컨텍스트로 표시 가능.
 *
 * 활성 윈도우: 그 민용 연도 1/1~12/31, id 는 연도로 끝남 — 빌드 범위와 무관
 * (shared/natalWindows, G13). 예전엔 창 = 빌드 범위라 1일·월 빌드의 창이 갈렸다.
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

    return civilYearWindows(range).map(
      (w): ActiveSignal => ({
        id: `saju.ilju-archetype.${ganji}.${w.year}`,
        source: 'saju',
        kind: 'saju-pattern',
        name: `${ganji} 일주 — ${archetype.character}`,
        korean: `${ganji} 일주: ${archetype.character}`,
        english: `${ganji} day-pillar — ${archetype.character_en}`,
        polarity: 0,
        layer: 'decadal', // 평생 배경
        active: { start: w.start, peak: w.peak, end: w.end },
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
      })
    )
  },
}

export default sajuIljuArchetypeExtractor
