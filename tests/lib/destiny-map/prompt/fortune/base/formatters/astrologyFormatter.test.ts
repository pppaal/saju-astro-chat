/**
 * astrologyFormatter.test.ts - 점성술 포맷팅 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  formatPlanetLines,
  formatHouseLines,
  formatAspectLines,
  formatElementRatios,
  getSignFromCusp,
} from '@/lib/destiny-map/prompt/fortune/base/formatters/astrologyFormatter'
import type {
  PlanetData,
  HouseData,
  AspectData,
} from '@/lib/destiny-map/prompt/fortune/base/prompt-types'

describe('astrologyFormatter', () => {
  describe('formatPlanetLines', () => {
    it('should format planet data to readable lines', () => {
      const planets: PlanetData[] = [
        { name: 'Sun', sign: 'Aries', house: 1 },
        { name: 'Moon', sign: 'Taurus', house: 2 },
      ]

      const result = formatPlanetLines(planets)
      expect(result).toBe('Sun: Aries (H1); Moon: Taurus (H2)')
    })

    it('should handle missing data gracefully', () => {
      const planets: PlanetData[] = [{ name: 'Sun' }, { sign: 'Taurus', house: 2 }]

      const result = formatPlanetLines(planets)
      expect(result).toContain('Sun: - (H-)')
      expect(result).toContain('?: Taurus (H2)')
    })

    it('should limit to first 12 planets', () => {
      const planets: PlanetData[] = Array(15)
        .fill(null)
        .map((_, i) => ({
          name: `Planet${i}`,
          sign: 'Aries',
          house: 1,
        }))

      const result = formatPlanetLines(planets)
      const semicolonCount = (result.match(/;/g) || []).length
      expect(semicolonCount).toBe(11) // 12 planets = 11 semicolons
    })

    it('should handle empty planet array', () => {
      const result = formatPlanetLines([])
      expect(result).toBe('')
    })

    it('should format all main planets correctly', () => {
      const mainPlanets: PlanetData[] = [
        { name: 'Sun', sign: 'Leo', house: 5 },
        { name: 'Moon', sign: 'Cancer', house: 4 },
        { name: 'Mercury', sign: 'Virgo', house: 6 },
        { name: 'Venus', sign: 'Libra', house: 7 },
        { name: 'Mars', sign: 'Aries', house: 1 },
        { name: 'Jupiter', sign: 'Sagittarius', house: 9 },
        { name: 'Saturn', sign: 'Capricorn', house: 10 },
        { name: 'Uranus', sign: 'Aquarius', house: 11 },
        { name: 'Neptune', sign: 'Pisces', house: 12 },
        { name: 'Pluto', sign: 'Scorpio', house: 8 },
      ]

      const result = formatPlanetLines(mainPlanets)
      expect(result).toContain('Sun: Leo (H5)')
      expect(result).toContain('Moon: Cancer (H4)')
      expect(result).toContain('Pluto: Scorpio (H8)')
    })
  })

  describe('formatHouseLines', () => {
    it('should format house array to readable lines', () => {
      const houses: HouseData[] = [
        { sign: 'Aries', cusp: 0 },
        { sign: 'Taurus', cusp: 30 },
      ]

      const result = formatHouseLines(houses)
      expect(result).toBe('H1: Aries; H2: Taurus')
    })

    it('should format house object to readable lines', () => {
      const houses: Record<string, HouseData> = {
        '1': { sign: 'Aries', cusp: 0 },
        '2': { sign: 'Taurus', cusp: 30 },
      }

      const result = formatHouseLines(houses)
      expect(result).toContain('H1: Aries')
      expect(result).toContain('H2: Taurus')
    })

    it('should handle formatted house data', () => {
      const houses: HouseData[] = [{ formatted: 'Aries 0°' }]

      const result = formatHouseLines(houses)
      expect(result).toContain('Aries 0°')
    })

    it('should limit to first 12 houses', () => {
      const houses: HouseData[] = Array(15)
        .fill(null)
        .map(() => ({ sign: 'Aries', cusp: 0 }))

      const result = formatHouseLines(houses)
      const semicolonCount = (result.match(/;/g) || []).length
      expect(semicolonCount).toBe(11) // 12 houses = 11 semicolons
    })

    it('should handle all 12 houses correctly', () => {
      const signs = [
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
      const houses: HouseData[] = signs.map((sign, i) => ({ sign, cusp: i * 30 }))

      const result = formatHouseLines(houses)
      signs.forEach((sign, i) => {
        expect(result).toContain(`H${i + 1}: ${sign}`)
      })
    })
  })

  describe('formatAspectLines', () => {
    it('should format aspect data to readable lines', () => {
      const aspects: AspectData[] = [
        { planet1: { name: 'Sun' }, planet2: { name: 'Moon' }, type: 'conjunction' },
        { planet1: { name: 'Venus' }, planet2: { name: 'Mars' }, type: 'trine' },
      ]

      const result = formatAspectLines(aspects)
      expect(result).toBe('Sun-conjunction-Moon; Venus-trine-Mars')
    })

    it('should handle from/to format', () => {
      const aspects: AspectData[] = [
        { from: { name: 'Sun' }, to: { name: 'Moon' }, aspect: 'square' },
      ]

      const result = formatAspectLines(aspects)
      expect(result).toBe('Sun-square-Moon')
    })

    it('should handle missing data gracefully', () => {
      const aspects: AspectData[] = [{ planet1: { name: 'Sun' } }, { type: 'trine' }]

      const result = formatAspectLines(aspects)
      expect(result).toContain('?')
    })

    it('should limit to first 12 aspects', () => {
      const aspects: AspectData[] = Array(15)
        .fill(null)
        .map(() => ({
          planet1: { name: 'Sun' },
          planet2: { name: 'Moon' },
          type: 'conjunction',
        }))

      const result = formatAspectLines(aspects)
      const semicolonCount = (result.match(/;/g) || []).length
      expect(semicolonCount).toBe(11) // 12 aspects = 11 semicolons
    })

    it('should format major aspect types correctly', () => {
      const aspectTypes = ['conjunction', 'opposition', 'trine', 'square', 'sextile']
      const aspects: AspectData[] = aspectTypes.map((type) => ({
        planet1: { name: 'Sun' },
        planet2: { name: 'Moon' },
        type,
      }))

      const result = formatAspectLines(aspects)
      aspectTypes.forEach((type) => {
        expect(result).toContain(`-${type}-`)
      })
    })
  })

  describe('formatElementRatios', () => {
    it('should format element ratios to readable string', () => {
      const ratios = {
        Fire: 25.5,
        Earth: 30.2,
        Air: 20.3,
        Water: 24.0,
      }

      const result = formatElementRatios(ratios)
      expect(result).toContain('Fire:25.5')
      expect(result).toContain('Earth:30.2')
      expect(result).toContain('Air:20.3')
      expect(result).toContain('Water:24.0')
    })

    it('should handle numbers without toFixed method', () => {
      const ratios = {
        Fire: 25,
        Earth: 30,
      }

      const result = formatElementRatios(ratios)
      expect(result).toContain('Fire:25')
      expect(result).toContain('Earth:30')
    })

    it('should handle empty ratios', () => {
      const result = formatElementRatios({})
      expect(result).toBe('')
    })

    it('should format with one decimal place', () => {
      const ratios = { Fire: 33.33333 }
      const result = formatElementRatios(ratios)
      expect(result).toBe('Fire:33.3')
    })

    it('should handle all four elements', () => {
      const ratios = {
        Fire: 25.0,
        Earth: 25.0,
        Air: 25.0,
        Water: 25.0,
      }

      const result = formatElementRatios(ratios)
      const elementCount = result.split(',').length
      expect(elementCount).toBe(4)
    })
  })

  describe('getSignFromCusp', () => {
    it('should calculate zodiac sign from cusp degree', () => {
      expect(getSignFromCusp(0)).toBe('Aries')
      expect(getSignFromCusp(30)).toBe('Taurus')
      expect(getSignFromCusp(60)).toBe('Gemini')
      expect(getSignFromCusp(90)).toBe('Cancer')
      expect(getSignFromCusp(120)).toBe('Leo')
      expect(getSignFromCusp(150)).toBe('Virgo')
      expect(getSignFromCusp(180)).toBe('Libra')
      expect(getSignFromCusp(210)).toBe('Scorpio')
      expect(getSignFromCusp(240)).toBe('Sagittarius')
      expect(getSignFromCusp(270)).toBe('Capricorn')
      expect(getSignFromCusp(300)).toBe('Aquarius')
      expect(getSignFromCusp(330)).toBe('Pisces')
    })

    it('should handle degrees within sign ranges', () => {
      expect(getSignFromCusp(15)).toBe('Aries') // 0-29.99
      expect(getSignFromCusp(45)).toBe('Taurus') // 30-59.99
      expect(getSignFromCusp(75)).toBe('Gemini') // 60-89.99
    })

    it('should handle edge cases', () => {
      expect(getSignFromCusp(29.99)).toBe('Aries')
      expect(getSignFromCusp(359.99)).toBe('Pisces')
    })

    it('should handle 360 degrees (full circle)', () => {
      // 360 degrees should wrap to Pisces or Aries depending on implementation
      const result = getSignFromCusp(360)
      expect(['Aries', 'Pisces', '-']).toContain(result)
    })

    it('should calculate all 12 signs correctly', () => {
      const expectedSigns = [
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

      expectedSigns.forEach((sign, index) => {
        const cusp = index * 30
        expect(getSignFromCusp(cusp)).toBe(sign)
      })
    })
  })

  describe('integration tests', () => {
    it('should work together to format complete chart data', () => {
      const planets: PlanetData[] = [
        { name: 'Sun', sign: 'Leo', house: 5 },
        { name: 'Moon', sign: 'Cancer', house: 4 },
      ]

      const houses: HouseData[] = [
        { sign: 'Aries', cusp: 0 },
        { sign: 'Taurus', cusp: 30 },
      ]

      const aspects: AspectData[] = [
        { planet1: { name: 'Sun' }, planet2: { name: 'Moon' }, type: 'trine' },
      ]

      const ratios = { Fire: 40.0, Water: 60.0 }

      const planetLines = formatPlanetLines(planets)
      const houseLines = formatHouseLines(houses)
      const aspectLines = formatAspectLines(aspects)
      const elementLines = formatElementRatios(ratios)

      expect(planetLines).toContain('Sun: Leo (H5)')
      expect(houseLines).toContain('H1: Aries')
      expect(aspectLines).toContain('Sun-trine-Moon')
      expect(elementLines).toContain('Fire:40.0')
    })
  })
})
