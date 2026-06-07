/**
 * 운흐름 v3 step 5 — 실차트 검증.
 *
 * dominance(step2) → crossState(step3) → keyDayNull(step4) 를 실제 차트의 1년치
 * 셀에 돌려 docs/운흐름.md §0.5.6 step5 의 두 가설을 통계로 확인:
 *   (A) 큰 날(isKeyDay)이 *진짜 드문가* — look-elsewhere 보정이 동작하는가.
 *   (B) crossState 가 *날마다 또렷이 다른가* — 합의/긴장/단독/없음이 섞여 나오는가.
 *
 * 단언은 보수적(범위)으로 — 차트별 수치 변동 허용. 상세는 console.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { computeBaseRates } from '@/lib/calendar-engine/derivers/surprise'
import { deriveDominance, type DominanceByScale } from '@/lib/calendar-engine/derivers/dominance'
import { cellCrossState, type CrossState } from '@/lib/calendar-engine/derivers/crossState'
import { circularShiftKeyDays } from '@/lib/calendar-engine/derivers/keyDayNull'
import type { CalendarCell } from '@/lib/calendar-engine/types'

const CHARTS = [
  {
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male' as const,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  },
  {
    birthDate: '1988-11-23',
    birthTime: '21:10',
    gender: 'female' as const,
    latitude: 35.1796,
    longitude: 129.0756,
    timeZone: 'Asia/Seoul',
  },
]

/** 셀의 전 스케일 합산 사주/점성 무게. */
function cellMasses(dom: DominanceByScale): { saju: number; astro: number } {
  let saju = 0
  let astro = 0
  for (const scale of Object.values(dom)) {
    if (!scale) continue
    saju += scale.saju.mass
    astro += scale.astro.mass
  }
  return { saju, astro }
}

describe('운흐름 v3 파이프라인 — 실차트 검증', () => {
  it.each(CHARTS)(
    'dominance→crossState→keyDay 가 드물고 또렷한가 ($birthDate)',
    async (birth) => {
      const natal = await buildNatalContext(birth)
      const cells = await buildCalendar(
        natal,
        { start: '2026-01-01T00:00:00.000Z', end: '2026-12-31T23:59:59.999Z', granularity: 'day' },
        { includeEvidence: true }
      )
      const dayCells: CalendarCell[] = cells
        .filter((c) => c.datetime.endsWith('T00:00:00.000Z'))
        .sort((a, b) => a.datetime.localeCompare(b.datetime))
      const rates = computeBaseRates(dayCells)

      // 셀별 dominance → crossState headline + per-day 사주/점성 무게열.
      const stateCounts: Record<CrossState, number> = {
        agreement: 0,
        tension: 0,
        'saju-only': 0,
        'astro-only': 0,
        none: 0,
      }
      const sajuSeries: number[] = []
      const astroSeries: number[] = []
      for (const c of dayCells) {
        const dom = deriveDominance(c.signals, rates)
        const { headline } = cellCrossState(dom)
        stateCounts[headline?.cross.state ?? 'none'] += 1
        const m = cellMasses(dom)
        sajuSeries.push(m.saju)
        astroSeries.push(m.astro)
      }

      const keyDays = circularShiftKeyDays(sajuSeries, astroSeries)
      const keyCount = keyDays.isKeyDay.filter(Boolean).length
      const keyRate = keyCount / dayCells.length
      const distinctStates = Object.values(stateCounts).filter((n) => n > 0).length

      console.info(`\n===== v3 검증 (${birth.birthDate}, ${dayCells.length}일) =====`)
      console.info('crossState 분포:', JSON.stringify(stateCounts))
      console.info(`distinct crossState: ${distinctStates}`)
      console.info(
        `큰 날(keyDay): ${keyCount}일 (${(keyRate * 100).toFixed(1)}%), 임계=${keyDays.threshold.toFixed(2)}`
      )
      const topKey = keyDays.observed
        .map((v, i) => ({ d: dayCells[i].datetime.slice(0, 10), v }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
      console.info('교차 무게 최고 5일:', topKey.map((x) => `${x.d}=${x.v.toFixed(2)}`).join(', '))

      // (A) 큰 날은 드물다 — look-elsewhere 보정 → 1년의 20% 이하.
      expect(keyRate).toBeLessThanOrEqual(0.2)
      // (B) crossState 가 한 값으로 뭉개지지 않고 최소 2종 이상 섞임.
      expect(distinctStates).toBeGreaterThanOrEqual(2)
      // 파이프라인이 실차트에서 신호를 실제로 만들어냄.
      expect(sajuSeries.some((x) => x > 0)).toBe(true)
      expect(astroSeries.some((x) => x > 0)).toBe(true)
    },
    180000
  )
})
