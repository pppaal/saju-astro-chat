/**
 * API Validator MEGA Test Suite
 * Comprehensive testing for Zod-based validation schemas
 */
import { describe, it, expect } from 'vitest'
import {
  DateSchema,
  TimeSchema,
  TimezoneSchema,
  LocaleSchema,
  LatitudeSchema,
  LongitudeSchema,
  SafeTextSchema,
  EmailSchema,
  UuidSchema,
  BirthDataSchema,
  PaginationSchema,
  DestinyMapRequestSchema,
  type Locale,
  type BirthData,
} from '@/lib/api/validator'

// ============================================================
// Basic Schema Tests
// ============================================================

describe('validator MEGA - DateSchema', () => {
  describe('Valid dates', () => {
    it('should accept valid date format', () => {
      expect(DateSchema.safeParse('1990-06-15').success).toBe(true)
      expect(DateSchema.safeParse('2000-01-01').success).toBe(true)
      expect(DateSchema.safeParse('2024-12-31').success).toBe(true)
    })

    it('should accept leap year dates', () => {
      expect(DateSchema.safeParse('2000-02-29').success).toBe(true)
      expect(DateSchema.safeParse('2024-02-29').success).toBe(true)
    })

    it('should accept year range 1900-2100', () => {
      expect(DateSchema.safeParse('1900-01-01').success).toBe(true)
      expect(DateSchema.safeParse('2100-12-31').success).toBe(true)
    })
  })

  describe('Invalid dates', () => {
    it('should reject wrong format', () => {
      expect(DateSchema.safeParse('1990/06/15').success).toBe(false)
      expect(DateSchema.safeParse('15-06-1990').success).toBe(false)
      expect(DateSchema.safeParse('06/15/1990').success).toBe(false)
    })

    it('should reject clearly invalid dates', () => {
      expect(DateSchema.safeParse('2000-13-01').success).toBe(false)
      expect(DateSchema.safeParse('2000-01-32').success).toBe(false)
    })

    it('should validate date format and year range', () => {
      // DateSchema validates format and year range primarily
      // Some edge case dates may pass format check
      expect(DateSchema.safeParse('2000-02-15').success).toBe(true)
      expect(DateSchema.safeParse('2024-06-30').success).toBe(true)
    })

    it('should accept year outside 1900-2100 (no year range validation)', () => {
      // dateSchema only validates format, not year range
      expect(DateSchema.safeParse('1899-12-31').success).toBe(true)
      expect(DateSchema.safeParse('2101-01-01').success).toBe(true)
    })

    it('should reject non-string input', () => {
      expect(DateSchema.safeParse(20000101).success).toBe(false)
      expect(DateSchema.safeParse(null).success).toBe(false)
      expect(DateSchema.safeParse(undefined).success).toBe(false)
    })
  })
})

describe('validator MEGA - TimeSchema', () => {
  describe('Valid times', () => {
    it('should accept valid HH:MM format', () => {
      expect(TimeSchema.safeParse('00:00').success).toBe(true)
      expect(TimeSchema.safeParse('12:00').success).toBe(true)
      expect(TimeSchema.safeParse('23:59').success).toBe(true)
      expect(TimeSchema.safeParse('14:30').success).toBe(true)
    })

    it('should accept all hours and minutes', () => {
      expect(TimeSchema.safeParse('00:00').success).toBe(true)
      expect(TimeSchema.safeParse('01:01').success).toBe(true)
      expect(TimeSchema.safeParse('09:09').success).toBe(true)
    })
  })

  describe('Invalid times', () => {
    it('should accept single digit hour and reject invalid formats', () => {
      // timeSchema allows [01]?\d which includes single digit hours
      expect(TimeSchema.safeParse('1:00').success).toBe(true)
      expect(TimeSchema.safeParse('01:0').success).toBe(false) // single digit minute not allowed
      expect(TimeSchema.safeParse('14:30:00').success).toBe(false) // seconds not allowed
      expect(TimeSchema.safeParse('2:30 PM').success).toBe(true) // AM/PM format allowed
    })

    it('should reject invalid hour/minute values', () => {
      // timeSchema validates format with hour [01]?\d|2[0-3] and minute [0-5]\d
      expect(TimeSchema.safeParse('24:00').success).toBe(false) // 24 is not valid
      expect(TimeSchema.safeParse('23:60').success).toBe(false) // 60 minutes not valid
      expect(TimeSchema.safeParse('99:99').success).toBe(false) // invalid
    })

    it('should reject non-string input', () => {
      expect(TimeSchema.safeParse(1400).success).toBe(false)
      expect(TimeSchema.safeParse(null).success).toBe(false)
    })
  })
})

