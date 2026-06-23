// @vitest-environment node
// tests/lib/astrology/foundation/shared.branches.test.ts
//
// shared.ts 의 *유틸 헬퍼* 미커버 분기 집중 테스트. 기존
// tests/lib/astrology/shared.test.ts 는 isSwissEphError/getMidpoint/
// findHouseForLongitude/createPlanetData 만 덮으므로, 여기서는
// throwIfSwissEphError, matchHouseForCusps(malformed/NaN/wrap),
// resolveHouseOrWarn(UNKNOWN_HOUSE), extractLongitudeSpeed,
// extractSwissLongitude, getMidpoint(longer-arc), targetDateToJD 의
// 각 분기 arm 을 다룬다. (swisseph 는 tests/setup.ts 에서 전역 모킹됨.)
import { describe, it, expect, vi } from 'vitest'
import {
  throwIfSwissEphError,
  matchHouseForCusps,
  resolveHouseOrWarn,
  findHouseForLongitude,
  UNKNOWN_HOUSE,
  extractLongitudeSpeed,
  extractSwissLongitude,
  getMidpoint,
  isSwissEphError,
  targetDateToJD,
} from '@/lib/astrology/foundation/shared'
import type { House } from '@/lib/astrology/foundation/types'

// logger.warn 가 호출되는 분기를 조용히/검증 가능하게.
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

