import { lifecycleEventDef } from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import { calculateOuterPlanetMilestones } from '@/lib/calendar-engine/lifecycle/outerMilestones'
import { logger } from '@/lib/logger'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'

/**
 * 라이프사이클 마일스톤 추출기 — 목성·토성·카이런·천왕성 회귀, 외행성 사각·마주봄,
 * 진행 달 회귀.
 *
 * 날짜는 하늘에서 온다: 인생 화면의 마디와 *같은* 실측 순간(calculateOuterPlanetMilestones,
 * 본명당 프로세스 메모)을 읽는다. 활성 창 = 그 마디의 통과 창 — 첫 통과로 이어지는 접근에서
 * 정확각 1° 안에 든 순간부터 같은 역행 묶음의 마지막 통과 뒤 1° 밖으로 나가는 순간까지
 * (LIFECYCLE_ORB_DEG). peak = 첫 정확 통과(인생 화면의 마디 날짜). 예전엔 평균 나이표로
 * "출생연도 + 나이" 1월 1일부터 2~5년 창을 열어, 명왕성 사각이 실제보다 수년~수십 년
 * 이르게 켜지고 그 창이 대운과 겹쳐 인생 '이 10년의 겹침'에 없는 사건을 올렸다
 * (재감사 AC-3·CC-1, G6). 실측 순간이 없는 마디(한평생 안에 교차 없음·천체력 실패)는
 * 신호를 내지 않는다 — 평균 나이는 사실이 아니다.
 *
 * 창은 본명만의 함수라 빌드 범위(1일·월·연)와 무관하다 — 범위와 겹치는 마디만 낸다.
 * polarity: 마일스톤은 본질적으로 변환 압력 → 약한 흉/중립. 사용자 인식상 "쉽지 않은 시기".
 * 진행 달 회귀는 상징 방향이라 교차 키가 아니다(cross-activation isProgressedLifecycle).
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
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range } = ctx
    let milestones: Awaited<ReturnType<typeof calculateOuterPlanetMilestones>>
    try {
      milestones = await calculateOuterPlanetMilestones(natal)
    } catch (err) {
      logger.warn('[astro-lifecycle] milestones unavailable — no lifecycle signals', err)
      return []
    }
    const rangeStart = Date.parse(range.start)
    const rangeEnd = Date.parse(range.end)

    const signals: ActiveSignal[] = []
    for (const m of milestones) {
      const start = Date.parse(m.window.start)
      const end = Date.parse(m.window.end)
      // 통과 창이 빌드 범위와 겹칠 때만.
      if (end < rangeStart || start > rangeEnd) continue
      const def = lifecycleEventDef(m.kind)

      signals.push({
        id: `astro.lifecycle.${m.kind}`,
        source: 'astro',
        kind: 'lifecycle',
        name: def.labelKo,
        // 마일스톤 의미문(meaning).
        korean: def.meaningKo,
        english: def.meaningEn,
        polarity: EVENT_POLARITY[m.kind] ?? 0,
        layer: 'decadal',
        active: { start: m.window.start, peak: m.exactAt, end: m.window.end },
        weight: 0.95, // 라이프 챕터 결정짓는 신호
        evidence: {
          module: 'astro-lifecycle',
          planets: [EVENT_PLANET[m.kind] ?? 'Sun'],
          detail: {
            event: m.kind,
            age: m.age,
            exactDateISO: m.exactDateISO,
            exactAt: m.exactAt,
            lastExactAt: m.lastExactAt,
            passCount: m.passCount,
            meaning: def.meaningKo,
            advice: def.adviceKo,
          },
        },
      })
    }

    return signals
  },
}

export default astroLifecycleExtractor