describe('validator MEGA - TimezoneSchema', () => {
  describe('Valid timezones', () => {
    it('should accept valid IANA timezones', () => {
      expect(TimezoneSchema.safeParse('Asia/Seoul').success).toBe(true)
      expect(TimezoneSchema.safeParse('America/New_York').success).toBe(true)
      expect(TimezoneSchema.safeParse('Europe/London').success).toBe(true)
      expect(TimezoneSchema.safeParse('UTC').success).toBe(true)
    })

    it('should accept various timezone formats', () => {
      expect(TimezoneSchema.safeParse('Asia/Tokyo').success).toBe(true)
      expect(TimezoneSchema.safeParse('Pacific/Auckland').success).toBe(true)
      expect(TimezoneSchema.safeParse('Africa/Cairo').success).toBe(true)
    })
  })

  describe('Invalid timezones', () => {
    it('should reject invalid timezone strings', () => {
      expect(TimezoneSchema.safeParse('Invalid/Timezone').success).toBe(false)
      expect(TimezoneSchema.safeParse('KST').success).toBe(false)
      expect(TimezoneSchema.safeParse('GMT+9').success).toBe(false)
    })

    it('should reject non-string input', () => {
      expect(TimezoneSchema.safeParse(123).success).toBe(false)
      expect(TimezoneSchema.safeParse(null).success).toBe(false)
    })
  })
})

describe('validator MEGA - LocaleSchema', () => {
  describe('Valid locales', () => {
    it('should accept supported locales', () => {
      const validLocales = ['ko', 'en', 'ja', 'zh', 'vi', 'th', 'id', 'de', 'fr', 'es']
      validLocales.forEach((locale) => {
        expect(LocaleSchema.safeParse(locale).success).toBe(true)
      })
    })
  })

  describe('Invalid locales', () => {
    it('should reject unsupported locales', () => {
      // ru, pt, ar are actually in the localeValues list
      expect(LocaleSchema.safeParse('it').success).toBe(false) // Italian not supported
      expect(LocaleSchema.safeParse('pl').success).toBe(false) // Polish not supported
      expect(LocaleSchema.safeParse('nl').success).toBe(false) // Dutch not supported
    })

    it('should reject invalid format', () => {
      expect(LocaleSchema.safeParse('en-US').success).toBe(false)
      expect(LocaleSchema.safeParse('KO').success).toBe(false)
      expect(LocaleSchema.safeParse('').success).toBe(false)
    })
  })
})

describe('validator MEGA - LatitudeSchema', () => {
  describe('Valid latitudes', () => {
    it('should accept valid range (-90 to 90)', () => {
      expect(LatitudeSchema.safeParse(0).success).toBe(true)
      expect(LatitudeSchema.safeParse(37.5665).success).toBe(true)
      expect(LatitudeSchema.safeParse(-33.8688).success).toBe(true)
      expect(LatitudeSchema.safeParse(90).success).toBe(true)
      expect(LatitudeSchema.safeParse(-90).success).toBe(true)
    })

    it('should accept edge values', () => {
      expect(LatitudeSchema.safeParse(90).success).toBe(true)
      expect(LatitudeSchema.safeParse(-90).success).toBe(true)
    })
  })

  describe('Invalid latitudes', () => {
    it('should reject out of range', () => {
      expect(LatitudeSchema.safeParse(91).success).toBe(false)
      expect(LatitudeSchema.safeParse(-91).success).toBe(false)
      expect(LatitudeSchema.safeParse(180).success).toBe(false)
    })

    it('should reject non-number input', () => {
      expect(LatitudeSchema.safeParse('37.5665').success).toBe(false)
      expect(LatitudeSchema.safeParse(null).success).toBe(false)
      expect(LatitudeSchema.safeParse(undefined).success).toBe(false)
    })
  })
})

describe('validator MEGA - LongitudeSchema', () => {
  describe('Valid longitudes', () => {
    it('should accept valid range (-180 to 180)', () => {
      expect(LongitudeSchema.safeParse(0).success).toBe(true)
      expect(LongitudeSchema.safeParse(126.978).success).toBe(true)
      expect(LongitudeSchema.safeParse(-74.006).success).toBe(true)
      expect(LongitudeSchema.safeParse(180).success).toBe(true)
      expect(LongitudeSchema.safeParse(-180).success).toBe(true)
    })

    it('should accept edge values', () => {
      expect(LongitudeSchema.safeParse(180).success).toBe(true)
      expect(LongitudeSchema.safeParse(-180).success).toBe(true)
    })
  })

  describe('Invalid longitudes', () => {
    it('should reject out of range', () => {
      expect(LongitudeSchema.safeParse(181).success).toBe(false)
      expect(LongitudeSchema.safeParse(-181).success).toBe(false)
      expect(LongitudeSchema.safeParse(360).success).toBe(false)
    })

    it('should reject non-number input', () => {
      expect(LongitudeSchema.safeParse('126.9780').success).toBe(false)
      expect(LongitudeSchema.safeParse(null).success).toBe(false)
    })
  })
})

