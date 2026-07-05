/**
 * Tests for src/lib/datetime/timezone.ts
 * Timezone utilities for date/time handling
 */
import { describe, it, expect } from 'vitest'
import {
  getNowInTimezone,
  getDateInTimezone,
  formatDateString,
  getIsoInTimezone,
  isValidTimezone,
  getDateComponentsInTimezone,
  getWeekdayInTimezone,
  DEFAULT_TIMEZONE,
} from '@/lib/datetime/timezone'

describe('Timezone Utilities', () => {
  describe('DEFAULT_TIMEZONE', () => {
    it('should be Asia/Seoul', () => {
      expect(DEFAULT_TIMEZONE).toBe('Asia/Seoul')
    })
  })

  describe('getNowInTimezone', () => {
    it('should return year, month, day components', () => {
      const result = getNowInTimezone('Asia/Seoul')

      expect(result).toHaveProperty('year')
      expect(result).toHaveProperty('month')
      expect(result).toHaveProperty('day')

      expect(typeof result.year).toBe('number')
      expect(typeof result.month).toBe('number')
      expect(typeof result.day).toBe('number')
    })

    it('should return valid date components', () => {
      const result = getNowInTimezone()

      expect(result.year).toBeGreaterThanOrEqual(2024)
      expect(result.month).toBeGreaterThanOrEqual(1)
      expect(result.month).toBeLessThanOrEqual(12)
      expect(result.day).toBeGreaterThanOrEqual(1)
      expect(result.day).toBeLessThanOrEqual(31)
    })

    it('should use Asia/Seoul as default timezone', () => {
      const withDefault = getNowInTimezone()
      const withSeoul = getNowInTimezone('Asia/Seoul')

      expect(withDefault.year).toBe(withSeoul.year)
      expect(withDefault.month).toBe(withSeoul.month)
      expect(withDefault.day).toBe(withSeoul.day)
    })

    it('should handle different timezones', () => {
      const utc = getNowInTimezone('UTC')
      const tokyo = getNowInTimezone('Asia/Tokyo')
      const newYork = getNowInTimezone('America/New_York')

      expect(utc.year).toBeGreaterThanOrEqual(2024)
      expect(tokyo.year).toBeGreaterThanOrEqual(2024)
      expect(newYork.year).toBeGreaterThanOrEqual(2024)
    })

    it('should fallback to Asia/Seoul for invalid timezone', () => {
      const result = getNowInTimezone('Invalid/Timezone')
      const seoul = getNowInTimezone('Asia/Seoul')

      expect(result.year).toBe(seoul.year)
      expect(result.month).toBe(seoul.month)
      expect(result.day).toBe(seoul.day)
    })
  })

  describe('getDateInTimezone', () => {
    it('should return date string in YYYY-MM-DD format', () => {
      const result = getDateInTimezone('Asia/Seoul')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return valid ISO date when no timezone provided', () => {
      const result = getDateInTimezone()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should handle different timezones', () => {
      const utc = getDateInTimezone('UTC')
      const tokyo = getDateInTimezone('Asia/Tokyo')

      expect(utc).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(tokyo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should fallback gracefully for invalid timezone', () => {
      const result = getDateInTimezone('Invalid/Timezone')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('formatDateString', () => {
    it('should format date components to YYYY-MM-DD', () => {
      expect(formatDateString(2024, 1, 15)).toBe('2024-01-15')
      expect(formatDateString(2024, 12, 31)).toBe('2024-12-31')
    })

    it('should pad single-digit months and days', () => {
      expect(formatDateString(2024, 1, 1)).toBe('2024-01-01')
      expect(formatDateString(2024, 9, 5)).toBe('2024-09-05')
    })

    it('should handle edge cases', () => {
      expect(formatDateString(2024, 2, 29)).toBe('2024-02-29')
      expect(formatDateString(1999, 12, 31)).toBe('1999-12-31')
    })
  })

  describe('getIsoInTimezone', () => {
    it('should return ISO datetime format', () => {
      const result = getIsoInTimezone('Asia/Seoul')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    })

    it('should use default timezone when not specified', () => {
      const result = getIsoInTimezone()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    })

    it('should handle different timezones', () => {
      const utc = getIsoInTimezone('UTC')
      const tokyo = getIsoInTimezone('Asia/Tokyo')

      expect(utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
      expect(tokyo).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    })

    it('should fallback for invalid timezone', () => {
      const result = getIsoInTimezone('Invalid/Timezone')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    })
  })

  describe('isValidTimezone', () => {
    it('should return true for valid IANA timezones', () => {
      expect(isValidTimezone('Asia/Seoul')).toBe(true)
      expect(isValidTimezone('UTC')).toBe(true)
      expect(isValidTimezone('America/New_York')).toBe(true)
      expect(isValidTimezone('Europe/London')).toBe(true)
      expect(isValidTimezone('Asia/Tokyo')).toBe(true)
    })

    it('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false)
      expect(isValidTimezone('NotATimezone')).toBe(false)
      expect(isValidTimezone('Asia/NotReal')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidTimezone('Etc/GMT')).toBe(true)
      expect(isValidTimezone('Etc/UTC')).toBe(true)
      expect(isValidTimezone('GMT')).toBe(true)
    })
  })

  describe('Cross-timezone consistency', () => {
    it('should return consistent date from getNowInTimezone and getDateInTimezone', () => {
      const tz = 'Asia/Seoul'
      const components = getNowInTimezone(tz)
      const dateString = getDateInTimezone(tz)

      const formattedFromComponents = formatDateString(
        components.year,
        components.month,
        components.day
      )

      expect(formattedFromComponents).toBe(dateString)
    })

    it('should have consistent date in ISO format', () => {
      const tz = 'UTC'
      const dateString = getDateInTimezone(tz)
      const isoString = getIsoInTimezone(tz)

      expect(isoString.startsWith(dateString)).toBe(true)
    })
  })

  describe('Time zone offset handling', () => {
    it('should handle timezone at midnight edge', () => {
      const seoul = getNowInTimezone('Asia/Seoul')
      const utc = getNowInTimezone('UTC')

      expect(seoul.year).toBeGreaterThanOrEqual(2024)
      expect(utc.year).toBeGreaterThanOrEqual(2024)
    })

    it('should handle Pacific timezones', () => {
      const result = getNowInTimezone('Pacific/Auckland')
      expect(result.year).toBeGreaterThanOrEqual(2024)
      expect(result.month).toBeGreaterThanOrEqual(1)
      expect(result.month).toBeLessThanOrEqual(12)
    })
  })

  describe('getDateComponentsInTimezone (주입식 인스턴트 분해)', () => {
    it('주어진 인스턴트를 tz 별로 다른 연/월/일로 분해 (연말 경계)', () => {
      // 2025-12-31 20:00 UTC = KST 로는 2026-01-01. 서버 시계가 아니라 넘긴
      // Date 를 tz 로 분해해야 결정론 경로가 서버 TZ 에 안 흔들린다.
      const at = new Date('2025-12-31T20:00:00.000Z')
      const utc = getDateComponentsInTimezone(at, 'UTC')
      const kst = getDateComponentsInTimezone(at, 'Asia/Seoul')
      expect(utc.year).toBe(2025)
      expect(utc.month).toBe(12)
      expect(utc.day).toBe(31)
      expect(kst.year).toBe(2026)
      expect(kst.month).toBe(1)
      expect(kst.day).toBe(1)
    })
  })

  describe('getWeekdayInTimezone', () => {
    it('주입 인스턴트의 요일을 tz 기준으로 (0=일 … 6=토)', () => {
      // 2024-06-21 은 금요일(5). 09:00Z 는 KST/UTC 모두 같은 날.
      const at = new Date('2024-06-21T09:00:00.000Z')
      expect(getWeekdayInTimezone(at, 'UTC')).toBe(5)
      expect(getWeekdayInTimezone(at, 'Asia/Seoul')).toBe(5)
    })

    it('자정 경계에서 tz 별로 요일이 갈린다', () => {
      // 2024-06-21 20:00 UTC(금) = KST 2024-06-22 05:00(토).
      const at = new Date('2024-06-21T20:00:00.000Z')
      expect(getWeekdayInTimezone(at, 'UTC')).toBe(5) // Fri
      expect(getWeekdayInTimezone(at, 'Asia/Seoul')).toBe(6) // Sat
    })
  })
})
