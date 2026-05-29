// @vitest-environment node
import { describe, it, expect } from 'vitest'
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'
import { __test } from '@/lib/calendar-engine/extractors/astro-progression'

const { findProgressedPlanetAspects, computeProgPolarity, classifyAngle, PROG_INNER_PLANETS } =
  __test

const SIGNS: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

function planet(name: string, longitude: number): PlanetBase {
  const norm = ((longitude % 360) + 360) % 360
  return {
    name,
    longitude: norm,
    sign: SIGNS[Math.floor(norm / 30)],
    degree: Math.floor(norm % 30),
    minute: 0,
    formatted: `${SIGNS[Math.floor(norm / 30)]} ${Math.floor(norm % 30)}deg`,
    house: 1,
    speed: 1,
  }
}

function chart(planets: Record<string, number>, ascLon = 0, mcLon = 90): Chart {
  return {
    planets: Object.entries(planets).map(([n, l]) => planet(n, l)),
    ascendant: planet('Ascendant', ascLon),
    mc: planet('MC', mcLon),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: SIGNS[i],
      formatted: `${i * 30}deg`,
    })),
  }
}

describe('astro-progression extractor — inner planet aspect helpers', () => {
  describe('classifyAngle (orb scaled per planet)', () => {
    it('detects exact conjunction within orb', () => {
      const c = classifyAngle(0.2, 0.5)
      expect(c?.aspect).toBe('conjunction')
      expect(c?.orb).toBeCloseTo(0.2, 4)
    })

    it('rejects conjunction outside Sun orb (0.5°)', () => {
      expect(classifyAngle(0.8, 0.5)).toBeNull()
    })

    it('detects trine within Mercury orb (1.0°)', () => {
      const c = classifyAngle(120.7, 1.0)
      expect(c?.aspect).toBe('trine')
    })

    it('detects opposition within Mars orb (1.0°)', () => {
      const c = classifyAngle(179.4, 1.0)
      expect(c?.aspect).toBe('opposition')
      expect(c?.orb).toBeCloseTo(0.6, 3)
    })

    it('returns null when angle is between major aspects', () => {
      expect(classifyAngle(45, 1.0)).toBeNull()
    })
  })

  describe('findProgressedPlanetAspects', () => {
    it('detects progressed Sun conjunction with natal Sun (orb 0.5°)', () => {
      // 본명 Sun @ 100°, 진행 Sun @ 100.3° → orb 0.3°
      const natal = chart({ Sun: 100, Moon: 250, Mars: 30 })
      const progressed = chart({ Sun: 100.3, Moon: 200, Mars: 50 })

      const hits = findProgressedPlanetAspects(progressed, natal, 'Sun', 0.5)
      const sunHit = hits.find((h) => h.target === 'Sun')
      expect(sunHit).toBeDefined()
      expect(sunHit?.aspect).toBe('conjunction')
      expect(sunHit?.orb).toBeCloseTo(0.3, 3)
    })

    it('does NOT detect progressed Sun conjunction outside 0.5° orb', () => {
      // 본명 Sun @ 100°, 진행 Sun @ 100.9° → orb 0.9° → 0.5° 초과
      const natal = chart({ Sun: 100, Moon: 250 })
      const progressed = chart({ Sun: 100.9 })

      const hits = findProgressedPlanetAspects(progressed, natal, 'Sun', 0.5)
      expect(hits.find((h) => h.target === 'Sun')).toBeUndefined()
    })

    it('detects progressed Venus trine to natal Mars (orb 1.0°)', () => {
      // 본명 Mars @ 0°, 진행 Venus @ 120.5° → trine, orb 0.5°
      const natal = chart({ Mars: 0, Sun: 200 })
      const progressed = chart({ Venus: 120.5 })

      const hits = findProgressedPlanetAspects(progressed, natal, 'Venus', 1.0)
      const marsHit = hits.find((h) => h.target === 'Mars')
      expect(marsHit?.aspect).toBe('trine')
    })

    it('detects progressed Sun conjunction with natal Ascendant', () => {
      // ASC @ 45°, 진행 Sun @ 45.2°
      const natal = chart({ Sun: 200 }, 45, 135)
      const progressed = chart({ Sun: 45.2 })

      const hits = findProgressedPlanetAspects(progressed, natal, 'Sun', 0.5)
      expect(hits.find((h) => h.target === 'Ascendant')?.aspect).toBe('conjunction')
    })

    it('detects progressed Sun conjunction with natal MC', () => {
      const natal = chart({ Sun: 200 }, 45, 135)
      const progressed = chart({ Sun: 134.7 })

      const hits = findProgressedPlanetAspects(progressed, natal, 'Sun', 0.5)
      expect(hits.find((h) => h.target === 'MC')?.aspect).toBe('conjunction')
    })

    it('returns empty array if progressed planet is missing', () => {
      const natal = chart({ Sun: 100 })
      const progressed = chart({ Moon: 100 }) // no Sun

      expect(findProgressedPlanetAspects(progressed, natal, 'Sun', 0.5)).toEqual([])
    })

    it('handles wrap-around (359.8° prog ↔ 0.1° natal = conjunction within 0.5° orb)', () => {
      // 0.1° natal vs 359.8° prog → diff = 0.3°, well inside 0.5° Sun orb
      const natal = chart({ Sun: 0.1 })
      const progressed = chart({ Sun: 359.8 })

      const hits = findProgressedPlanetAspects(progressed, natal, 'Sun', 0.5)
      const sunHit = hits.find((h) => h.target === 'Sun')
      expect(sunHit?.aspect).toBe('conjunction')
      expect(sunHit?.orb).toBeCloseTo(0.3, 3)
    })
  })

  describe('computeProgPolarity', () => {
    it('conjunction with natal benefic (Sun/Jupiter/Venus) → +1', () => {
      expect(computeProgPolarity('conjunction', 'Mars', 'Sun')).toBe(1)
      expect(computeProgPolarity('conjunction', 'Mercury', 'Jupiter')).toBe(1)
      expect(computeProgPolarity('conjunction', 'Sun', 'Venus')).toBe(1)
    })

    it('conjunction with natal malefic (Mars/Saturn) → -1', () => {
      expect(computeProgPolarity('conjunction', 'Venus', 'Mars')).toBe(-1)
      expect(computeProgPolarity('conjunction', 'Sun', 'Saturn')).toBe(-1)
    })

    it('conjunction with neutral natal target (Moon/Mercury/etc) → 0', () => {
      expect(computeProgPolarity('conjunction', 'Sun', 'Moon')).toBe(0)
      expect(computeProgPolarity('conjunction', 'Venus', 'Mercury')).toBe(0)
      expect(computeProgPolarity('conjunction', 'Mars', 'Ascendant')).toBe(0)
    })

    it('trine and sextile → +1 (harmonious)', () => {
      expect(computeProgPolarity('trine', 'Sun', 'Mars')).toBe(1)
      expect(computeProgPolarity('sextile', 'Mercury', 'Saturn')).toBe(1)
    })

    it('square → -1 (tense)', () => {
      expect(computeProgPolarity('square', 'Sun', 'Jupiter')).toBe(-1)
      expect(computeProgPolarity('square', 'Venus', 'Mars')).toBe(-1)
    })

    it('opposition → -1 (대조 결)', () => {
      expect(computeProgPolarity('opposition', 'Sun', 'Moon')).toBe(-1)
      expect(computeProgPolarity('opposition', 'Mars', 'Venus')).toBe(-1)
    })
  })

  describe('PROG_INNER_PLANETS configuration', () => {
    it('Sun has tightest orb and highest weight (가장 천천히, 강한 신호)', () => {
      expect(PROG_INNER_PLANETS.Sun.orb).toBe(0.5)
      expect(PROG_INNER_PLANETS.Sun.weight).toBe(0.8)
    })

    it('Mercury / Venus share orb 1.0 / weight 0.65', () => {
      expect(PROG_INNER_PLANETS.Mercury.orb).toBe(1.0)
      expect(PROG_INNER_PLANETS.Mercury.weight).toBe(0.65)
      expect(PROG_INNER_PLANETS.Venus.orb).toBe(1.0)
      expect(PROG_INNER_PLANETS.Venus.weight).toBe(0.65)
    })

    it('Mars: orb 1.0, weight 0.55', () => {
      expect(PROG_INNER_PLANETS.Mars.orb).toBe(1.0)
      expect(PROG_INNER_PLANETS.Mars.weight).toBe(0.55)
    })

    it('covers all 4 inner planet targets', () => {
      expect(Object.keys(PROG_INNER_PLANETS).sort()).toEqual([
        'Mars',
        'Mercury',
        'Sun',
        'Venus',
      ])
    })
  })
})