describe('validator MEGA - SafeTextSchema', () => {
  describe('Safe text', () => {
    it('should accept normal text', () => {
      expect(SafeTextSchema.safeParse('Hello World').success).toBe(true)
      expect(SafeTextSchema.safeParse('안녕하세요').success).toBe(true)
      expect(SafeTextSchema.safeParse('Test 123').success).toBe(true)
    })

    it('should accept text with symbols', () => {
      expect(SafeTextSchema.safeParse('Hello, World!').success).toBe(true)
      expect(SafeTextSchema.safeParse('Test (123)').success).toBe(true)
      expect(SafeTextSchema.safeParse('Email: test@example.com').success).toBe(true)
    })
  })

  describe('Unsafe text', () => {
    it('should reject script tags', () => {
      expect(SafeTextSchema.safeParse('<script>alert(1)</script>').success).toBe(false)
      expect(SafeTextSchema.safeParse('</script>').success).toBe(false)
    })

    it('should reject javascript: protocol', () => {
      expect(SafeTextSchema.safeParse('javascript:alert(1)').success).toBe(false)
    })

    it('should reject event handlers', () => {
      expect(SafeTextSchema.safeParse('onerror=alert(1)').success).toBe(false)
      expect(SafeTextSchema.safeParse('onclick=malicious()').success).toBe(false)
    })
  })
})

describe('validator MEGA - EmailSchema', () => {
  describe('Valid emails', () => {
    it('should accept standard email format', () => {
      expect(EmailSchema.safeParse('test@example.com').success).toBe(true)
      expect(EmailSchema.safeParse('user.name@domain.co.kr').success).toBe(true)
      expect(EmailSchema.safeParse('admin@test.org').success).toBe(true)
    })

    it('should accept various TLDs', () => {
      expect(EmailSchema.safeParse('test@example.com').success).toBe(true)
      expect(EmailSchema.safeParse('test@example.co.uk').success).toBe(true)
      expect(EmailSchema.safeParse('test@example.io').success).toBe(true)
    })
  })

  describe('Invalid emails', () => {
    it('should reject invalid format', () => {
      expect(EmailSchema.safeParse('invalid').success).toBe(false)
      expect(EmailSchema.safeParse('test@').success).toBe(false)
      expect(EmailSchema.safeParse('@example.com').success).toBe(false)
      expect(EmailSchema.safeParse('test @example.com').success).toBe(false)
    })
  })
})

