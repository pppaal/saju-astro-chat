import {
  getSupportedTimezones,
  getUserTimezone,
  getOffsetMinutes,
  formatOffset,
  solarTimeCorrectionMinutes,
  zoneReferenceLongitude,
  zoneReferencePoint,
  defaultLongitudeFor,
  defaultLatitudeFor,
  meanSolarMinuteOfDay,
  SEOUL_DEFAULT_LOCATION,
} from '@/lib/saju/timezone'

describe('Saju Timezone Utils', () => {
  // 옛 getDstAmountMinutes(1월/7월 offset 으로 DST 추정)는 엔진 감사 E8(SAJU-3·F2)에서
  // 지웠다 — 표준 offset 이 연중 바뀐 해(서울 1954·1961, 모스크바 2014)에 가짜 DST 를
  // 만들었다. 경도 없는 시주는 이제 존 기준 경도 평균태양시 한 경로다.
  describe('zoneReferenceLongitude / defaultLongitudeFor (OD-2)', () => {
    it('Asia/Seoul = 제품 기본 경도 126.978 (별칭 ROK 포함)', () => {
      expect(zoneReferenceLongitude('Asia/Seoul')).toBe(126.978)
      expect(zoneReferenceLongitude('ROK')).toBe(126.978)
      expect(zoneReferencePoint('Asia/Seoul')).toEqual(SEOUL_DEFAULT_LOCATION)
    })
    it('그 외 존은 tzdata zone1970.tab 대표 도시', () => {
      expect(zoneReferenceLongitude('America/Los_Angeles')).toBeCloseTo(-118.24, 2)
      expect(zoneReferenceLongitude('America/New_York')).toBeCloseTo(-74.01, 2)
      expect(zoneReferenceLongitude('Asia/Shanghai')).toBeCloseTo(121.47, 2)
      expect(zoneReferenceLongitude('Asia/Tokyo')).toBeCloseTo(139.74, 1)
      // zone.tab 이 따로 둔 존(Amsterdam), 링크(Calcutta → Kolkata)
      expect(zoneReferenceLongitude('Europe/Amsterdam')).toBeCloseTo(4.9, 2)
      expect(zoneReferenceLongitude('Asia/Calcutta')).toBe(zoneReferenceLongitude('Asia/Kolkata'))
    })
    it('Etc/*·UTC 는 offset × 15', () => {
      expect(zoneReferenceLongitude('UTC')).toBe(0)
      expect(zoneReferenceLongitude('Etc/GMT+5')).toBe(-75)
      expect(zoneReferenceLongitude('Etc/GMT-9')).toBe(135)
    })
    it('런타임이 지원하는 모든 IANA 존에 기준점이 있다 (60° 경계 안)', () => {
      const zones =
        typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
      const jan = new Date(Date.UTC(2024, 0, 15, 12))
      for (const tz of zones) {
        const lon = zoneReferenceLongitude(tz)
        expect(Number.isFinite(lon), tz).toBe(true)
        expect(Math.abs(lon), tz).toBeLessThanOrEqual(180)
        // 기준 경도 자체가 sanity bound 를 넘지 않는다 → 보정이 그대로 쓰인다.
        const corr = solarTimeCorrectionMinutes(jan, lon, tz)
        expect(corr, tz).toBe(solarTimeCorrectionMinutes(jan, undefined, tz))
      }
    })
    it('defaultLongitudeFor / defaultLatitudeFor — 빈·잘못된 존은 Asia/Seoul', () => {
      expect(defaultLongitudeFor('Asia/Seoul')).toBe(126.978)
      expect(defaultLatitudeFor('Asia/Seoul')).toBe(37.5665)
      expect(defaultLongitudeFor(undefined)).toBe(126.978)
      expect(defaultLongitudeFor('')).toBe(126.978)
      expect(defaultLongitudeFor('Not/AZone')).toBe(126.978)
      expect(defaultLongitudeFor('America/Los_Angeles')).toBeCloseTo(-118.24, 2)
      expect(defaultLatitudeFor('America/Los_Angeles')).toBeCloseTo(34.05, 2)
    })
  })

  describe('meanSolarMinuteOfDay — UT + 경도 × 4분', () => {
    it('서울 2000-01-15 10:00 KST(01:00Z) → 09:28', () => {
      expect(meanSolarMinuteOfDay(new Date('2000-01-15T01:00:00Z'), 126.978, 'Asia/Seoul')).toBe(
        9 * 60 + 28
      )
    })
    it('DST 시각도 UT 기준이라 offset 과 무관 (뉴욕 EDT 12:00 = 16:00Z → 11:04)', () => {
      expect(meanSolarMinuteOfDay(new Date('2000-07-15T16:00:00Z'), -74, 'America/New_York')).toBe(
        11 * 60 + 4
      )
    })
  })

  describe('getSupportedTimezones', () => {
    it('returns a non-empty array of timezone strings', () => {
      const timezones = getSupportedTimezones()
      expect(Array.isArray(timezones)).toBe(true)
      expect(timezones.length).toBeGreaterThan(0)
    })

    it('returns sorted timezones', () => {
      const timezones = getSupportedTimezones()
      const sorted = [...timezones].sort((a, b) => a.localeCompare(b))
      expect(timezones).toEqual(sorted)
    })

    it('includes common timezones', () => {
      const timezones = getSupportedTimezones()
      // These should be in any reasonable timezone list
      // Note: Some environments may not include "UTC" directly but use "Etc/UTC"
      expect(timezones.some((tz) => tz.includes('Seoul'))).toBe(true)
      expect(timezones.some((tz) => tz.includes('New_York'))).toBe(true)
    })

    it('returns only valid timezone strings', () => {
      const timezones = getSupportedTimezones()
      timezones.forEach((tz) => {
        expect(typeof tz).toBe('string')
        expect(tz.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getUserTimezone', () => {
    it('returns a string', () => {
      const tz = getUserTimezone()
      expect(typeof tz).toBe('string')
    })

    it('returns a valid timezone or UTC', () => {
      const tz = getUserTimezone()
      // Should not throw when used with Intl
      expect(() => {
        new Intl.DateTimeFormat('en-US', { timeZone: tz })
      }).not.toThrow()
    })
  })

  describe('getOffsetMinutes', () => {
    it('returns 0 for UTC', () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))
      expect(getOffsetMinutes(instant, 'UTC')).toBe(0)
    })

    it('returns 540 for Asia/Seoul (KST = UTC+9)', () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))
      expect(getOffsetMinutes(instant, 'Asia/Seoul')).toBe(540)
    })

    it('returns correct offset for America/New_York', () => {
      // During standard time (EST = UTC-5)
      const winter = new Date(Date.UTC(2024, 0, 15, 12, 0, 0)) // January
      const winterOffset = getOffsetMinutes(winter, 'America/New_York')
      expect(winterOffset).toBe(-300) // -5 hours

      // During daylight time (EDT = UTC-4)
      const summer = new Date(Date.UTC(2024, 6, 15, 12, 0, 0)) // July
      const summerOffset = getOffsetMinutes(summer, 'America/New_York')
      expect(summerOffset).toBe(-240) // -4 hours
    })

    it('returns 0 for invalid timezone', () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))
      expect(getOffsetMinutes(instant, 'Invalid/Timezone')).toBe(0)
    })

    it('handles different dates correctly', () => {
      // Asia/Seoul doesn't have DST, should always be +9
      const date1 = new Date(Date.UTC(2024, 0, 1, 0, 0, 0))
      const date2 = new Date(Date.UTC(2024, 6, 1, 0, 0, 0))

      expect(getOffsetMinutes(date1, 'Asia/Seoul')).toBe(540)
      expect(getOffsetMinutes(date2, 'Asia/Seoul')).toBe(540)
    })

    it('handles edge case timezones', () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))

      // India has +5:30 offset
      const indiaOffset = getOffsetMinutes(instant, 'Asia/Kolkata')
      expect(indiaOffset).toBe(330) // 5.5 hours

      // Nepal has +5:45 offset
      const nepalOffset = getOffsetMinutes(instant, 'Asia/Kathmandu')
      expect(nepalOffset).toBe(345) // 5.75 hours
    })
  })

  describe('formatOffset', () => {
    it('formats positive offsets correctly', () => {
      expect(formatOffset(0)).toBe('UTC+00:00')
      expect(formatOffset(540)).toBe('UTC+09:00')
      expect(formatOffset(330)).toBe('UTC+05:30')
      expect(formatOffset(345)).toBe('UTC+05:45')
    })

    it('formats negative offsets correctly', () => {
      expect(formatOffset(-300)).toBe('UTC-05:00')
      expect(formatOffset(-480)).toBe('UTC-08:00')
      expect(formatOffset(-210)).toBe('UTC-03:30')
    })

    it('handles edge cases', () => {
      expect(formatOffset(60)).toBe('UTC+01:00')
      expect(formatOffset(-60)).toBe('UTC-01:00')
      expect(formatOffset(720)).toBe('UTC+12:00') // Maximum offset
      expect(formatOffset(-720)).toBe('UTC-12:00')
    })

    it('pads single digit hours and minutes', () => {
      expect(formatOffset(90)).toBe('UTC+01:30')
      expect(formatOffset(9)).toBe('UTC+00:09')
    })
  })

  // ============ 추가: 미커버 분기 ============

  describe('getOffsetMinutes - 추가 분기', () => {
    it('reuses cached DateTimeFormat for repeated timezone calls', () => {
      const d1 = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))
      const d2 = new Date(Date.UTC(2024, 5, 1, 12, 0, 0))
      // 첫 호출이 캐시 채움, 두 번째 호출이 캐시 hit 분기 사용
      expect(getOffsetMinutes(d1, 'Asia/Tokyo')).toBe(540)
      expect(getOffsetMinutes(d2, 'Asia/Tokyo')).toBe(540)
    })

    it('returns negative offset west of UTC at midnight (24->0 normalize path)', () => {
      // 자정 근처 UTC에서 서쪽 타임존은 전날로 넘어감 → 음수 offset
      const instant = new Date(Date.UTC(2024, 0, 1, 0, 0, 0))
      const off = getOffsetMinutes(instant, 'America/Los_Angeles')
      expect(off).toBeLessThan(0)
      expect(off).toBe(-480) // PST = UTC-8 (1월)
    })

    it('handles half-hour timezone (Australia/Adelaide)', () => {
      // 남반구 1월 = 일광절약(ACDT = UTC+10:30)
      const summer = new Date(Date.UTC(2024, 0, 15, 2, 0, 0))
      const off = getOffsetMinutes(summer, 'Australia/Adelaide')
      expect([570, 630]).toContain(off) // ACST 570 or ACDT 630
    })
  })

  describe('solarTimeCorrectionMinutes - 추가 분기 (timezone.test)', () => {
    it('invalid timezone → standardMeridian 0 → correction = round(lon*4)', () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))
      // getOffsetMinutes가 0 반환 → standardMeridian 0 → round(30 * 4)
      expect(solarTimeCorrectionMinutes(instant, 30, 'Invalid/Zone')).toBe(120)
      // 자오선(0°)에서 60° 넘게 떨어진 120° 는 버린다(OD-14) → 존 기준(offset×15 = 0) → 0
      expect(solarTimeCorrectionMinutes(instant, 120, 'Invalid/Zone')).toBe(0)
    })

    it('returns 0 for non-finite longitude', () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))
      expect(solarTimeCorrectionMinutes(instant, Number.POSITIVE_INFINITY, 'UTC')).toBe(0)
    })

    it('UTC zone: correction = round(longitude * 4)', () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))
      // UTC offset 0 → standardMeridian 0 → round(15 * 4) = 60
      expect(solarTimeCorrectionMinutes(instant, 15, 'UTC')).toBe(60)
    })
  })
})