describe('shared.ts 미커버 분기 — utility helpers', () => {
  describe('throwIfSwissEphError', () => {
    it('throws with context when result has error / 에러 결과면 context 를 붙여 throw', () => {
      expect(() => throwIfSwissEphError({ error: 'boom' }, 'ctx')).toThrow('ctx: boom')
    })

    it('does not throw for non-error result / 정상 결과면 통과', () => {
      expect(() => throwIfSwissEphError({ longitude: 10 }, 'ctx')).not.toThrow()
    })
  })

  describe('matchHouseForCusps — malformed/NaN/wrap 분기', () => {
    const evenCusps = Array.from({ length: 12 }, (_, i) => i * 30)

    it('returns null when fewer than 12 cusps / 쿠스프가 12개 미만이면 null', () => {
      expect(matchHouseForCusps(10, [0, 30, 60])).toBeNull()
    })

    it('returns null when cusps is not an array / 배열이 아니면 null', () => {
      // @ts-expect-error 의도적으로 잘못된 타입 전달
      expect(matchHouseForCusps(10, null)).toBeNull()
    })

    it('returns null when a cusp is NaN / 쿠스프에 NaN 있으면 null', () => {
      // NaN 을 첫 쿠스프에 둬 첫 iteration 의 finite 체크가 곧장 null 을 반환.
      const bad = [...evenCusps]
      bad[0] = NaN
      expect(matchHouseForCusps(10, bad)).toBeNull()
    })

    it('returns null when a cusp is non-finite (Infinity) / 무한대면 null', () => {
      const bad = [...evenCusps]
      bad[0] = Infinity
      expect(matchHouseForCusps(10, bad)).toBeNull()
    })

    it('matches house 1 for 15deg with even cusps / 균등 쿠스프에서 1하우스', () => {
      expect(matchHouseForCusps(15, evenCusps)).toBe(1)
    })

    it('matches the correct house at exact cusp boundary / 정확히 쿠스프 경계', () => {
      // 30 → house 2 의 시작 (start inclusive)
      expect(matchHouseForCusps(30, evenCusps)).toBe(2)
    })

    it('handles wrap-around cusps (last house spans 360) / 360 wrap 마지막 하우스', () => {
      // 마지막 쿠스프 330 → 0 으로 wrap. 350 은 12하우스.
      expect(matchHouseForCusps(350, evenCusps)).toBe(12)
    })

    it('handles cusps where end < start (wrap inside loop) / end<start wrap', () => {
      // 첫 쿠스프가 350, 다음이 20 → start=350, end=380(=20+360). 355 ∈ house 1.
      const wrapCusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320]
      expect(matchHouseForCusps(355, wrapCusps)).toBe(1)
      expect(matchHouseForCusps(10, wrapCusps)).toBe(1)
    })
  })

  describe('resolveHouseOrWarn — UNKNOWN_HOUSE 폴백', () => {
    it('returns matched house when valid / 정상이면 하우스 번호', () => {
      const cusps = Array.from({ length: 12 }, (_, i) => i * 30)
      expect(resolveHouseOrWarn(95, cusps, 'test')).toBe(4)
    })

    it('returns UNKNOWN_HOUSE(0) and warns on malformed cusps / 비정상이면 0 + warn', async () => {
      const { logger } = await import('@/lib/logger')
      const result = resolveHouseOrWarn(95, [0, 30], 'test-context')
      expect(result).toBe(UNKNOWN_HOUSE)
      expect(result).toBe(0)
      expect(logger.warn).toHaveBeenCalled()
    })

    it('warn cuspCount handles non-array cusps / 비배열 cusps 의 cuspCount=0', async () => {
      const { logger } = await import('@/lib/logger')
      ;(logger.warn as ReturnType<typeof vi.fn>).mockClear()
      // @ts-expect-error 의도적 비배열
      const result = resolveHouseOrWarn(95, undefined, 'ctx')
      expect(result).toBe(UNKNOWN_HOUSE)
      const callArg = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0][1]
      expect(callArg.cuspCount).toBe(0)
    })
  })

  describe('findHouseForLongitude — House[] 위임', () => {
    it('delegates to resolveHouseOrWarn with cusp extraction / cusp 추출 후 위임', () => {
      const houses: House[] = Array.from({ length: 12 }, (_, i) => ({
        index: i + 1,
        cusp: i * 30,
        sign: 'Aries',
        formatted: '',
      })) as House[]
      expect(findHouseForLongitude(185, houses)).toBe(7)
    })

    it('returns UNKNOWN_HOUSE for non-array houses / 비배열이면 0', () => {
      // @ts-expect-error 의도적 비배열
      expect(findHouseForLongitude(10, null)).toBe(UNKNOWN_HOUSE)
    })

    it('handles houses missing cusp (undefined → NaN → null) / cusp 누락', () => {
      const houses = [{ index: 1 }, { index: 2 }] as unknown as House[]
      expect(findHouseForLongitude(10, houses)).toBe(UNKNOWN_HOUSE)
    })
  })

  describe('extractLongitudeSpeed — longitudeSpeed/speed/none 분기', () => {
    it('prefers longitudeSpeed when finite / longitudeSpeed 우선', () => {
      expect(extractLongitudeSpeed({ longitudeSpeed: 5.5, speed: 1.0 })).toBe(5.5)
    })

    it('falls back to speed when longitudeSpeed absent / speed 폴백', () => {
      expect(extractLongitudeSpeed({ speed: 2.2 })).toBe(2.2)
    })

    it('falls back to speed when longitudeSpeed is NaN / longitudeSpeed NaN 이면 speed', () => {
      expect(extractLongitudeSpeed({ longitudeSpeed: NaN, speed: 3.3 })).toBe(3.3)
    })

    it('returns undefined when neither finite / 둘 다 없으면 undefined', () => {
      expect(extractLongitudeSpeed({ foo: 'bar' })).toBeUndefined()
      expect(extractLongitudeSpeed({ longitudeSpeed: NaN, speed: Infinity })).toBeUndefined()
    })

    it('returns undefined for non-object / 비객체면 undefined', () => {
      expect(extractLongitudeSpeed(null)).toBeUndefined()
      expect(extractLongitudeSpeed(42)).toBeUndefined()
      expect(extractLongitudeSpeed('x')).toBeUndefined()
    })
  })

  describe('extractSwissLongitude — 성공/throw 분기', () => {
    it('returns longitude when finite / 정상 longitude', () => {
      expect(extractSwissLongitude({ longitude: 123.45 })).toBe(123.45)
    })

    it('throws when longitude missing / longitude 없으면 throw', () => {
      expect(() => extractSwissLongitude({ latitude: 0 })).toThrow('Unexpected coordinate system')
    })

    it('throws when longitude is NaN / longitude NaN 이면 throw', () => {
      expect(() => extractSwissLongitude({ longitude: NaN })).toThrow()
    })

    it('throws for non-object / 비객체면 throw', () => {
      expect(() => extractSwissLongitude(null)).toThrow()
      expect(() => extractSwissLongitude(5)).toThrow()
    })
  })

  describe('getMidpoint — shorter vs longer arc 분기', () => {
    it('uses shorter arc within a quadrant / 같은 사분면 짧은 호', () => {
      expect(getMidpoint(10, 50)).toBe(30)
    })

    it('handles diff < 0 wrap (b before a) / b<a wrap', () => {
      // a=350, b=10 → diff=-340→20 → midpoint 0 (=360)
      expect(getMidpoint(350, 10)).toBe(0)
    })

    it('uses opposite midpoint when arc > 180 / 호>180 이면 반대편', () => {
      // a=10, b=200 → diff=190 (>180) → return a+95+180 = 285
      expect(getMidpoint(10, 200)).toBe(285)
    })

    it('exactly 180 apart uses shorter-arc branch / 정확히 180', () => {
      expect(getMidpoint(0, 180)).toBe(90)
    })
  })

  describe('isSwissEphError — 추가 edge', () => {
    it('true only with error prop / error 속성 있을 때만 true', () => {
      expect(isSwissEphError({ error: 'x' })).toBe(true)
      expect(isSwissEphError({})).toBe(false)
    })
  })

  describe('targetDateToJD — date-only vs datetime 분기', () => {
    it('anchors bare YYYY-MM-DD to noon UTC / 날짜만이면 정오 UTC', () => {
      const jd = targetDateToJD('2000-01-01')
      // J2000.0 (2000-01-01 12:00 UTC) ≈ 2451545.0
      expect(jd).toBeCloseTo(2451545.0, 3)
    })

    it('honors explicit datetime as-is / 명시적 시각은 그대로', () => {
      const jdNoon = targetDateToJD('2000-01-01T12:00:00')
      const jdMidnight = targetDateToJD('2000-01-01T00:00:00')
      // 자정은 정오보다 0.5일 작아야 한다.
      expect(jdNoon - jdMidnight).toBeCloseTo(0.5, 3)
    })

    it('trims surrounding whitespace / 공백 트림', () => {
      const a = targetDateToJD('  2000-01-01  ')
      const b = targetDateToJD('2000-01-01')
      expect(a).toBeCloseTo(b, 6)
    })
  })
})
