import { buildLifecycleTiming } from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../../types'

/**
 * 라이프사이클 마일스톤 추출기.
 * 12개 외행성 마일스톤 (Saturn Return, Uranus Opposition, Chiron Return 등).
 *
 * 활성 윈도우: ageStart~ageEnd (보통 2~4년).
 * polarity: 마일스톤은 본질적으로 변환 압력 → 약한 흉/중립으로 표시. 사용자 인식상 "쉽지 않은 시기".
 *
 * 데이터 출처: calendar-engine/lifecycle/astroLifecycle.ts (단일 진실 출처).
 */

const EVENT_POLARITY: Record<string, Polarity> = {
  jupiter_return_1: 2,
  jupiter_return_2: 2,
  jupiter_return_3: 2,
  jupiter_return_5: 2,
  saturn_return_1: -1,
  saturn_return_2: -1,
  progressed_lunar_1: 0,
  pluto_square_pluto: -2,
  uranus_opposition: -1,
  neptune_square: -1,
  chiron_return: 0,
  uranus_return: 0,
}

const EVENT_PLANET: Record<string, string> = {
  jupiter_return_1: 'Jupiter',
  jupiter_return_2: 'Jupiter',
  jupiter_return_3: 'Jupiter',
  jupiter_return_5: 'Jupiter',
  saturn_return_1: 'Saturn',
  saturn_return_2: 'Saturn',
  progressed_lunar_1: 'Moon',
  pluto_square_pluto: 'Pluto',
  uranus_opposition: 'Uranus',
  neptune_square: 'Neptune',
  chiron_return: 'Chiron',
  uranus_return: 'Uranus',
}

const astroLifecycleExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'lifecycle',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const birthYear = natal.input.year
    const startYear = new Date(range.start).getUTCFullYear()
    const endYear = new Date(range.end).getUTCFullYear()

    const signals: ActiveSignal[] = []
    // range 안의 각 연도에 대해 lifecycle 검사 — 단순히 endYear 기준으로 한번만 호출
    const output = buildLifecycleTiming(birthYear, endYear)
    // EN meaning 매핑 — 동일 TABLE 순서라 event 키로 짝지음.
    const enByEvent = new Map(
      buildLifecycleTiming(birthYear, endYear, false).events.map((e) => [e.event, e])
    )

    for (const entry of output.events) {
      // 이벤트 윈도우가 range와 겹치는지
      const eventStart = new Date(Date.UTC(entry.startYear, 0, 1))
      // ageRange "29~30세" 형태에서 연수 길이 추정
      const eventDuration = estimateDurationYears(entry.ageRange)
      const eventEnd = new Date(Date.UTC(entry.startYear + eventDuration, 0, 1))
      const rangeStart = new Date(range.start)
      const rangeEnd = new Date(range.end)
      if (eventEnd < rangeStart || eventStart > rangeEnd) continue

      const peak = new Date((eventStart.getTime() + eventEnd.getTime()) / 2)
      const planet = EVENT_PLANET[entry.event] ?? 'Sun'

      signals.push({
        id: `astro.lifecycle.${entry.event}`,
        source: 'astro',
        kind: 'lifecycle',
        name: entry.label,
        // 마일스톤 의미문(meaning) 우선 — 없으면 라벨 폴백.
        korean: entry.meaning ?? entry.label,
        english:
          enByEvent.get(entry.event)?.meaning ?? enByEvent.get(entry.event)?.label ?? entry.event,
        polarity: EVENT_POLARITY[entry.event] ?? 0,
        layer: 'decadal',
        active: {
          start: eventStart.toISOString(),
          peak: peak.toISOString(),
          end: eventEnd.toISOString(),
        },
        weight: 0.95, // 라이프 챕터 결정짓는 신호
        evidence: {
          module: 'astro-lifecycle',
          planets: [planet],
          detail: {
            event: entry.event,
            ageRange: entry.ageRange,
            meaning: entry.meaning,
            advice: entry.advice,
          },
        },
      })
    }

    return signals
  },
}

function estimateDurationYears(ageRange: string): number {
  // "29~30세" → 2, "57~60세" → 4
  const match = ageRange.match(/(\d+)\s*~\s*(\d+)/)
  if (!match) return 2
  return Math.max(1, Number(match[2]) - Number(match[1]) + 1)
}

export default astroLifecycleExtractor
