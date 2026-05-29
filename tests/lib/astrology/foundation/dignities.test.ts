// @vitest-environment node
// tests/lib/astrology/foundation/dignities.test.ts
//
// Coverage for the Hellenistic 5-tier dignity extensions:
//   triplicityOf / termOf / faceOf / dignityTiers / dignityScore
//
// The four-tier `dignityOf` continues to be exercised by adapter / extractor
// tests that consume it indirectly.

import { describe, it, expect } from 'vitest'
import {
  triplicityOf,
  termOf,
  faceOf,
  dignityTiers,
  dignityScore,
  dignityOf,
  TRIPLICITY,
} from '@/lib/astrology/foundation/dignities'

describe('dignities — 5-tier (Hellenistic)', () => {
  // ──────────────────────────────────────────────────────────────────
  // Triplicity
  // ──────────────────────────────────────────────────────────────────
  describe('triplicityOf', () => {
    it('returns "day" for the day ruler of a fire sign at day birth', () => {
      // Fire day ruler = Sun
      expect(triplicityOf('Sun', 'Aries', true)).toBe('day')
      expect(triplicityOf('Sun', 'Leo', true)).toBe('day')
      expect(triplicityOf('Sun', 'Sagittarius', true)).toBe('day')
    })

    it('returns "night" for the night ruler of a fire sign at night birth', () => {
      // Fire night ruler = Jupiter
      expect(triplicityOf('Jupiter', 'Aries', false)).toBe('night')
      expect(triplicityOf('Jupiter', 'Leo', false)).toBe('night')
    })

    it('returns "participating" for the cooperating ruler regardless of sect', () => {
      // Fire participating = Saturn
      expect(triplicityOf('Saturn', 'Aries', true)).toBe('participating')
      expect(triplicityOf('Saturn', 'Leo', false)).toBe('participating')
    })

    it('returns null when the planet is not a triplicity ruler of that sign', () => {
      expect(triplicityOf('Mercury', 'Aries', true)).toBeNull()
      expect(triplicityOf('Moon', 'Leo', false)).toBeNull()
    })

    it('respects sect: same planet flips between day/null in fire', () => {
      // Sun is day ruler of fire. At night chart, Sun is NOT the night ruler.
      expect(triplicityOf('Sun', 'Aries', true)).toBe('day')
      expect(triplicityOf('Sun', 'Aries', false)).toBeNull()
    })

    it('covers all four elements with correct day/night rulers', () => {
      // Earth: Venus day / Moon night / Mars participating
      expect(triplicityOf('Venus', 'Taurus', true)).toBe('day')
      expect(triplicityOf('Moon', 'Virgo', false)).toBe('night')
      expect(triplicityOf('Mars', 'Capricorn', true)).toBe('participating')

      // Air: Saturn day / Mercury night / Jupiter participating
      expect(triplicityOf('Saturn', 'Gemini', true)).toBe('day')
      expect(triplicityOf('Mercury', 'Libra', false)).toBe('night')
      expect(triplicityOf('Jupiter', 'Aquarius', true)).toBe('participating')

      // Water: Venus day / Mars night / Moon participating
      expect(triplicityOf('Venus', 'Cancer', true)).toBe('day')
      expect(triplicityOf('Mars', 'Scorpio', false)).toBe('night')
      expect(triplicityOf('Moon', 'Pisces', true)).toBe('participating')
    })

    it('accepts Korean sign names', () => {
      // 양자리 = Aries (fire), Sun day ruler
      expect(triplicityOf('Sun', '양자리', true)).toBe('day')
      expect(triplicityOf('Venus', '황소자리', true)).toBe('day') // Earth/day = Venus
    })

    it('returns null for unrecognised sign', () => {
      expect(triplicityOf('Sun', 'Nowhere', true)).toBeNull()
    })

    it('exposes the underlying TRIPLICITY table for inspection', () => {
      expect(TRIPLICITY.fire.day).toBe('Sun')
      expect(TRIPLICITY.fire.night).toBe('Jupiter')
      expect(TRIPLICITY.water.night).toBe('Mars')
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // Egyptian Terms (Bounds)
  // ──────────────────────────────────────────────────────────────────
  describe('termOf', () => {
    it('matches Aries 0..6° → Jupiter', () => {
      expect(termOf('Jupiter', 'Aries', 0)).toBe('Jupiter')
      expect(termOf('Jupiter', 'Aries', 5.9)).toBe('Jupiter')
      // Boundary: 6° belongs to Venus (next bound)
      expect(termOf('Jupiter', 'Aries', 6)).toBeNull()
      expect(termOf('Venus', 'Aries', 6)).toBe('Venus')
    })

    it('matches Aries 12..20° → Mercury', () => {
      expect(termOf('Mercury', 'Aries', 12)).toBe('Mercury')
      expect(termOf('Mercury', 'Aries', 19.99)).toBe('Mercury')
      expect(termOf('Mercury', 'Aries', 20)).toBeNull()
      expect(termOf('Mars', 'Aries', 20)).toBe('Mars')
    })

    it('matches Aries final bound 25..30° → Saturn', () => {
      expect(termOf('Saturn', 'Aries', 25)).toBe('Saturn')
      expect(termOf('Saturn', 'Aries', 29.999)).toBe('Saturn')
    })

    it('returns null when planet is not the bound ruler', () => {
      // Aries 0..6 is Jupiter — Mars does not own this arc
      expect(termOf('Mars', 'Aries', 3)).toBeNull()
    })

    it('handles all 12 signs without throwing', () => {
      const signs = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
      ]
      for (const s of signs) {
        // every degree returns either a ruler-match or null cleanly
        for (let d = 0; d < 30; d += 1) {
          expect(() => termOf('Jupiter', s, d)).not.toThrow()
        }
      }
    })

    it('returns null for unrecognised sign', () => {
      expect(termOf('Jupiter', 'Nowhere', 5)).toBeNull()
    })

    it('clamps degree at the upper end', () => {
      // 30 should be clamped just inside the last arc, ruled by Saturn in Aries
      expect(termOf('Saturn', 'Aries', 30)).toBe('Saturn')
    })

    it('the sun and moon do not own any Egyptian bounds', () => {
      const signs = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
      ]
      for (const s of signs) {
        for (let d = 0; d < 30; d += 1) {
          expect(termOf('Sun', s, d)).toBeNull()
          expect(termOf('Moon', s, d)).toBeNull()
        }
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // Chaldean Faces (Decans)
  // ──────────────────────────────────────────────────────────────────
  describe('faceOf', () => {
    it('Aries 0..10° → Mars (1st decan, Chaldean order)', () => {
      expect(faceOf('Mars', 'Aries', 0)).toBe('Mars')
      expect(faceOf('Mars', 'Aries', 9.99)).toBe('Mars')
      expect(faceOf('Mars', 'Aries', 10)).toBeNull() // crossed into 2nd decan
    })

    it('Aries 10..20° → Sun, 20..30° → Venus', () => {
      expect(faceOf('Sun', 'Aries', 15)).toBe('Sun')
      expect(faceOf('Venus', 'Aries', 25)).toBe('Venus')
    })

    it('decans follow the Chaldean order across signs', () => {
      // Taurus decans: Mercury, Moon, Saturn
      expect(faceOf('Mercury', 'Taurus', 5)).toBe('Mercury')
      expect(faceOf('Moon', 'Taurus', 15)).toBe('Moon')
      expect(faceOf('Saturn', 'Taurus', 25)).toBe('Saturn')
      // Gemini: Jupiter, Mars, Sun
      expect(faceOf('Jupiter', 'Gemini', 0)).toBe('Jupiter')
      expect(faceOf('Mars', 'Gemini', 10)).toBe('Mars')
      expect(faceOf('Sun', 'Gemini', 20)).toBe('Sun')
    })

    it('returns null when the planet does not rule that decan', () => {
      expect(faceOf('Jupiter', 'Aries', 5)).toBeNull()
    })

    it('returns null for unrecognised sign', () => {
      expect(faceOf('Mars', 'Nowhere', 5)).toBeNull()
    })

    it('handles boundary degree 30 cleanly (last decan)', () => {
      expect(faceOf('Venus', 'Aries', 30)).toBe('Venus')
    })

    it('accepts Korean sign names', () => {
      expect(faceOf('Mars', '양자리', 0)).toBe('Mars') // Aries
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // Combined tier evaluation + score
  // ──────────────────────────────────────────────────────────────────
  describe('dignityTiers + dignityScore', () => {
    it('Sun at 5° Aries day chart: exaltation + day-triplicity + face (Mars) + term (Jupiter)', () => {
      // Sun in Aries: exalted (yes), domicile (no, Leo only), triplicity day (yes — fire day = Sun)
      // 5° Aries — first decan ruled by Mars (face NO for Sun)
      //          — first bound 0..6 ruled by Jupiter (term NO for Sun)
      const t = dignityTiers('Sun', 'Aries', 5, 'day')
      expect(t.exaltation).toBe(true)
      expect(t.triplicity).toBe(true)
      expect(t.term).toBe(false)
      expect(t.face).toBe(false)
      expect(t.domicile).toBe(false)
      expect(t.detriment).toBe(false)
      expect(t.fall).toBe(false)

      // score: +1 (exalt) +0.5 (triplicity) = +1.5
      expect(dignityScore(t)).toBeCloseTo(1.5, 5)
    })

    it('Saturn at 28° Aries day chart: fall + participating triplicity + Saturn term + face null', () => {
      // Saturn fall = Aries (yes)
      // Aries last bound 25..30 ruled by Saturn → term YES
      // 28° Aries is in 20..30 decan ruled by Venus → face NO
      // Triplicity: Aries is fire, fire participating = Saturn → triplicity YES
      const t = dignityTiers('Saturn', 'Aries', 28, 'day')
      expect(t.fall).toBe(true)
      expect(t.term).toBe(true)
      expect(t.face).toBe(false)
      expect(t.triplicity).toBe(true)
      // score: -1 (fall) +0.5 (triplicity) +0.3 (term) = -0.2
      expect(dignityScore(t)).toBeCloseTo(-0.2, 5)
    })

    it('Mars at 2° Scorpio night chart: domicile + night-triplicity + Mars term + Mars face', () => {
      // Mars domicile = Scorpio (yes)
      // Triplicity water night = Mars (yes)
      // Scorpio 0..7 bound = Mars → term YES
      // Scorpio first decan = Mars → face YES
      const t = dignityTiers('Mars', 'Scorpio', 2, 'night')
      expect(t.domicile).toBe(true)
      expect(t.triplicity).toBe(true)
      expect(t.term).toBe(true)
      expect(t.face).toBe(true)
      // score: +1 +0.5 +0.3 +0.2 = +2.0 (no exalt → Mars not exalted in Scorpio)
      expect(dignityScore(t)).toBeCloseTo(2.0, 5)
    })

    it('returns peregrine via legacy dignityOf when none of the major tiers apply', () => {
      // Mercury in Aries — no major dignity
      expect(dignityOf('Mercury', 'Aries')).toBe('peregrine')
    })

    it('detriment is reflected as -1 in score', () => {
      // Sun in Aquarius: detriment, no triplicity (air day=Saturn), maybe term/face
      const t = dignityTiers('Sun', 'Aquarius', 0, 'day')
      expect(t.detriment).toBe(true)
      expect(dignityScore(t)).toBeLessThanOrEqual(0)
    })
  })
})
