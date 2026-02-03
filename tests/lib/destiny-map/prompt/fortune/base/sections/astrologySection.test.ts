/**
 * astrologySection.test.ts - 점성술 섹션 빌더 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  formatTransits,
  extractExtraPoints,
  extractAsteroids,
  extractReturns,
  extractProgressions,
  extractFixedStars,
} from '@/lib/destiny-map/prompt/fortune/base/sections/astrologySection'

describe('astrologySection', () => {
  describe('formatTransits', () => {
    it('should format transit data correctly', () => {
      const transits = [
        {
          transitPlanet: 'Jupiter',
          natalPoint: 'Sun',
          type: 'trine',
          isApplying: true,
        },
        {
          transitPlanet: 'Saturn',
          natalPoint: 'Moon',
          type: 'square',
          isApplying: false,
        },
      ]

      const result = formatTransits(transits)

      expect(result).toBe('Jupiter-trine-Sun (접근중); Saturn-square-Moon (분리중)')
    })

    it('should handle from/to format', () => {
      const transits = [
        {
          from: { name: 'Mars' },
          to: { name: 'Venus' },
          aspectType: 'conjunction',
          isApplying: true,
        },
      ]

      const result = formatTransits(transits)

      expect(result).toBe('Mars-conjunction-Venus (접근중)')
    })

    it('should filter only major aspects', () => {
      const transits = [
        { transitPlanet: 'A', natalPoint: 'B', type: 'trine', isApplying: true },
        { transitPlanet: 'C', natalPoint: 'D', type: 'sextile', isApplying: true }, // sextile is not major
        { transitPlanet: 'E', natalPoint: 'F', type: 'square', isApplying: true },
      ]

      const result = formatTransits(transits)

      expect(result).toContain('trine')
      expect(result).toContain('square')
      expect(result).not.toContain('sextile')
    })

    it('should limit to 8 transits', () => {
      const transits = Array(10)
        .fill(null)
        .map((_, i) => ({
          transitPlanet: `P${i}`,
          natalPoint: `N${i}`,
          type: 'conjunction',
          isApplying: true,
        }))

      const result = formatTransits(transits)

      const semicolonCount = (result.match(/;/g) || []).length
      expect(semicolonCount).toBe(7) // 8 items = 7 semicolons
    })

    it('should handle missing data gracefully', () => {
      const transits = [
        {
          type: 'trine',
          isApplying: true,
        },
      ]

      const result = formatTransits(transits)

      expect(result).toContain('?-trine-?')
    })

    it('should handle empty transits array', () => {
      const result = formatTransits([])

      expect(result).toBe('')
    })
  })

  describe('extractExtraPoints', () => {
    it('should extract all extra points', () => {
      const data = {
        extraPoints: {
          chiron: { sign: 'Aries', house: 1 },
          lilith: { sign: 'Scorpio', house: 8 },
          vertex: { sign: 'Libra', house: 7 },
          partOfFortune: { sign: 'Taurus', house: 2 },
        },
      }

      const result = extractExtraPoints(data)

      expect(result.extraPointsText).toContain('Chiron(상처/치유): Aries (H1)')
      expect(result.extraPointsText).toContain('Lilith(그림자): Scorpio (H8)')
      expect(result.extraPointsText).toContain('Vertex(운명): Libra (H7)')
      expect(result.extraPointsText).toContain('Part of Fortune(행운): Taurus (H2)')
      expect(result.chiron).toEqual({ sign: 'Aries', house: 1 })
      expect(result.lilith).toEqual({ sign: 'Scorpio', house: 8 })
    })

    it('should handle missing extra points', () => {
      const data = {}

      const result = extractExtraPoints(data)

      expect(result.extraPointsText).toBe('-')
      expect(result.chiron).toBeUndefined()
      expect(result.lilith).toBeUndefined()
    })

    it('should handle partial extra points', () => {
      const data = {
        extraPoints: {
          chiron: { sign: 'Pisces', house: 12 },
        },
      }

      const result = extractExtraPoints(data)

      expect(result.extraPointsText).toContain('Chiron')
      expect(result.extraPointsText).not.toContain('Lilith')
      expect(result.chiron).toBeDefined()
      expect(result.lilith).toBeUndefined()
    })
  })

  describe('extractAsteroids', () => {
    it('should extract all asteroid data', () => {
      const data = {
        asteroids: {
          ceres: { sign: 'Taurus', house: 2 },
          pallas: { sign: 'Aquarius', house: 11 },
          juno: { sign: 'Libra', house: 7 },
          vesta: { sign: 'Virgo', house: 6 },
        },
      }

      const result = extractAsteroids(data)

      expect(result.asteroidsText).toContain('Ceres(양육): Taurus (H2)')
      expect(result.asteroidsText).toContain('Pallas(지혜): Aquarius (H11)')
      expect(result.asteroidsText).toContain('Juno(결혼): Libra (H7)')
      expect(result.asteroidsText).toContain('Vesta(헌신): Virgo (H6)')
    })

    it('should handle asteroid aspects as array', () => {
      const data = {
        asteroids: {
          aspects: [
            { asteroid: 'Ceres', type: 'conjunction', planet: 'Sun' },
            { from: 'Pallas', aspect: 'trine', to: 'Moon' },
          ],
        },
      }

      const result = extractAsteroids(data)

      expect(result.asteroidAspectsText).toContain('Ceres-conjunction-Sun')
      expect(result.asteroidAspectsText).toContain('Pallas-trine-Moon')
    })

    it('should handle asteroid aspects as object', () => {
      const data = {
        asteroids: {
          aspects: {
            Ceres: [{ type: 'square', planet: 'Mars', planet2: { name: 'Mars' } }],
            Juno: [{ type: 'trine', planet: 'Venus', planet2: { name: 'Venus' } }],
          },
        },
      }

      const result = extractAsteroids(data)

      expect(result.asteroidAspectsText).toContain('Ceres-square-Mars')
      expect(result.asteroidAspectsText).toContain('Juno-trine-Venus')
    })

    it('should limit asteroid aspects to 4', () => {
      const data = {
        asteroids: {
          aspects: Array(6)
            .fill(null)
            .map((_, i) => ({
              asteroid: `A${i}`,
              type: 'conjunction',
              planet: `P${i}`,
            })),
        },
      }

      const result = extractAsteroids(data)

      const semicolonCount = (result.asteroidAspectsText.match(/;/g) || []).length
      expect(semicolonCount).toBeLessThanOrEqual(3) // 4 items = 3 semicolons
    })

    it('should handle missing asteroid data', () => {
      const data = {}

      const result = extractAsteroids(data)

      expect(result.asteroidsText).toBe('-')
      expect(result.asteroidAspectsText).toBe('-')
    })
  })

  describe('extractReturns', () => {
    it('should extract solar return data', () => {
      const data = {
        solarReturn: {
          summary: {
            ascSign: 'Leo',
            sunHouse: 10,
            moonSign: 'Cancer',
            moonHouse: 9,
            theme: '커리어 성장의 해',
          },
        },
      }

      const result = extractReturns(data)

      expect(result.solarReturnText).toContain('SR ASC: Leo')
      expect(result.solarReturnText).toContain('SR Sun House: 10')
      expect(result.solarReturnText).toContain('SR Moon: Cancer (H9)')
      expect(result.solarReturnText).toContain('Year Theme: 커리어 성장의 해')
    })

    it('should handle alternative solar return property names', () => {
      const data = {
        solarReturn: {
          summary: {
            ascendant: 'Virgo',
            yearTheme: '변화의 해',
          },
        },
      }

      const result = extractReturns(data)

      expect(result.solarReturnText).toContain('SR ASC: Virgo')
      expect(result.solarReturnText).toContain('Year Theme: 변화의 해')
    })

    it('should extract lunar return data', () => {
      const data = {
        lunarReturn: {
          summary: {
            ascSign: 'Gemini',
            moonHouse: 4,
            theme: '가정에 집중',
          },
        },
      }

      const result = extractReturns(data)

      expect(result.lunarReturnText).toContain('LR ASC: Gemini')
      expect(result.lunarReturnText).toContain('LR Moon House: 4')
      expect(result.lunarReturnText).toContain('Month Theme: 가정에 집중')
    })

    it('should handle missing return data', () => {
      const data = {}

      const result = extractReturns(data)

      expect(result.solarReturnText).toBe('-')
      expect(result.lunarReturnText).toBe('-')
    })
  })

  describe('extractProgressions', () => {
    it('should extract progression data', () => {
      const data = {
        progressions: {
          secondary: {
            summary: {
              keySigns: {
                sun: 'Virgo',
                moon: 'Libra',
              },
              moonHouse: 7,
              ascendant: 'Scorpio',
            },
            moonPhase: {
              phase: 'Waxing Gibbous',
            },
          },
          solarArc: {
            summary: {
              keySigns: {
                sun: 'Libra',
              },
            },
          },
        },
      }

      const result = extractProgressions(data)

      expect(result.progressionsText).toContain('P.Sun: Virgo')
      expect(result.progressionsText).toContain('P.Moon: Libra')
      expect(result.progressionsText).toContain('Phase: Waxing Gibbous')
      expect(result.progressionsText).toContain('P.ASC: Scorpio')
      expect(result.progressionsText).toContain('SA Sun: Libra')
      expect(result.progressionDetailText).toContain('Progressed Moon Phase')
    })

    it('should handle alternative progression property names', () => {
      const data = {
        progressions: {
          secondary: {
            summary: {
              progressedSun: 'Leo',
              progressedMoon: 'Cancer',
            },
            chart: {
              ascendant: {
                sign: 'Sagittarius',
              },
            },
          },
        },
      }

      const result = extractProgressions(data)

      expect(result.progressionsText).toContain('P.Sun: Leo')
      expect(result.progressionsText).toContain('P.Moon: Cancer')
      expect(result.progressionsText).toContain('P.ASC: Sagittarius')
    })

    it('should handle missing progression data', () => {
      const data = {}

      const result = extractProgressions(data)

      expect(result.progressionsText).toBe('-')
      expect(result.progressionDetailText).toBe('')
    })
  })

  describe('extractFixedStars', () => {
    it('should extract fixed stars data', () => {
      const data = {
        fixedStars: [
          {
            star: 'Algol',
            starName: 'Algol',
            planet: 'Mars',
            planetName: 'Mars',
            meaning: '격렬한 에너지',
          },
          {
            star: 'Regulus',
            starName: 'Regulus',
            planet: 'Sun',
            planetName: 'Sun',
            meaning: '왕의 별',
          },
        ],
      }

      const result = extractFixedStars(data)

      expect(result).toContain('Algol↔Mars(격렬한 에너지)')
      expect(result).toContain('Regulus↔Sun(왕의 별)')
    })

    it('should limit to 4 fixed stars', () => {
      const data = {
        fixedStars: Array(6)
          .fill(null)
          .map((_, i) => ({
            star: `Star${i}`,
            planet: `Planet${i}`,
            meaning: `Meaning${i}`,
          })),
      }

      const result = extractFixedStars(data)

      const arrowCount = (result.match(/↔/g) || []).length
      expect(arrowCount).toBeLessThanOrEqual(4)
    })

    it('should handle missing fixed stars', () => {
      const data = {}

      const result = extractFixedStars(data)

      expect(result).toBe('-')
    })

    it('should handle empty fixed stars array', () => {
      const data = {
        fixedStars: [],
      }

      const result = extractFixedStars(data)

      expect(result).toBe('-')
    })
  })

  describe('integration tests', () => {
    it('should work together to extract complete astrology section', () => {
      const data = {
        extraPoints: {
          chiron: { sign: 'Aries', house: 1 },
          lilith: { sign: 'Scorpio', house: 8 },
        },
        asteroids: {
          ceres: { sign: 'Taurus', house: 2 },
          juno: { sign: 'Libra', house: 7 },
          aspects: [{ asteroid: 'Ceres', type: 'trine', planet: 'Moon' }],
        },
        solarReturn: {
          summary: {
            ascSign: 'Leo',
            sunHouse: 10,
            theme: '커리어 성장',
          },
        },
        lunarReturn: {
          summary: {
            ascSign: 'Gemini',
            moonHouse: 4,
          },
        },
        progressions: {
          secondary: {
            summary: {
              keySigns: { sun: 'Virgo', moon: 'Libra' },
            },
            moonPhase: { phase: 'Full Moon' },
          },
        },
        fixedStars: [{ star: 'Regulus', planet: 'Sun', meaning: '왕의 별' }],
      }

      const transits = [
        { transitPlanet: 'Jupiter', natalPoint: 'Sun', type: 'trine', isApplying: true },
      ]

      const extraPoints = extractExtraPoints(data)
      const asteroids = extractAsteroids(data)
      const returns = extractReturns(data)
      const progressions = extractProgressions(data)
      const fixedStars = extractFixedStars(data)
      const transitText = formatTransits(transits)

      expect(extraPoints.extraPointsText).toContain('Chiron')
      expect(asteroids.asteroidsText).toContain('Ceres')
      expect(returns.solarReturnText).toContain('Leo')
      expect(progressions.progressionsText).toContain('Virgo')
      expect(fixedStars).toContain('Regulus')
      expect(transitText).toContain('Jupiter-trine-Sun')
    })
  })
})
