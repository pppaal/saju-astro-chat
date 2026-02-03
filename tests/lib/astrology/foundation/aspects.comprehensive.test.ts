import { describe, it, expect } from 'vitest'
import { findAspects, findNatalAspects } from '@/lib/astrology/foundation/aspects'
import type { Chart, AspectRules } from '@/lib/astrology/foundation/types'

describe('aspects.ts', () => {
  describe('findAspects', () => {
    const mockNatalChart: Chart = {
      planets: [
        { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
        { name: 'Moon', longitude: 90, house: 4, sign: 'Cancer', speed: 13 },
        { name: 'Mercury', longitude: 30, house: 2, sign: 'Taurus', speed: 1.5 },
      ],
      ascendant: { longitude: 0, sign: 'Aries', house: 1 },
      mc: { longitude: 90, sign: 'Cancer', house: 10 },
      houses: [],
    }

    const mockTransitChart: Chart = {
      planets: [
        { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
        { name: 'Mars', longitude: 180, house: 7, sign: 'Libra', speed: 0.5 },
      ],
      ascendant: { longitude: 0, sign: 'Aries', house: 1 },
      mc: { longitude: 90, sign: 'Cancer', house: 10 },
      houses: [],
    }

    it('should find conjunction aspects', () => {
      const results = findAspects(mockNatalChart, mockTransitChart)

      const conjunction = results.find(
        (h) => h.type === 'conjunction' && h.from.name === 'Sun' && h.to.name === 'Sun'
      )

      expect(conjunction).toBeDefined()
      expect(conjunction?.orb).toBe(0)
    })

    it('should find opposition aspects', () => {
      const results = findAspects(mockNatalChart, mockTransitChart)

      const opposition = results.find(
        (h) => h.type === 'opposition' && h.from.name === 'Mars' && h.to.name === 'Sun'
      )

      expect(opposition).toBeDefined()
      expect(opposition?.orb).toBe(0)
    })

    it('should find square aspects', () => {
      const natal: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [{ name: 'Mars', longitude: 90, house: 4, sign: 'Cancer', speed: 0.5 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit)

      const square = results.find(
        (h) => h.type === 'square' && h.from.name === 'Mars' && h.to.name === 'Sun'
      )

      expect(square).toBeDefined()
      expect(square?.orb).toBe(0)
    })

    it('should find trine aspects', () => {
      const natal: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [{ name: 'Jupiter', longitude: 120, house: 5, sign: 'Leo', speed: 0.08 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit)

      const trine = results.find(
        (h) => h.type === 'trine' && h.from.name === 'Jupiter' && h.to.name === 'Sun'
      )

      expect(trine).toBeDefined()
      expect(trine?.orb).toBe(0)
    })

    it('should find sextile aspects', () => {
      const natal: Chart = {
        planets: [{ name: 'Moon', longitude: 0, house: 1, sign: 'Aries', speed: 13 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [{ name: 'Venus', longitude: 60, house: 3, sign: 'Gemini', speed: 1.2 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit)

      const sextile = results.find(
        (h) => h.type === 'sextile' && h.from.name === 'Venus' && h.to.name === 'Moon'
      )

      expect(sextile).toBeDefined()
      expect(sextile?.orb).toBe(0)
    })

    it('should respect orb limits', () => {
      const natal: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [
          { name: 'Mars', longitude: 10, house: 1, sign: 'Aries', speed: 0.5 }, // 10° from conjunction
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit, {
        orbs: { default: 5 }, // Small orb
      })

      const tooWide = results.find(
        (h) => h.from.name === 'Mars' && h.to.name === 'Sun' && h.orb > 5
      )

      expect(tooWide).toBeUndefined()
    })

    it('should include minor aspects when requested', () => {
      const natal: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [
          { name: 'Saturn', longitude: 150, house: 6, sign: 'Virgo', speed: 0.03 }, // quincunx
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit, { includeMinor: true })

      const quincunx = results.find((h) => h.type === 'quincunx')

      expect(quincunx).toBeDefined()
    })

    it('should not include minor aspects by default', () => {
      const natal: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [
          { name: 'Saturn', longitude: 30, house: 2, sign: 'Taurus', speed: 0.03 }, // semisextile
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit, { includeMinor: false })

      const semisextile = results.find((h) => h.type === 'semisextile')

      expect(semisextile).toBeUndefined()
    })

    it('should respect maxResults limit', () => {
      const results = findAspects(mockNatalChart, mockTransitChart, { maxResults: 2 })

      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should sort by score descending', () => {
      const results = findAspects(mockNatalChart, mockTransitChart)

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
      }
    })

    it('should handle empty natal chart', () => {
      const emptyChart: Chart = {
        planets: [],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(emptyChart, mockTransitChart)

      // Should still find aspects to Ascendant and MC
      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle empty transit chart', () => {
      const emptyChart: Chart = {
        planets: [],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(mockNatalChart, emptyChart)

      expect(results).toEqual([])
    })

    it('should calculate applying aspects correctly', () => {
      const natal: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [
          { name: 'Mars', longitude: 1, house: 1, sign: 'Aries', speed: 0.5 }, // Close to conjunction
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit, {
        orbs: { default: 5 }, // Use wider orb
      })

      const aspect = results.find((h) => h.from.name === 'Mars' && h.to.name === 'Sun')

      expect(aspect).toBeDefined()
      expect(aspect?.applying).toBeDefined()
    })

    it('should include house and sign information', () => {
      const results = findAspects(mockNatalChart, mockTransitChart)

      const aspect = results[0]

      expect(aspect.from.house).toBeDefined()
      expect(aspect.from.sign).toBeDefined()
      expect(aspect.to.house).toBeDefined()
      expect(aspect.to.sign).toBeDefined()
    })

    it('should handle Ascendant aspects', () => {
      const natal: Chart = {
        planets: [],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit)

      const ascAspect = results.find((h) => h.to.name === 'Ascendant')

      expect(ascAspect).toBeDefined()
    })

    it('should handle MC aspects', () => {
      const natal: Chart = {
        planets: [],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [{ name: 'Jupiter', longitude: 90, house: 10, sign: 'Cancer', speed: 0.08 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit)

      const mcAspect = results.find((h) => h.to.name === 'MC')

      expect(mcAspect).toBeDefined()
    })

    it('should handle undefined chart safely', () => {
      const results = findAspects(undefined as any, mockTransitChart)

      // Should still include Ascendant/MC from undefined chart (defaults to 0)
      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle chart with undefined planets array', () => {
      const malformedChart: any = {
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
      }

      const results = findAspects(malformedChart, mockTransitChart)

      // Should not throw
      expect(results).toBeDefined()
    })
  })

  describe('findNatalAspects', () => {
    it('should find aspects between natal planets', () => {
      const chart: Chart = {
        planets: [
          { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
          { name: 'Moon', longitude: 120, house: 5, sign: 'Leo', speed: 13 },
          { name: 'Mars', longitude: 90, house: 4, sign: 'Cancer', speed: 0.5 },
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart)

      expect(results.length).toBeGreaterThan(0)
    })

    it('should find trine between Sun and Moon', () => {
      const chart: Chart = {
        planets: [
          { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
          { name: 'Moon', longitude: 120, house: 5, sign: 'Leo', speed: 13 },
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart)

      const trine = results.find(
        (h) =>
          h.type === 'trine' &&
          ((h.from.name === 'Sun' && h.to.name === 'Moon') ||
            (h.from.name === 'Moon' && h.to.name === 'Sun'))
      )

      expect(trine).toBeDefined()
      expect(trine?.orb).toBe(0)
    })

    it('should not duplicate aspects', () => {
      const chart: Chart = {
        planets: [
          { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
          { name: 'Moon', longitude: 0, house: 1, sign: 'Aries', speed: 13 },
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart)

      // Should only find one conjunction, not two (Sun-Moon and Moon-Sun)
      const conjunctions = results.filter((h) => h.type === 'conjunction')
      expect(conjunctions.length).toBe(1)
    })

    it('should use wider orbs for natal aspects', () => {
      const chart: Chart = {
        planets: [
          { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
          { name: 'Moon', longitude: 5, house: 1, sign: 'Aries', speed: 13 },
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart)

      // Should find conjunction with 5° orb (natal orbs are +3)
      const conjunction = results.find((h) => h.type === 'conjunction')
      expect(conjunction).toBeDefined()
    })

    it('should handle empty planet array', () => {
      const chart: Chart = {
        planets: [],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart)

      expect(results).toEqual([])
    })

    it('should handle single planet', () => {
      const chart: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart)

      expect(results).toEqual([])
    })

    it('should respect maxResults for natal aspects', () => {
      const chart: Chart = {
        planets: [
          { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
          { name: 'Moon', longitude: 30, house: 2, sign: 'Taurus', speed: 13 },
          { name: 'Mercury', longitude: 60, house: 3, sign: 'Gemini', speed: 1.5 },
          { name: 'Venus', longitude: 90, house: 4, sign: 'Cancer', speed: 1.2 },
          { name: 'Mars', longitude: 120, house: 5, sign: 'Leo', speed: 0.5 },
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart, { maxResults: 3 })

      expect(results.length).toBeLessThanOrEqual(3)
    })

    it('should sort natal aspects by score', () => {
      const chart: Chart = {
        planets: [
          { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
          { name: 'Moon', longitude: 120, house: 5, sign: 'Leo', speed: 13 },
          { name: 'Mars', longitude: 90, house: 4, sign: 'Cancer', speed: 0.5 },
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart)

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
      }
    })

    it('should include minor aspects when requested', () => {
      const chart: Chart = {
        planets: [
          { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
          { name: 'Saturn', longitude: 30, house: 2, sign: 'Taurus', speed: 0.03 }, // semisextile
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart, { includeMinor: true })

      const semisextile = results.find((h) => h.type === 'semisextile')

      expect(semisextile).toBeDefined()
    })

    it('should handle undefined chart safely', () => {
      const results = findNatalAspects(undefined as any)

      expect(results).toEqual([])
    })

    it('should mark both from and to as natal kind', () => {
      const chart: Chart = {
        planets: [
          { name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 },
          { name: 'Moon', longitude: 0, house: 1, sign: 'Aries', speed: 13 },
        ],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findNatalAspects(chart)

      const aspect = results[0]

      expect(aspect.from.kind).toBe('natal')
      expect(aspect.to.kind).toBe('natal')
    })
  })

  describe('Edge Cases', () => {
    it('should handle planets at 359° and 1° as conjunction', () => {
      const natal: Chart = {
        planets: [{ name: 'Sun', longitude: 359, house: 1, sign: 'Pisces', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [{ name: 'Mars', longitude: 1, house: 1, sign: 'Aries', speed: 0.5 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit)

      const conjunction = results.find((h) => h.type === 'conjunction')

      expect(conjunction).toBeDefined()
      expect(conjunction?.orb).toBeLessThan(3) // Should be ~2°
    })

    it('should handle missing speed values', () => {
      const natal: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: undefined }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [{ name: 'Mars', longitude: 0, house: 1, sign: 'Aries', speed: undefined }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const results = findAspects(natal, transit)

      // Should not throw
      expect(results).toBeDefined()
    })

    it('should handle custom aspect rules', () => {
      const natal: Chart = {
        planets: [{ name: 'Sun', longitude: 0, house: 1, sign: 'Aries', speed: 1 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const transit: Chart = {
        planets: [{ name: 'Mars', longitude: 0, house: 1, sign: 'Aries', speed: 0.5 }],
        ascendant: { longitude: 0, sign: 'Aries', house: 1 },
        mc: { longitude: 90, sign: 'Cancer', house: 10 },
        houses: [],
      }

      const customRules: AspectRules = {
        aspects: ['conjunction', 'opposition'],
        orbs: { default: 10 },
      }

      const results = findAspects(natal, transit, customRules)

      // Should only include specified aspects
      const hasSquare = results.some((h) => h.type === 'square')
      expect(hasSquare).toBe(false)
    })
  })
})
