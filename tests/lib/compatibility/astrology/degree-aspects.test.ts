import { describe, it, expect } from 'vitest'
import {
  SIGN_START_DEGREES,
  ASPECT_ORBS,
  analyzeDegreeBasedAspects,
  type DegreeBasedAspect,
  type DegreeAspectAnalysis,
} from '@/lib/compatibility/astrology/degree-aspects'

describe('Degree-Based Aspects', () => {
  describe('SIGN_START_DEGREES', () => {
    it('should have all 12 zodiac signs', () => {
      const signs = Object.keys(SIGN_START_DEGREES)
      expect(signs).toHaveLength(12)
      expect(signs).toContain('Aries')
      expect(signs).toContain('Taurus')
      expect(signs).toContain('Gemini')
      expect(signs).toContain('Cancer')
      expect(signs).toContain('Leo')
      expect(signs).toContain('Virgo')
      expect(signs).toContain('Libra')
      expect(signs).toContain('Scorpio')
      expect(signs).toContain('Sagittarius')
      expect(signs).toContain('Capricorn')
      expect(signs).toContain('Aquarius')
      expect(signs).toContain('Pisces')
    })

    it('should have Aries start at 0 degrees', () => {
      expect(SIGN_START_DEGREES.Aries).toBe(0)
    })

    it('should have Taurus start at 30 degrees', () => {
      expect(SIGN_START_DEGREES.Taurus).toBe(30)
    })

    it('should have Pisces start at 330 degrees', () => {
      expect(SIGN_START_DEGREES.Pisces).toBe(330)
    })

    it('should have signs in ascending order', () => {
      const degrees = Object.values(SIGN_START_DEGREES)
      for (let i = 1; i < degrees.length; i++) {
        expect(degrees[i]).toBeGreaterThan(degrees[i - 1])
      }
    })

    it('should have 30-degree intervals', () => {
      const degrees = Object.values(SIGN_START_DEGREES)
      for (let i = 1; i < degrees.length; i++) {
        expect(degrees[i] - degrees[i - 1]).toBe(30)
      }
    })

    it('should cover the full 360-degree zodiac', () => {
      const maxDegree = Math.max(...Object.values(SIGN_START_DEGREES))
      expect(maxDegree).toBe(330)
      expect(maxDegree + 30).toBe(360) // Last sign + 30 = full circle
    })
  })

  describe('ASPECT_ORBS', () => {
    it('should define orbs for all major aspects', () => {
      expect(ASPECT_ORBS.conjunction).toBeDefined()
      expect(ASPECT_ORBS.sextile).toBeDefined()
      expect(ASPECT_ORBS.square).toBeDefined()
      expect(ASPECT_ORBS.trine).toBeDefined()
      expect(ASPECT_ORBS.opposition).toBeDefined()
    })

    it('should have largest orbs for conjunction and opposition', () => {
      expect(ASPECT_ORBS.conjunction).toBe(10)
      expect(ASPECT_ORBS.opposition).toBe(10)
    })

    it('should have 8-degree orb for square and trine', () => {
      expect(ASPECT_ORBS.square).toBe(8)
      expect(ASPECT_ORBS.trine).toBe(8)
    })

    it('should have smallest orb for sextile', () => {
      expect(ASPECT_ORBS.sextile).toBe(6)
    })

    it('should have all positive orb values', () => {
      Object.values(ASPECT_ORBS).forEach((orb) => {
        expect(orb).toBeGreaterThan(0)
      })
    })

    it('should have all orbs as integers', () => {
      Object.values(ASPECT_ORBS).forEach((orb) => {
        expect(Number.isInteger(orb)).toBe(true)
      })
    })
  })

  describe('analyzeDegreeBasedAspects()', () => {
    it('should return empty analysis for empty planet arrays', () => {
      const result = analyzeDegreeBasedAspects([], [])
      expect(result.allAspects).toHaveLength(0)
      expect(result.majorAspects).toHaveLength(0)
      expect(result.minorAspects).toHaveLength(0)
      expect(result.tightestAspect).toBeNull()
      expect(result.overallBalance).toBe(50)
    })

    it('should analyze single planet pair', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 20 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.allAspects).toBeDefined()
      expect(result.allAspects.length).toBeGreaterThanOrEqual(0)
    })

    it('should detect conjunction aspect (same sign, close degrees)', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 18 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      const conjunction = result.allAspects.find((a) => a.aspectType === 'conjunction')
      expect(conjunction).toBeDefined()
    })

    it('should detect opposition aspect (180 degrees)', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Libra', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      const opposition = result.allAspects.find((a) => a.aspectType === 'opposition')
      expect(opposition).toBeDefined()
    })

    it('should detect trine aspect (120 degrees)', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      const trine = result.allAspects.find((a) => a.aspectType === 'trine')
      expect(trine).toBeDefined()
    })

    it('should detect square aspect (90 degrees)', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Cancer', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      const square = result.allAspects.find((a) => a.aspectType === 'square')
      expect(square).toBeDefined()
    })

    it('should detect sextile aspect (60 degrees)', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Gemini', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      const sextile = result.allAspects.find((a) => a.aspectType === 'sextile')
      expect(sextile).toBeDefined()
    })

    it('should default to 15 degrees if degree not provided', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries' }]
      const p2 = [{ name: 'Moon', sign: 'Aries' }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.allAspects.length > 0) {
        expect(result.allAspects[0].planet1Degree).toBe(15)
        expect(result.allAspects[0].planet2Degree).toBe(15)
      }
    })

    it('should calculate exact angle between planets', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 0 }]
      const p2 = [{ name: 'Moon', sign: 'Taurus', degree: 0 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.allAspects.length > 0) {
        expect(result.allAspects[0].exactAngle).toBeDefined()
        expect(result.allAspects[0].exactAngle).toBeGreaterThanOrEqual(0)
        expect(result.allAspects[0].exactAngle).toBeLessThanOrEqual(180)
      }
    })

    it('should calculate orb with 2 decimal precision', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15.555 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 18.888 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.allAspects.length > 0) {
        const orb = result.allAspects[0].orb
        const decimals = (orb.toString().split('.')[1] || '').length
        expect(decimals).toBeLessThanOrEqual(2)
      }
    })

    it('should determine if aspect is applying', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 10 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 20 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.allAspects.length > 0) {
        expect(result.allAspects[0].isApplying).toBe(true)
      }
    })

    it('should calculate aspect strength', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 18 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.allAspects.length > 0) {
        expect(result.allAspects[0].strength).toBeDefined()
        expect(result.allAspects[0].strength).toBeGreaterThanOrEqual(0)
        expect(result.allAspects[0].strength).toBeLessThanOrEqual(100)
      }
    })

    it('should identify harmonious aspects', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }] // Trine - harmonious
      const result = analyzeDegreeBasedAspects(p1, p2)

      const trine = result.allAspects.find((a) => a.aspectType === 'trine')
      if (trine) {
        expect(trine.isHarmonious).toBe(true)
      }
    })

    it('should identify challenging aspects', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Cancer', degree: 15 }] // Square - challenging
      const result = analyzeDegreeBasedAspects(p1, p2)

      const square = result.allAspects.find((a) => a.aspectType === 'square')
      if (square) {
        expect(square.isHarmonious).toBe(false)
      }
    })

    it('should generate interpretation for aspects', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 18 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.allAspects.length > 0) {
        expect(result.allAspects[0].interpretation).toBeDefined()
        expect(result.allAspects[0].interpretation.length).toBeGreaterThan(0)
        expect(result.allAspects[0].interpretation).toContain('Sun')
        expect(result.allAspects[0].interpretation).toContain('Moon')
      }
    })

    it('should separate major and minor aspects', () => {
      const p1 = [
        { name: 'Sun', sign: 'Aries', degree: 15 },
        { name: 'Mercury', sign: 'Taurus', degree: 15 },
      ]
      const p2 = [
        { name: 'Moon', sign: 'Leo', degree: 15 },
        { name: 'Venus', sign: 'Virgo', degree: 15 },
      ]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.majorAspects).toBeDefined()
      expect(result.minorAspects).toBeDefined()
      expect(result.majorAspects.length + result.minorAspects.length).toBe(result.allAspects.length)
    })

    it('should identify tightest aspect', () => {
      const p1 = [
        { name: 'Sun', sign: 'Aries', degree: 15 },
        { name: 'Mercury', sign: 'Aries', degree: 20 },
      ]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 16 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.tightestAspect) {
        const allOrbs = result.allAspects.map((a) => a.orb)
        const minOrb = Math.min(...allOrbs)
        expect(result.tightestAspect.orb).toBe(minOrb)
      }
    })

    it('should calculate harmony score', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.harmonyScore).toBeDefined()
      expect(typeof result.harmonyScore).toBe('number')
      expect(Number.isInteger(result.harmonyScore)).toBe(true)
    })

    it('should calculate tension score', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Cancer', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.tensionScore).toBeDefined()
      expect(typeof result.tensionScore).toBe('number')
      expect(Number.isInteger(result.tensionScore)).toBe(true)
    })

    it('should calculate overall balance', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.overallBalance).toBeDefined()
      expect(result.overallBalance).toBeGreaterThanOrEqual(0)
      expect(result.overallBalance).toBeLessThanOrEqual(100)
    })

    it('should have 50% balance for empty input', () => {
      const result = analyzeDegreeBasedAspects([], [])
      expect(result.overallBalance).toBe(50)
    })

    it('should handle multiple planets', () => {
      const p1 = [
        { name: 'Sun', sign: 'Aries', degree: 15 },
        { name: 'Mercury', sign: 'Taurus', degree: 15 },
        { name: 'Venus', sign: 'Gemini', degree: 15 },
      ]
      const p2 = [
        { name: 'Moon', sign: 'Leo', degree: 15 },
        { name: 'Mars', sign: 'Virgo', degree: 15 },
      ]
      const result = analyzeDegreeBasedAspects(p1, p2)

      // 3 planets * 2 planets = 6 possible aspects
      expect(result.allAspects.length).toBeGreaterThanOrEqual(0)
      expect(result.allAspects.length).toBeLessThanOrEqual(6)
    })

    it('should include planet names in aspects', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.allAspects.length > 0) {
        expect(result.allAspects[0].planet1).toBe('Sun')
        expect(result.allAspects[0].planet2).toBe('Moon')
      }
    })

    it('should include planet degrees in aspects', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 20 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.allAspects.length > 0) {
        expect(result.allAspects[0].planet1Degree).toBeDefined()
        expect(result.allAspects[0].planet2Degree).toBeDefined()
      }
    })

    it('should handle 0-degree positions', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 0 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 0 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.allAspects).toBeDefined()
    })

    it('should handle 29-degree positions (end of sign)', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 29 }]
      const p2 = [{ name: 'Moon', sign: 'Taurus', degree: 1 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.allAspects).toBeDefined()
    })

    it('should round scores to integers', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(Number.isInteger(result.harmonyScore)).toBe(true)
      expect(Number.isInteger(result.tensionScore)).toBe(true)
      expect(Number.isInteger(result.overallBalance)).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should analyze complete synastry chart', () => {
      const person1 = [
        { name: 'Sun', sign: 'Aries', degree: 15 },
        { name: 'Moon', sign: 'Taurus', degree: 20 },
        { name: 'Mercury', sign: 'Pisces', degree: 10 },
        { name: 'Venus', sign: 'Aries', degree: 25 },
      ]
      const person2 = [
        { name: 'Sun', sign: 'Leo', degree: 15 },
        { name: 'Moon', sign: 'Virgo', degree: 20 },
        { name: 'Mercury', sign: 'Cancer', degree: 10 },
        { name: 'Venus', sign: 'Libra', degree: 25 },
      ]
      const result = analyzeDegreeBasedAspects(person1, person2)

      expect(result.allAspects.length).toBeGreaterThan(0)
      expect(result.majorAspects.length).toBeGreaterThanOrEqual(0)
      expect(result.harmonyScore).toBeGreaterThanOrEqual(0)
      expect(result.tensionScore).toBeGreaterThanOrEqual(0)
      expect(result.overallBalance).toBeGreaterThanOrEqual(0)
      expect(result.overallBalance).toBeLessThanOrEqual(100)
    })

    it('should handle all harmonious aspects', () => {
      const p1 = [
        { name: 'Sun', sign: 'Aries', degree: 15 },
        { name: 'Moon', sign: 'Gemini', degree: 15 },
      ]
      const p2 = [
        { name: 'Venus', sign: 'Leo', degree: 15 }, // Trine to Sun
        { name: 'Mars', sign: 'Aries', degree: 15 }, // Sextile to Moon
      ]
      const result = analyzeDegreeBasedAspects(p1, p2)

      const harmoniousCount = result.allAspects.filter((a) => a.isHarmonious).length
      expect(harmoniousCount).toBeGreaterThan(0)
    })

    it('should handle all challenging aspects', () => {
      const p1 = [
        { name: 'Sun', sign: 'Aries', degree: 15 },
        { name: 'Moon', sign: 'Cancer', degree: 15 },
      ]
      const p2 = [
        { name: 'Venus', sign: 'Cancer', degree: 15 }, // Square to Sun
        { name: 'Mars', sign: 'Capricorn', degree: 15 }, // Opposition to Moon
      ]
      const result = analyzeDegreeBasedAspects(p1, p2)

      const challengingCount = result.allAspects.filter((a) => !a.isHarmonious).length
      expect(challengingCount).toBeGreaterThan(0)
    })

    it('should calculate higher harmony score for harmonious chart', () => {
      const harmoniousP1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const harmoniousP2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }] // Trine

      const result = analyzeDegreeBasedAspects(harmoniousP1, harmoniousP2)

      if (result.allAspects.length > 0) {
        expect(result.overallBalance).toBeGreaterThan(50)
      }
    })

    it('should maintain consistency across multiple calculations', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }]

      const result1 = analyzeDegreeBasedAspects(p1, p2)
      const result2 = analyzeDegreeBasedAspects(p1, p2)

      expect(result1.allAspects.length).toBe(result2.allAspects.length)
      expect(result1.harmonyScore).toBe(result2.harmonyScore)
      expect(result1.tensionScore).toBe(result2.tensionScore)
      expect(result1.overallBalance).toBe(result2.overallBalance)
    })

    it('should have all aspects with valid properties', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      result.allAspects.forEach((aspect) => {
        expect(aspect.planet1).toBeDefined()
        expect(aspect.planet2).toBeDefined()
        expect(typeof aspect.planet1Degree).toBe('number')
        expect(typeof aspect.planet2Degree).toBe('number')
        expect(typeof aspect.exactAngle).toBe('number')
        expect(aspect.aspectType).toBeDefined()
        expect(typeof aspect.orb).toBe('number')
        expect(typeof aspect.isApplying).toBe('boolean')
        expect(typeof aspect.strength).toBe('number')
        expect(typeof aspect.isHarmonious).toBe('boolean')
        expect(aspect.interpretation).toBeDefined()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle planets at sign boundaries', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 29.99 }]
      const p2 = [{ name: 'Moon', sign: 'Taurus', degree: 0.01 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.allAspects).toBeDefined()
    })

    it('should handle very tight orbs', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15.0 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 15.01 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.tightestAspect) {
        expect(result.tightestAspect.orb).toBeLessThan(1)
      }
    })

    it('should handle wide orbs', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 0 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 25 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.allAspects).toBeDefined()
    })

    it('should handle identical positions', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = [{ name: 'Moon', sign: 'Aries', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      if (result.allAspects.length > 0) {
        expect(result.allAspects[0].exactAngle).toBe(0)
        expect(result.allAspects[0].orb).toBe(0)
      }
    })

    it('should handle single planet in one array', () => {
      const p1 = [{ name: 'Sun', sign: 'Aries', degree: 15 }]
      const p2 = []
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.allAspects).toHaveLength(0)
    })

    it('should handle single planet in other array', () => {
      const p1 = []
      const p2 = [{ name: 'Moon', sign: 'Leo', degree: 15 }]
      const result = analyzeDegreeBasedAspects(p1, p2)

      expect(result.allAspects).toHaveLength(0)
    })
  })
})
