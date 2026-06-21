import { describe, it, expect } from 'vitest'
import {
  AsteroidsRequestSchema,
  SolarReturnRequestSchema,
  LunarReturnRequestSchema,
  MidpointsRequestSchema,
  HarmonicsRequestSchema,
  FixedStarsRequestSchema,
  EclipsesRequestSchema,
  DraconicRequestSchema,
  ProgressionsRequestSchema,
} from '@/lib/api/astrology-validation'

/**
 * Zod schema validation for astrology API routes.
 * Tests valid inputs (defaults applied) and invalid inputs (rejection branches).
 * Only the exported schemas are reachable; internal helpers are not exported.
 */

const validBirth = {
  date: '1990-05-15',
  time: '14:30',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

describe('api/astrology-validation', () => {
  describe('AsteroidsRequestSchema', () => {
    it('accepts valid birth data and defaults includeAspects to true', () => {
      const r = AsteroidsRequestSchema.safeParse(validBirth)
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.includeAspects).toBe(true)
        expect(r.data.latitude).toBe(37.5665)
      }
    })

    it('respects an explicit includeAspects=false', () => {
      const r = AsteroidsRequestSchema.safeParse({ ...validBirth, includeAspects: false })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.includeAspects).toBe(false)
    })

    it('rejects a malformed date', () => {
      const r = AsteroidsRequestSchema.safeParse({ ...validBirth, date: '1990/05/15' })
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.issues.some((i) => i.message.includes('YYYY-MM-DD'))).toBe(true)
      }
    })

    it('rejects a malformed time', () => {
      const r = AsteroidsRequestSchema.safeParse({ ...validBirth, time: '2:30 PM' })
      expect(r.success).toBe(false)
    })

    it('rejects latitude out of range', () => {
      expect(AsteroidsRequestSchema.safeParse({ ...validBirth, latitude: 91 }).success).toBe(false)
      expect(AsteroidsRequestSchema.safeParse({ ...validBirth, latitude: -91 }).success).toBe(false)
    })

    it('rejects longitude out of range', () => {
      expect(AsteroidsRequestSchema.safeParse({ ...validBirth, longitude: 181 }).success).toBe(
        false
      )
      expect(AsteroidsRequestSchema.safeParse({ ...validBirth, longitude: -181 }).success).toBe(
        false
      )
    })

    it('accepts boundary coordinates', () => {
      const r = AsteroidsRequestSchema.safeParse({
        ...validBirth,
        latitude: -90,
        longitude: 180,
      })
      expect(r.success).toBe(true)
    })

    it('rejects an empty timezone', () => {
      const r = AsteroidsRequestSchema.safeParse({ ...validBirth, timeZone: '' })
      expect(r.success).toBe(false)
    })

    it('rejects non-number latitude', () => {
      const r = AsteroidsRequestSchema.safeParse({ ...validBirth, latitude: 'abc' })
      expect(r.success).toBe(false)
    })

    it('rejects a missing required field', () => {
      const { date: _omit, ...noDate } = validBirth
      void _omit
      expect(AsteroidsRequestSchema.safeParse(noDate).success).toBe(false)
    })
  })

  describe('SolarReturnRequestSchema', () => {
    it('accepts valid data with optional year', () => {
      const r = SolarReturnRequestSchema.safeParse({ ...validBirth, year: 2025 })
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.year).toBe(2025)
        expect(r.data.includeAspects).toBe(true) // inherited default
      }
    })

    it('accepts data without year', () => {
      expect(SolarReturnRequestSchema.safeParse(validBirth).success).toBe(true)
    })

    it('rejects a non-integer year', () => {
      expect(SolarReturnRequestSchema.safeParse({ ...validBirth, year: 2025.5 }).success).toBe(
        false
      )
    })
  })

  describe('LunarReturnRequestSchema', () => {
    it('accepts valid data with year and month', () => {
      const r = LunarReturnRequestSchema.safeParse({ ...validBirth, year: 2025, month: 6 })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.month).toBe(6)
    })

    it('rejects month out of range', () => {
      expect(LunarReturnRequestSchema.safeParse({ ...validBirth, month: 0 }).success).toBe(false)
      expect(LunarReturnRequestSchema.safeParse({ ...validBirth, month: 13 }).success).toBe(false)
    })

    it('accepts boundary months 1 and 12', () => {
      expect(LunarReturnRequestSchema.safeParse({ ...validBirth, month: 1 }).success).toBe(true)
      expect(LunarReturnRequestSchema.safeParse({ ...validBirth, month: 12 }).success).toBe(true)
    })
  })

  describe('MidpointsRequestSchema', () => {
    it('defaults orb to 1.5', () => {
      const r = MidpointsRequestSchema.safeParse(validBirth)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.orb).toBe(1.5)
    })

    it('accepts an in-range orb', () => {
      const r = MidpointsRequestSchema.safeParse({ ...validBirth, orb: 3 })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.orb).toBe(3)
    })

    it('rejects an orb above max (5)', () => {
      expect(MidpointsRequestSchema.safeParse({ ...validBirth, orb: 5.1 }).success).toBe(false)
    })

    it('rejects a negative orb', () => {
      expect(MidpointsRequestSchema.safeParse({ ...validBirth, orb: -1 }).success).toBe(false)
    })
  })

  describe('HarmonicsRequestSchema', () => {
    it('defaults fullProfile to false', () => {
      const r = HarmonicsRequestSchema.safeParse(validBirth)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.fullProfile).toBe(false)
    })

    it('accepts valid harmonic and currentAge', () => {
      const r = HarmonicsRequestSchema.safeParse({
        ...validBirth,
        harmonic: 5,
        currentAge: 35,
        fullProfile: true,
      })
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.harmonic).toBe(5)
        expect(r.data.fullProfile).toBe(true)
      }
    })

    it('rejects harmonic out of range', () => {
      expect(HarmonicsRequestSchema.safeParse({ ...validBirth, harmonic: 0 }).success).toBe(false)
      expect(HarmonicsRequestSchema.safeParse({ ...validBirth, harmonic: 145 }).success).toBe(false)
    })

    it('rejects currentAge out of range', () => {
      expect(HarmonicsRequestSchema.safeParse({ ...validBirth, currentAge: -1 }).success).toBe(
        false
      )
      expect(HarmonicsRequestSchema.safeParse({ ...validBirth, currentAge: 151 }).success).toBe(
        false
      )
    })
  })

  describe('FixedStarsRequestSchema', () => {
    it('defaults orb to 1.0', () => {
      const r = FixedStarsRequestSchema.safeParse(validBirth)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.orb).toBe(1.0)
    })

    it('rejects an orb above 5', () => {
      expect(FixedStarsRequestSchema.safeParse({ ...validBirth, orb: 6 }).success).toBe(false)
    })
  })

  describe('EclipsesRequestSchema', () => {
    it('defaults orb to 3.0 and allows up to 10', () => {
      const r = EclipsesRequestSchema.safeParse(validBirth)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.orb).toBe(3.0)
      expect(EclipsesRequestSchema.safeParse({ ...validBirth, orb: 10 }).success).toBe(true)
    })

    it('rejects an orb above 10', () => {
      expect(EclipsesRequestSchema.safeParse({ ...validBirth, orb: 10.5 }).success).toBe(false)
    })
  })

  describe('DraconicRequestSchema', () => {
    it('defaults compareToNatal to true', () => {
      const r = DraconicRequestSchema.safeParse(validBirth)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.compareToNatal).toBe(true)
    })

    it('respects explicit compareToNatal=false', () => {
      const r = DraconicRequestSchema.safeParse({ ...validBirth, compareToNatal: false })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.compareToNatal).toBe(false)
    })
  })

  describe('ProgressionsRequestSchema', () => {
    it('accepts an optional valid targetDate', () => {
      const r = ProgressionsRequestSchema.safeParse({ ...validBirth, targetDate: '2025-01-01' })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.targetDate).toBe('2025-01-01')
    })

    it('accepts data without targetDate', () => {
      expect(ProgressionsRequestSchema.safeParse(validBirth).success).toBe(true)
    })

    it('rejects a malformed targetDate', () => {
      expect(
        ProgressionsRequestSchema.safeParse({ ...validBirth, targetDate: '01-01-2025' }).success
      ).toBe(false)
    })
  })
})