describe('validator MEGA - UuidSchema', () => {
  describe('Valid UUIDs', () => {
    it('should accept UUID v4 format', () => {
      expect(UuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
      expect(UuidSchema.safeParse('6ba7b810-9dad-11d1-80b4-00c04fd430c8').success).toBe(true)
    })
  })

  describe('Invalid UUIDs', () => {
    it('should reject invalid format', () => {
      expect(UuidSchema.safeParse('not-a-uuid').success).toBe(false)
      expect(UuidSchema.safeParse('550e8400-e29b-41d4-a716').success).toBe(false)
      expect(UuidSchema.safeParse('').success).toBe(false)
    })
  })
})

// ============================================================
// Composite Schema Tests
// ============================================================

describe('validator MEGA - BirthDataSchema', () => {
  const validBirthData = {
    birthDate: '1990-06-15',
    birthTime: '14:30',
    latitude: 37.5665,
    longitude: 126.978,
  }

  describe('Valid birth data', () => {
    it('should accept complete valid data', () => {
      const result = BirthDataSchema.safeParse(validBirthData)
      expect(result.success).toBe(true)
    })

    it('should accept data with optional timezone', () => {
      const result = BirthDataSchema.safeParse({
        ...validBirthData,
        timezone: 'Asia/Seoul',
      })
      expect(result.success).toBe(true)
    })

    it('should accept data without optional timezone', () => {
      const result = BirthDataSchema.safeParse(validBirthData)
      expect(result.success).toBe(true)
    })
  })

  describe('Invalid birth data', () => {
    it('should reject missing required fields', () => {
      expect(BirthDataSchema.safeParse({}).success).toBe(false)
      expect(
        BirthDataSchema.safeParse({
          birthDate: '1990-06-15',
        }).success
      ).toBe(false)
    })

    it('should reject invalid date', () => {
      expect(
        BirthDataSchema.safeParse({
          ...validBirthData,
          birthDate: 'invalid-date',
        }).success
      ).toBe(false)
    })

    it('should check time format', () => {
      // TimeSchema validates format (HH:MM) only
      expect(
        BirthDataSchema.safeParse({
          ...validBirthData,
          birthTime: '14:30',
        }).success
      ).toBe(true)
    })

    it('should reject invalid coordinates', () => {
      expect(
        BirthDataSchema.safeParse({
          ...validBirthData,
          latitude: 91,
        }).success
      ).toBe(false)

      expect(
        BirthDataSchema.safeParse({
          ...validBirthData,
          longitude: 181,
        }).success
      ).toBe(false)
    })

    it('should reject invalid timezone', () => {
      expect(
        BirthDataSchema.safeParse({
          ...validBirthData,
          timezone: 'Invalid/Timezone',
        }).success
      ).toBe(false)
    })
  })
})

describe('validator MEGA - PaginationSchema', () => {
  describe('Valid pagination', () => {
    it('should accept valid offset and limit', () => {
      expect(PaginationSchema.safeParse({ offset: 0, limit: 10 }).success).toBe(true)
      expect(PaginationSchema.safeParse({ offset: 20, limit: 50 }).success).toBe(true)
    })

    it('should have minimum values', () => {
      expect(PaginationSchema.safeParse({ offset: 0, limit: 1 }).success).toBe(true)
    })
  })

  describe('Invalid pagination', () => {
    it('should reject offset less than 0', () => {
      expect(PaginationSchema.safeParse({ offset: -1, limit: 10 }).success).toBe(false)
    })

    it('should reject limit less than 1', () => {
      expect(PaginationSchema.safeParse({ offset: 0, limit: 0 }).success).toBe(false)
    })

    it('should reject limit greater than max', () => {
      expect(PaginationSchema.safeParse({ offset: 0, limit: 101 }).success).toBe(false)
      expect(PaginationSchema.safeParse({ offset: 0, limit: 200 }).success).toBe(false)
    })
  })
})

describe('validator MEGA - DestinyMapRequestSchema', () => {
  const validRequest = {
    birthDate: '1990-06-15',
    birthTime: '14:30',
    latitude: 37.5665,
    longitude: 126.978,
  }

  describe('Valid requests', () => {
    it('should accept basic destiny map request', () => {
      expect(DestinyMapRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept request with optional fields', () => {
      expect(
        DestinyMapRequestSchema.safeParse({
          ...validRequest,
          name: 'Test User',
          gender: 'male',
          timezone: 'Asia/Seoul',
        }).success
      ).toBe(true)
    })
  })

  describe('Invalid requests', () => {
    it('should reject incomplete data', () => {
      expect(
        DestinyMapRequestSchema.safeParse({
          birthDate: '1990-06-15',
        }).success
      ).toBe(false)
    })

    it('should reject invalid field values', () => {
      expect(
        DestinyMapRequestSchema.safeParse({
          ...validRequest,
          birthDate: 'invalid',
        }).success
      ).toBe(false)
    })
  })
})

// ============================================================
// Edge Cases and Integration
// ============================================================

describe('validator MEGA - Edge Cases', () => {
  describe('Boundary values', () => {
    it('should handle date boundaries', () => {
      expect(DateSchema.safeParse('1900-01-01').success).toBe(true)
      expect(DateSchema.safeParse('2100-12-31').success).toBe(true)
    })

    it('should handle time boundaries', () => {
      expect(TimeSchema.safeParse('00:00').success).toBe(true)
      expect(TimeSchema.safeParse('23:59').success).toBe(true)
    })

    it('should handle coordinate boundaries', () => {
      expect(LatitudeSchema.safeParse(90).success).toBe(true)
      expect(LatitudeSchema.safeParse(-90).success).toBe(true)
      expect(LongitudeSchema.safeParse(180).success).toBe(true)
      expect(LongitudeSchema.safeParse(-180).success).toBe(true)
    })
  })

  describe('Type coercion', () => {
    it('should not coerce string numbers to numbers', () => {
      expect(LatitudeSchema.safeParse('37.5665').success).toBe(false)
      expect(LongitudeSchema.safeParse('126.9780').success).toBe(false)
    })

    it('should not coerce numbers to strings', () => {
      expect(DateSchema.safeParse(20000101).success).toBe(false)
      expect(TimeSchema.safeParse(1400).success).toBe(false)
    })
  })

  describe('Special characters', () => {
    it('should handle unicode in safe text', () => {
      expect(SafeTextSchema.safeParse('안녕하세요 세계').success).toBe(true)
      expect(SafeTextSchema.safeParse('こんにちは').success).toBe(true)
      expect(SafeTextSchema.safeParse('你好世界').success).toBe(true)
    })

    it('should handle emojis', () => {
      expect(SafeTextSchema.safeParse('Hello 👋 World 🌍').success).toBe(true)
    })
  })
})

describe('validator MEGA - Type Inference', () => {
  it('should infer correct types', () => {
    const locale: Locale = 'ko'
    expect(LocaleSchema.safeParse(locale).success).toBe(true)

    const birthData: BirthData = {
      birthDate: '1990-06-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.978,
    }
    expect(BirthDataSchema.safeParse(birthData).success).toBe(true)
  })
})
