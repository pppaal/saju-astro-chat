import { describe, it, expect } from 'vitest'
import { toAstroPlanetId, toAstroPointId, toAstroHouseId } from '@/lib/astrology/graphIds'

/**
 * graphIds: normalize free-form astrology tokens into canonical graph node ids.
 * toAstroSignId is not exported (internal), so it is exercised only indirectly.
 */

describe('astrology/graphIds', () => {
  describe('toAstroPlanetId', () => {
    it('returns the canonical name for an exact match', () => {
      expect(toAstroPlanetId('Sun')).toBe('Sun')
      expect(toAstroPlanetId('Pluto')).toBe('Pluto')
      expect(toAstroPlanetId('Jupiter')).toBe('Jupiter')
    })

    it('is case-insensitive', () => {
      expect(toAstroPlanetId('sun')).toBe('Sun')
      expect(toAstroPlanetId('MOON')).toBe('Moon')
      expect(toAstroPlanetId('mErCuRy')).toBe('Mercury')
    })

    it('returns null for unknown planets', () => {
      expect(toAstroPlanetId('Earth')).toBeNull()
      expect(toAstroPlanetId('Asc')).toBeNull()
    })

    it('returns null for nullish / empty input', () => {
      expect(toAstroPlanetId(null)).toBeNull()
      expect(toAstroPlanetId(undefined)).toBeNull()
      expect(toAstroPlanetId('')).toBeNull()
    })
  })

  describe('toAstroPointId', () => {
    it('maps canonical aliases', () => {
      expect(toAstroPointId('ASC')).toBe('Asc')
      expect(toAstroPointId('ASCENDANT')).toBe('Asc')
      expect(toAstroPointId('MC')).toBe('MC')
      expect(toAstroPointId('MIDHEAVEN')).toBe('MC')
      expect(toAstroPointId('IC')).toBe('IC')
      expect(toAstroPointId('DESC')).toBe('Desc')
      expect(toAstroPointId('DESCENDANT')).toBe('Desc')
      expect(toAstroPointId('NODE')).toBe('Node')
      expect(toAstroPointId('NORTHNODE')).toBe('NorthNode')
      expect(toAstroPointId('SOUTHNODE')).toBe('SouthNode')
      expect(toAstroPointId('CHIRON')).toBe('Chiron')
      expect(toAstroPointId('VERTEX')).toBe('Vertex')
      expect(toAstroPointId('PARTOFFORTUNE')).toBe('PartOfFortune')
      expect(toAstroPointId('FORTUNE')).toBe('PartOfFortune')
    })

    it('strips non-letters and uppercases before matching', () => {
      expect(toAstroPointId('asc')).toBe('Asc')
      expect(toAstroPointId('North Node')).toBe('NorthNode')
      expect(toAstroPointId('part-of-fortune')).toBe('PartOfFortune')
      expect(toAstroPointId('M.C.')).toBe('MC')
      expect(toAstroPointId('  desc  ')).toBe('Desc')
    })

    it('returns null for unknown points', () => {
      expect(toAstroPointId('Sun')).toBe(null) // not a "point" alias
      expect(toAstroPointId('Unknown')).toBeNull()
      expect(toAstroPointId('12345')).toBeNull() // all stripped -> ''
    })

    it('returns null for nullish / empty input', () => {
      expect(toAstroPointId(null)).toBeNull()
      expect(toAstroPointId(undefined)).toBeNull()
      expect(toAstroPointId('')).toBeNull()
    })
  })

  describe('toAstroHouseId', () => {
    it('accepts numbers 1..12', () => {
      expect(toAstroHouseId(1)).toBe('H1')
      expect(toAstroHouseId(12)).toBe('H12')
      expect(toAstroHouseId(7)).toBe('H7')
    })

    it('truncates fractional numbers', () => {
      expect(toAstroHouseId(7.9)).toBe('H7')
      expect(toAstroHouseId(1.2)).toBe('H1')
    })

    it('returns null for out-of-range numbers', () => {
      expect(toAstroHouseId(0)).toBeNull()
      expect(toAstroHouseId(13)).toBeNull()
      expect(toAstroHouseId(-1)).toBeNull()
    })

    it('returns null for non-finite numbers', () => {
      expect(toAstroHouseId(NaN)).toBeNull()
      expect(toAstroHouseId(Infinity)).toBeNull()
    })

    it('accepts "H<n>" strings as-is', () => {
      expect(toAstroHouseId('H1')).toBe('H1')
      expect(toAstroHouseId('H12')).toBe('H12')
      // Note: no range check on H-prefixed strings in source
      expect(toAstroHouseId('H99')).toBe('H99')
    })

    it('accepts plain numeric strings 1..12', () => {
      expect(toAstroHouseId('1')).toBe('H1')
      expect(toAstroHouseId('12')).toBe('H12')
      expect(toAstroHouseId(' 5 ')).toBe('H5') // trimmed
    })

    it('returns null for out-of-range numeric strings', () => {
      expect(toAstroHouseId('0')).toBeNull()
      expect(toAstroHouseId('13')).toBeNull()
    })

    it('returns null for non-numeric strings', () => {
      expect(toAstroHouseId('abc')).toBeNull()
      expect(toAstroHouseId('Hxx')).toBeNull()
      expect(toAstroHouseId('')).toBeNull()
    })

    it('returns null for nullish input', () => {
      expect(toAstroHouseId(null)).toBeNull()
      expect(toAstroHouseId(undefined)).toBeNull()
    })
  })
})
