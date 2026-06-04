/**
 * 점성 계산→해석 파이프라인에서 발견된 6개 버그의 회귀 방지 테스트.
 *
 * 전역 tests/setup.ts 는 swisseph/ephe 를 mock(가짜 위치)하므로, 천문값에
 * 의존하는 이 테스트는 real-ephemeris-correctness.test.ts 와 동일하게 mock 을
 * 해제(vi.unmock)하고 진짜 Swiss Ephemeris + public/ephe 로 검증한다.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

// 전역 mock 해제 → 실제 swisseph 사용. (hoisted)
vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

// native swisseph 미탑재(CI ABI 불일치 등)면 skip — real-ephemeris 테스트와 동일.
const swissephAvailable = await import('swisseph')
  .then(() => true)
  .catch(() => false)
const d = swissephAvailable ? describe : describe.skip

const SEOUL = {
  year: 1990,
  month: 6,
  date: 15,
  hour: 12,
  minute: 0,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

d('astrology bugfix regressions (real ephemeris)', () => {
  // ── 버그 #2/#6: progression/solar-arc 목표날짜 결정성 ──
  describe('targetDateToJD — server-timezone independent', () => {
    it('anchors a date-only target to noon UTC (not local midnight)', async () => {
      const { targetDateToJD, isoToJD } = await import(
        '../../../../src/lib/astrology/foundation/shared'
      )
      const jd = targetDateToJD('2026-06-04')
      expect(jd).toBeCloseTo(isoToJD('2026-06-04T12:00:00', 'UTC'), 9)
      expect(jd - isoToJD('2026-06-04T00:00:00', 'UTC')).toBeCloseTo(0.5, 6)
    })

    it('is deterministic and honors explicit UTC datetime', async () => {
      const { targetDateToJD, isoToJD } = await import(
        '../../../../src/lib/astrology/foundation/shared'
      )
      expect(targetDateToJD('2000-01-01')).toBe(targetDateToJD('2000-01-01'))
      expect(targetDateToJD('2026-06-04T06:30:00')).toBeCloseTo(
        isoToJD('2026-06-04T06:30:00', 'UTC'),
        9
      )
    })
  })

  // ── 버그 #1: 극권 폴백 시 하우스 시스템 라벨 ──
  describe('house system label reflects the system actually used', () => {
    it('reports Placidus at normal latitude', async () => {
      const { calculateNatalChart } = await import(
        '../../../../src/lib/astrology/foundation/astrologyService'
      )
      const chart = await calculateNatalChart(SEOUL)
      expect(chart.meta?.houseSystem).toBe('Placidus')
    })

    it('reports WholeSign (not Placidus) for a polar birth where Placidus fails', async () => {
      const { calculateNatalChart } = await import(
        '../../../../src/lib/astrology/foundation/astrologyService'
      )
      const chart = await calculateNatalChart({
        ...SEOUL,
        latitude: 78.22, // Svalbard — Placidus 계산 불가
        longitude: 15.65,
        timeZone: 'UTC',
      })
      expect(chart.meta?.houseSystem).toBe('WholeSign')
    })
  })

  // ── 버그 #5: Vertex 가 Descendant 가 아니라 정식 Vertex ──
  describe('Vertex is the true prime-vertical point, not the Descendant', () => {
    it('matches Swiss Ephemeris vertex and differs from ASC+180', async () => {
      const { calculateVertex } = await import(
        '../../../../src/lib/astrology/foundation/extraPoints'
      )
      const { isoToJD } = await import('../../../../src/lib/astrology/foundation/shared')
      const { normalize360 } = await import('../../../../src/lib/astrology/foundation/utils')
      const { getSwisseph } = await import('../../../../src/lib/astrology/foundation/ephe')
      const swe = getSwisseph()
      const jd = isoToJD('1990-06-15T03:00:00', 'UTC')
      const h = swe.swe_houses(jd, SEOUL.latitude, SEOUL.longitude, 'P') as {
        vertex: number
        ascendant: number
        house: number[]
      }
      const v = calculateVertex(jd, SEOUL.latitude, SEOUL.longitude, h.house)
      expect(v.longitude).toBeCloseTo(normalize360(h.vertex), 3)
      const descendant = normalize360(h.ascendant + 180)
      expect(Math.abs(normalize360(v.longitude - descendant))).toBeGreaterThan(1)
    })
  })

  // ── 버그 #4: 월 리턴 — 빠른 달도 정확한 회귀 순간을 찾는다 ──
  describe('lunar return finds the true return instant', () => {
    it('places the Moon back at the natal Moon longitude', async () => {
      const { calculateLunarReturn } = await import(
        '../../../../src/lib/astrology/foundation/returns'
      )
      const { isoToJD, natalToJD } = await import(
        '../../../../src/lib/astrology/foundation/shared'
      )
      const { normalize360 } = await import('../../../../src/lib/astrology/foundation/utils')
      const { getSwisseph } = await import('../../../../src/lib/astrology/foundation/ephe')
      const swe = getSwisseph()
      const natalJD = natalToJD(SEOUL)
      const natalMoon = (
        swe.swe_calc_ut(natalJD, swe.SE_MOON, swe.SEFLG_SPEED) as { longitude: number }
      ).longitude

      const ret = await calculateLunarReturn({ natal: SEOUL, month: 7, year: 2024 })
      const retJD = isoToJD(ret.exactReturnTime!, 'UTC')
      const retMoon = (
        swe.swe_calc_ut(retJD, swe.SE_MOON, swe.SEFLG_SPEED) as { longitude: number }
      ).longitude

      const delta = Math.abs(normalize360(retMoon - natalMoon + 180) - 180)
      expect(delta).toBeLessThan(0.05)
    })
  })

  // ── 버그 #3: 일식 하우스 — 미매칭 시 house 1 날조 대신 UNKNOWN(0) ──
  describe('eclipse impact house delegates to the shared resolver', () => {
    it('returns UNKNOWN_HOUSE (0), not a fabricated 1, when cusps are malformed', async () => {
      const { findEclipseImpact } = await import(
        '../../../../src/lib/astrology/foundation/eclipses'
      )
      const { calculateNatalChart, toChart } = await import(
        '../../../../src/lib/astrology/foundation/astrologyService'
      )
      const base = toChart(await calculateNatalChart(SEOUL))
      const malformed = {
        ...base,
        houses: base.houses.slice(0, 3), // 12개 미만 → resolver 가 0
        planets: [{ ...base.planets[0], longitude: 100 }],
      }
      const ecl = {
        type: 'solar' as const,
        date: '2024-04-08',
        longitude: 100,
        sign: '양자리' as const,
        degree: 19,
        description: '',
      }
      const impacts = findEclipseImpact(malformed, [ecl], 5)
      expect(impacts.length).toBeGreaterThan(0)
      expect(impacts[0].house).toBe(0)
    })
  })
})
