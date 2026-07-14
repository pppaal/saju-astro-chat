import {
  getSupportedTimezones,
  getUserTimezone,
  getOffsetMinutes,
  formatOffset,
  solarTimeCorrectionMinutes,
  getDstAmountMinutes,
} from '@/lib/saju/timezone'

describe('Saju Timezone Utils', () => {
  describe('getDstAmountMinutes', () => {
    it('returns 60 during Northern-hemisphere DST (New York, July)', () => {
      // EDT: 표준 EST(-300) 대비 +60.
      expect(getDstAmountMinutes(new Date('2000-07-15T12:00:00Z'), 'America/New_York')).toBe(60)
    })
    it('returns 0 during Northern-hemisphere standard time (New York, January)', () => {
      expect(getDstAmountMinutes(new Date('2000-01-15T12:00:00Z'), 'America/New_York')).toBe(0)
    })
    it('returns 60 during Southern-hemisphere DST (Sydney, January)', () => {
      // AEDT: 표준 AEST(+600) 대비 +60. min(jan,jul) 로 표준을 잡아야 성립.
      expect(getDstAmountMinutes(new Date('2000-01-15T00:00:00Z'), 'Australia/Sydney')).toBe(60)
    })
    it('returns 0 during Southern-hemisphere standard time (Sydney, July)', () => {
      expect(getDstAmountMinutes(new Date('2000-07-15T00:00:00Z'), 'Australia/Sydney')).toBe(0)
    })
    it('returns 0 for a zone without DST (Seoul, any month)', () => {
      expect(getDstAmountMinutes(new Date('2000-07-15T03:00:00Z'), 'Asia/Seoul')).toBe(0)
      expect(getDstAmountMinutes(new Date('2000-01-15T03:00:00Z'), 'Asia/Seoul')).toBe(0)
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
      // getOffsetMinutes가 0 반환 → standardMeridian 0 → round(120 * 4)
      expect(solarTimeCorrectionMinutes(instant, 120, 'Invalid/Zone')).toBe(480)
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
