/**
 * surprise 점수 탐색 — 실제 차트로 "평균(옛) vs 희소×중요(신)" 변별 비교.
 * 단언 최소, console 출력 위주 (검증/시각화용).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { computeBaseRates, cellSurprise } from '@/lib/calendar-engine/derivers/surprise'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

function stats(xs: number[]) {
  const n = xs.length
  const mean = xs.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
  const sorted = [...xs].sort((a, b) => a - b)
  return {
    min: Math.min(...xs),
    max: Math.max(...xs),
    mean: Math.round(mean * 100) / 100,
    sd: Math.round(sd * 100) / 100,
    p10: sorted[Math.floor(n * 0.1)],
    p90: sorted[Math.floor(n * 0.9)],
  }
}

describe('surprise — 평균 vs 희소×중요 변별', () => {
  it(
    '실제 차트(2026)에서 분포·극단일 출력',
    async () => {
      const natal = await buildNatalContext(BIRTH)
      const cells = await buildCalendar(
        natal,
        { start: '2026-01-01T00:00:00.000Z', end: '2026-12-31T23:59:59.999Z', granularity: 'day' },
        { includeEvidence: true }
      )
      const dayCells = cells.filter((c) => c.datetime.endsWith('T00:00:00.000Z'))
      const rates = computeBaseRates(dayCells)

      const rows = dayCells.map((c) => ({
        date: c.datetime.slice(0, 10),
        old: Math.round(c.derivedScore),
        sur: cellSurprise(c, rates),
      }))

      const oldStats = stats(rows.map((r) => r.old))
      const surStats = stats(rows.map((r) => r.sur.total))

      // 변별도 = 표준편차 / 범위
      console.log('\n===== 분포 비교 (365일) =====')
      console.log('옛 derivedScore :', JSON.stringify(oldStats))
      console.log('신 surprise     :', JSON.stringify(surStats))
      console.log('옛 변동계수(sd/mean):', (oldStats.sd / oldStats.mean).toFixed(3))
      console.log('신 변동계수(sd/mean):', (surStats.sd / surStats.mean).toFixed(3))

      // base-rate 샘플 — 가장 흔한/드문 타입
      const sortedP = [...rates.p.entries()].sort((a, b) => b[1] - a[1])
      console.log('\n===== base-rate P 상위(흔함=무게0 근처) =====')
      for (const [k, p] of sortedP.slice(0, 6)) console.log(`  P=${p.toFixed(2)}  ${k}`)
      console.log('===== base-rate P 하위(드묾=무게큼) =====')
      for (const [k, p] of sortedP.slice(-6)) console.log(`  P=${p.toFixed(3)}  ${k}`)

      const bySur = [...rows].sort((a, b) => b.sur.total - a.sur.total)
      console.log('\n===== surprise 최고 5일 (드문 게 겹친 날) =====')
      for (const r of bySur.slice(0, 5)) {
        console.log(`  ${r.date}  surprise=${r.sur.total}  (옛=${r.old})`)
        for (const t of r.sur.top.slice(0, 5))
          console.log(`      ${t.importance.toFixed(2)} [${t.layer}/${t.source}] ${t.name} (pol ${t.polarity})`)
      }
      console.log('\n===== surprise 최저 5일 (평범) =====')
      for (const r of bySur.slice(-5)) console.log(`  ${r.date}  surprise=${r.sur.total}  (옛=${r.old})`)

      expect(rows.length).toBeGreaterThan(300)
      // 핵심 가설: surprise 변동계수 > 옛 변동계수 (더 또렷이 변별)
      expect(surStats.sd).toBeGreaterThan(0)
    },
    120000
  )
})
