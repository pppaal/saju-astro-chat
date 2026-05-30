/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

import { cellsToYearlyDates } from '@/lib/calendar-engine/adapters/cellsToYearlyDates'
import type { CalendarCell } from '@/lib/calendar-engine/types'

const FIVE_THEMES = ['love', 'money', 'career', 'health', 'growth']

async function buildYearCells(): Promise<CalendarCell[]> {
  const { getOrBuildNatalContext } = await import('@/lib/calendar-engine/context/cache')
  const { calculateSajuData } = await import('@/lib/saju/saju')
  const { calculateNatalChart } = await import('@/lib/astrology/foundation/astrologyService')
  const { buildCalendar } = await import('@/lib/calendar-engine')

  const saju = calculateSajuData('1990-05-15', '10:30', 'male', 'solar', 'Asia/Seoul')
  const astroChart = await calculateNatalChart({
    year: 1990, month: 5, date: 15, hour: 10, minute: 30,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  })
  const { context } = await getOrBuildNatalContext(
    { birthDate: '1990-05-15', birthTime: '10:30', gender: 'male', latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' },
    { saju, astroChart: astroChart as never }
  )

  const all: CalendarCell[] = []
  for (let m = 0; m < 12; m++) {
    const start = new Date(Date.UTC(2026, m, 1)).toISOString()
    const end = new Date(Date.UTC(2026, m + 1, 0, 23, 59, 59)).toISOString()
    const cells = await buildCalendar(context, { start, end, granularity: 'day' }, { includeEvidence: true })
    all.push(...cells)
  }
  return all
}

describe('cellsToYearlyDates (v2-native adapter)', () => {
  it(
    'matches the (all-v2) migration golden grade + displayScore for every date (profile B)',
    async () => {
      const goldenPath = join(__dirname, '../../../app/api/calendar/__golden__/migration-baseline.json')
      if (!existsSync(goldenPath)) {
        console.warn('golden missing — skipping equivalence assertion')
        return
      }
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8'))
      const goldenDates: Record<string, [number, number, number, number, string]> =
        golden['B-1990-05-15-ko'].dates

      const cells = await buildYearCells()
      const dates = cellsToYearlyDates(cells, { lang: 'ko' })
      expect(dates.length).toBe(Object.keys(goldenDates).length)

      // 단계 2a 이후 라우트는 12달 전부 v2 derivedScore 를 displayScore 로 쓴다.
      // 어댑터도 동일 cells 에서 derivedScore 를 쓰므로 365일 grade·displayScore 가
      // byte 동일해야 한다 — route ↔ adapter 완전 동등성 잠금(단계 2 전환 안전망).
      const perMonth: Record<string, { total: number; match: number }> = {}
      for (const d of dates) {
        const g = goldenDates[d.date]
        expect(g, `golden missing ${d.date}`).toBeTruthy()
        const mk = d.date.slice(0, 7)
        perMonth[mk] = perMonth[mk] ?? { total: 0, match: 0 }
        perMonth[mk].total++
        if (d.displayScore === g[1] && d.grade === g[0]) perMonth[mk].match++
      }
      const summary = Object.entries(perMonth)
        .map(([m, v]) => `${m}:${v.match}/${v.total}`)
        .join('  ')
      const fullMatch = Object.values(perMonth).every((v) => v.match === v.total)
      expect(fullMatch, `route↔adapter 전 달 100% 일치해야 함. 실측: ${summary}`).toBe(true)
    },
    180000
  )

  it(
    'produces complete, well-formed date objects',
    async () => {
      const cells = await buildYearCells()
      const dates = cellsToYearlyDates(cells, { lang: 'ko' })

      let withPatterns = 0
      let withCategories = 0
      for (const d of dates) {
        expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(d.ganzhi.length).toBeGreaterThan(0)
        expect(d.score).toBe(d.displayScore)
        expect(d.grade).toBeGreaterThanOrEqual(0)
        expect(d.grade).toBeLessThanOrEqual(4)
        for (const c of d.categories) expect(FIVE_THEMES).toContain(c)
        expect(typeof d.title).toBe('string')
        expect(d.title.length).toBeGreaterThan(0)
        expect(typeof d.description).toBe('string')
        expect(d.description.length).toBeGreaterThan(0)
        expect(d.crossAgreementPercent).toBeGreaterThanOrEqual(0)
        expect(d.crossAgreementPercent).toBeLessThanOrEqual(100)
        expect(d.scoreBreakdown.finalScore).toBe(d.score)
        expect(Array.isArray(d.recommendations)).toBe(true)
        expect(Array.isArray(d.warnings)).toBe(true)
        if (d.matchedPatterns.length > 0) withPatterns++
        if (d.categories.length > 0) withCategories++
      }
      // 실데이터엔 패턴·카테고리가 붙는 날이 대다수여야 함.
      expect(withPatterns).toBeGreaterThan(300)
      expect(withCategories).toBeGreaterThan(300)
    },
    180000
  )

  it('sorts dates ascending', () => {
    const cell = (datetime: string): CalendarCell => ({
      datetime,
      signals: [],
      derivedScore: 50,
      themeScores: {},
      matchedPatterns: [],
      topReasons: [],
      cautions: [],
    })
    const out = cellsToYearlyDates([
      cell('2026-03-02T00:00:00.000Z'),
      cell('2026-01-01T00:00:00.000Z'),
      cell('2026-02-15T00:00:00.000Z'),
    ])
    expect(out.map((d) => d.date)).toEqual(['2026-01-01', '2026-02-15', '2026-03-02'])
  })
})
