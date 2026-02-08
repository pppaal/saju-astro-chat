import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildEngineMeta } from '@/lib/astrology/advanced/meta'
import type { ChartMeta } from '@/lib/astrology/foundation/types'

vi.mock('@/lib/astrology/foundation/ephe', () => ({
  getSwisseph: vi.fn(() => ({
    swe_version: vi.fn(() => '2.10.03'),
  })),
}))

describe('buildEngineMeta', () => {
  const baseMeta: ChartMeta = {
    name: 'Test Chart',
    datetime: '2024-01-15T12:00:00Z',
    location: { lat: 37.5665, lng: 126.978, city: 'Seoul' },
  }

  const defaultOpts = {
    theme: 'western' as const,
    houseSystem: 'Placidus' as const,
    nodeType: 'true' as const,
    includeMinorAspects: false,
    enable: { chiron: false, lilith: false, pof: false },
  }

  describe('Engine Metadata', () => {
    it('should add engine metadata', () => {
      const result = buildEngineMeta(baseMeta, defaultOpts)

      expect(result.engine).toBe('Swiss Ephemeris')
      expect(result.seVersion).toBe('2.10.03')
      expect(result.nodeType).toBe('true')
    })

    it('should always set engine to Swiss Ephemeris', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        theme: 'saju',
      })

      expect(result.engine).toBe('Swiss Ephemeris')
    })

    it('should include Swiss Ephemeris version', () => {
      const result = buildEngineMeta(baseMeta, defaultOpts)

      expect(result.seVersion).toBeDefined()
      expect(typeof result.seVersion).toBe('string')
      expect(result.seVersion.length).toBeGreaterThan(0)
    })
  })

  describe('Meta Field Preservation', () => {
    it('should preserve original meta fields', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        nodeType: 'mean',
      })

      expect(result.name).toBe('Test Chart')
      expect(result.datetime).toBe('2024-01-15T12:00:00Z')
      expect(result.location).toEqual(baseMeta.location)
    })

    it('should preserve complex location data', () => {
      const complexLocation = {
        lat: 40.7128,
        lng: -74.006,
        city: 'New York',
        country: 'USA',
        timezone: 'America/New_York',
      }
      const metaWithComplexLocation = {
        ...baseMeta,
        location: complexLocation,
      }

      const result = buildEngineMeta(metaWithComplexLocation, defaultOpts)

      expect(result.location).toEqual(complexLocation)
    })

    it('should preserve name with special characters', () => {
      const specialMeta = {
        ...baseMeta,
        name: "홍길동's Chart (Test)",
      }

      const result = buildEngineMeta(specialMeta, defaultOpts)

      expect(result.name).toBe("홍길동's Chart (Test)")
    })

    it('should preserve ISO datetime format', () => {
      const isoMeta = {
        ...baseMeta,
        datetime: '2024-06-21T14:30:00+09:00',
      }

      const result = buildEngineMeta(isoMeta, defaultOpts)

      expect(result.datetime).toBe('2024-06-21T14:30:00+09:00')
    })
  })

  describe('Node Type Options', () => {
    it('should use true node type when specified', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        nodeType: 'true',
      })

      expect(result.nodeType).toBe('true')
    })

    it('should use mean node type when specified', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        nodeType: 'mean',
      })

      expect(result.nodeType).toBe('mean')
    })
  })

  describe('Theme Options', () => {
    it('should work with western theme', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        theme: 'western',
      })

      expect(result.engine).toBe('Swiss Ephemeris')
    })

    it('should work with saju theme', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        theme: 'saju',
      })

      expect(result.engine).toBe('Swiss Ephemeris')
    })

    it('should work with vedic theme', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        theme: 'vedic',
      })

      expect(result.engine).toBe('Swiss Ephemeris')
    })
  })

  describe('House System Options', () => {
    it('should work with Placidus house system', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        houseSystem: 'Placidus',
      })

      expect(result).toBeDefined()
    })

    it('should work with WholeSign house system', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        houseSystem: 'WholeSign',
      })

      expect(result).toBeDefined()
    })

    it('should work with Koch house system', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        houseSystem: 'Koch',
      })

      expect(result).toBeDefined()
    })

    it('should work with Equal house system', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        houseSystem: 'Equal',
      })

      expect(result).toBeDefined()
    })
  })

  describe('Enable Options', () => {
    it('should work with chiron enabled', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        enable: { chiron: true, lilith: false, pof: false },
      })

      expect(result).toBeDefined()
    })

    it('should work with lilith enabled', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        enable: { chiron: false, lilith: true, pof: false },
      })

      expect(result).toBeDefined()
    })

    it('should work with pof enabled', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        enable: { chiron: false, lilith: false, pof: true },
      })

      expect(result).toBeDefined()
    })

    it('should work with all optional bodies enabled', () => {
      const result = buildEngineMeta(baseMeta, {
        ...defaultOpts,
        enable: { chiron: true, lilith: true, pof: true },
      })

      expect(result).toBeDefined()
    })
  })

  describe('Return Type Validation', () => {
    it('should return ExtendedMeta type with all required fields', () => {
      const result = buildEngineMeta(baseMeta, defaultOpts)

      // ChartMeta fields
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('datetime')
      expect(result).toHaveProperty('location')

      // EngineMeta fields
      expect(result).toHaveProperty('engine')
      expect(result).toHaveProperty('seVersion')
      expect(result).toHaveProperty('nodeType')
    })

    it('should not add extra unexpected fields', () => {
      const result = buildEngineMeta(baseMeta, defaultOpts)
      const keys = Object.keys(result)

      expect(keys).toContain('name')
      expect(keys).toContain('datetime')
      expect(keys).toContain('location')
      expect(keys).toContain('engine')
      expect(keys).toContain('seVersion')
      expect(keys).toContain('nodeType')
      expect(keys.length).toBe(6)
    })
  })
})
