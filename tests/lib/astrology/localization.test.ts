import { describe, it, expect } from 'vitest'
import {
  normalizeLocale,
  pickLabels,
  splitSignAndDegree,
  findSignIndex,
  localizeSignLabel,
  localizePlanetLabel,
  parseHM,
  getOriginalPlanetName,
} from '@/lib/astrology/localization'

describe('Astrology Localization', () => {
  describe('normalizeLocale()', () => {
    it('should normalize "ko" to "ko"', () => {
      expect(normalizeLocale('ko')).toBe('ko')
    })

    it('should normalize "ko-KR" to "ko"', () => {
      expect(normalizeLocale('ko-KR')).toBe('ko')
    })

    it('should normalize "en" to "en"', () => {
      expect(normalizeLocale('en')).toBe('en')
    })

    it('should normalize "en-US" to "en"', () => {
      expect(normalizeLocale('en-US')).toBe('en')
    })

    it('should default to "en" for undefined', () => {
      expect(normalizeLocale(undefined)).toBe('en')
    })

    it('should default to "en" for unsupported locale', () => {
      expect(normalizeLocale('fr')).toBe('en')
      expect(normalizeLocale('de')).toBe('en')
    })

    it('should handle "ja" if supported', () => {
      const result = normalizeLocale('ja')
      expect(['ja', 'en']).toContain(result)
    })

    it('should handle "zh" if supported', () => {
      const result = normalizeLocale('zh')
      expect(['zh', 'en']).toContain(result)
    })

    it('should handle empty string', () => {
      expect(normalizeLocale('')).toBe('en')
    })

    it('should handle locale with multiple hyphens', () => {
      const result = normalizeLocale('en-US-POSIX')
      expect(result).toBe('en')
    })
  })

  describe('pickLabels()', () => {
    it('should return labels for "ko" locale', () => {
      const labels = pickLabels('ko')
      expect(labels).toBeDefined()
      expect(typeof labels).toBe('object')
    })

    it('should return labels for "en" locale', () => {
      const labels = pickLabels('en')
      expect(labels).toBeDefined()
      expect(typeof labels).toBe('object')
    })

    it('should return labels for undefined (default to "en")', () => {
      const labels = pickLabels(undefined)
      expect(labels).toBeDefined()
    })

    it('should handle locale with region code', () => {
      const labels = pickLabels('ko-KR')
      expect(labels).toBeDefined()
    })

    it('should fallback to "en" for unsupported locale', () => {
      const labels = pickLabels('fr')
      expect(labels).toBeDefined()
    })

    it('should return consistent structure', () => {
      const koLabels = pickLabels('ko')
      const enLabels = pickLabels('en')

      // Both should have same keys
      expect(Object.keys(koLabels).sort()).toEqual(Object.keys(enLabels).sort())
    })
  })

  describe('splitSignAndDegree()', () => {
    it('should split "Aries 15°30\'" correctly', () => {
      const result = splitSignAndDegree("Aries 15°30'")
      expect(result.signPart).toBe('Aries')
      expect(result.degreePart).toBe("15°30'")
    })

    it('should split "Taurus 0°00\'" correctly', () => {
      const result = splitSignAndDegree("Taurus 0°00'")
      expect(result.signPart).toBe('Taurus')
      expect(result.degreePart).toBe("0°00'")
    })

    it('should handle sign only without degree', () => {
      const result = splitSignAndDegree('Gemini')
      expect(result.signPart).toBe('Gemini')
      expect(result.degreePart).toBe('')
    })

    it('should handle empty string', () => {
      const result = splitSignAndDegree('')
      expect(result.signPart).toBe('')
      expect(result.degreePart).toBe('')
    })

    it('should handle string with multiple spaces', () => {
      const result = splitSignAndDegree("Cancer   20°15'")
      expect(result.signPart).toBe('Cancer')
      expect(result.degreePart).toBe("20°15'")
    })

    it('should trim whitespace', () => {
      const result = splitSignAndDegree("  Leo 10°00'  ")
      expect(result.signPart).toBe('Leo')
      expect(result.degreePart).toBe("10°00'")
    })

    it('should handle Korean zodiac signs', () => {
      const result = splitSignAndDegree("양자리 15°30'")
      expect(result.signPart).toBe('양자리')
      expect(result.degreePart).toBe("15°30'")
    })
  })

  describe('findSignIndex()', () => {
    it('should find Aries at index 0', () => {
      expect(findSignIndex('Aries')).toBe(0)
    })

    it('should find Taurus at index 1', () => {
      expect(findSignIndex('Taurus')).toBe(1)
    })

    it('should find Pisces at index 11', () => {
      expect(findSignIndex('Pisces')).toBe(11)
    })

    it('should find Korean sign names', () => {
      const index = findSignIndex('양자리') // Aries in Korean
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(12)
    })

    it('should return -1 for unknown sign', () => {
      expect(findSignIndex('InvalidSign')).toBe(-1)
    })

    it('should return -1 for empty string', () => {
      expect(findSignIndex('')).toBe(-1)
    })

    it('should handle case-insensitive fuzzy match', () => {
      const index = findSignIndex('aries')
      expect(index).toBeGreaterThanOrEqual(0)
    })

    it('should handle sign names with special characters', () => {
      // Some locales might use special characters
      const index = findSignIndex('Aries')
      expect(index).toBe(0)
    })

    it('should find all 12 zodiac signs', () => {
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

      signs.forEach((sign, expectedIndex) => {
        expect(findSignIndex(sign)).toBe(expectedIndex)
      })
    })
  })

  describe('localizeSignLabel()', () => {
    it('should localize Aries to Korean', () => {
      const result = localizeSignLabel('Aries', 'ko')
      expect(result).toBeDefined()
      expect(result).not.toBe('Aries')
    })

    it('should localize Taurus to English', () => {
      const result = localizeSignLabel('Taurus', 'en')
      expect(result).toBe('Taurus')
    })

    it('should handle formatted strings', () => {
      const result = localizeSignLabel("Aries 15°30'", 'ko')
      expect(result).toBeDefined()
    })

    it('should return original for unknown sign', () => {
      const result = localizeSignLabel('UnknownSign', 'en')
      expect(result).toBe('UnknownSign')
    })

    it('should localize all 12 signs to Korean', () => {
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

      signs.forEach((sign) => {
        const result = localizeSignLabel(sign, 'ko')
        expect(result).toBeDefined()
        expect(result.length).toBeGreaterThan(0)
      })
    })

    it('should handle reverse localization (Korean to English)', () => {
      const koSign = localizeSignLabel('Aries', 'ko')
      const enSign = localizeSignLabel(koSign, 'en')
      expect(enSign).toBe('Aries')
    })

    it('should fallback to English if target locale not available', () => {
      const result = localizeSignLabel('Aries', 'en')
      expect(result).toBe('Aries')
    })
  })

  describe('localizePlanetLabel()', () => {
    it('should localize Sun to Korean', () => {
      const result = localizePlanetLabel('Sun', 'ko')
      expect(result).toBeDefined()
      expect(result).not.toBe('Sun')
    })

    it('should localize Moon to Korean', () => {
      const result = localizePlanetLabel('Moon', 'ko')
      expect(result).toBeDefined()
      expect(result).not.toBe('Moon')
    })

    it('should keep English planet names in English', () => {
      const result = localizePlanetLabel('Sun', 'en')
      expect(result).toBe('Sun')
    })

    it('should handle reverse lookup from Korean to English', () => {
      const koName = localizePlanetLabel('Sun', 'ko')
      const enName = localizePlanetLabel(koName, 'en')
      expect(enName).toBe('Sun')
    })

    it('should return original for unknown planet', () => {
      const result = localizePlanetLabel('UnknownPlanet', 'en')
      expect(result).toBe('UnknownPlanet')
    })

    it('should handle all major planets', () => {
      const planets = [
        'Sun',
        'Moon',
        'Mercury',
        'Venus',
        'Mars',
        'Jupiter',
        'Saturn',
        'Uranus',
        'Neptune',
        'Pluto',
      ]

      planets.forEach((planet) => {
        const result = localizePlanetLabel(planet, 'ko')
        expect(result).toBeDefined()
      })
    })

    it('should handle North Node and South Node', () => {
      const nnResult = localizePlanetLabel('North Node', 'ko')
      const snResult = localizePlanetLabel('South Node', 'ko')
      expect(nnResult).toBeDefined()
      expect(snResult).toBeDefined()
    })
  })

  describe('parseHM()', () => {
    it('should parse 24-hour format "15:30"', () => {
      const result = parseHM('15:30')
      expect(result.h).toBe(15)
      expect(result.m).toBe(30)
    })

    it('should parse "3:30 PM" to 24-hour format', () => {
      const result = parseHM('3:30 PM')
      expect(result.h).toBe(15)
      expect(result.m).toBe(30)
    })

    it('should parse "3:30 AM"', () => {
      const result = parseHM('3:30 AM')
      expect(result.h).toBe(3)
      expect(result.m).toBe(30)
    })

    it('should parse "12:00 PM" to 12', () => {
      const result = parseHM('12:00 PM')
      expect(result.h).toBe(12)
      expect(result.m).toBe(0)
    })

    it('should parse "12:00 AM" to 0', () => {
      const result = parseHM('12:00 AM')
      expect(result.h).toBe(0)
      expect(result.m).toBe(0)
    })

    it('should handle time without minutes', () => {
      const result = parseHM('15')
      expect(result.h).toBe(15)
      expect(result.m).toBe(0)
    })

    it('should handle lowercase am/pm', () => {
      const result = parseHM('3:30 pm')
      expect(result.h).toBe(15)
      expect(result.m).toBe(30)
    })

    it('should handle time with no space before AM/PM', () => {
      const result = parseHM('3:30PM')
      expect(result.h).toBe(15)
      expect(result.m).toBe(30)
    })

    it('should throw for invalid time format', () => {
      expect(() => parseHM('invalid')).toThrow('Enter a valid time')
    })

    it('should throw for out of range hours', () => {
      expect(() => parseHM('25:00')).toThrow('Time must be within')
    })

    it('should throw for out of range minutes', () => {
      expect(() => parseHM('12:60')).toThrow('Time must be within')
    })

    it('should throw for negative hours', () => {
      expect(() => parseHM('-1:00')).toThrow('Time must be within')
    })

    it('should handle edge case 23:59', () => {
      const result = parseHM('23:59')
      expect(result.h).toBe(23)
      expect(result.m).toBe(59)
    })

    it('should handle edge case 00:00', () => {
      const result = parseHM('00:00')
      expect(result.h).toBe(0)
      expect(result.m).toBe(0)
    })

    it('should parse "11:59 PM"', () => {
      const result = parseHM('11:59 PM')
      expect(result.h).toBe(23)
      expect(result.m).toBe(59)
    })

    it('should trim whitespace', () => {
      const result = parseHM('  3:30 PM  ')
      expect(result.h).toBe(15)
      expect(result.m).toBe(30)
    })
  })

  describe('getOriginalPlanetName()', () => {
    it('should get original English name from Korean', () => {
      const original = getOriginalPlanetName('태양')
      expect(original).toBe('Sun')
    })

    it('should return original if already English', () => {
      const original = getOriginalPlanetName('Sun')
      expect(original).toBe('Sun')
    })

    it('should return original for unknown planet', () => {
      const original = getOriginalPlanetName('UnknownPlanet')
      expect(original).toBe('UnknownPlanet')
    })

    it('should handle all major planets in Korean', () => {
      const koToEn: Record<string, string> = {
        태양: 'Sun',
        달: 'Moon',
        수성: 'Mercury',
        금성: 'Venus',
        화성: 'Mars',
        목성: 'Jupiter',
        토성: 'Saturn',
      }

      Object.entries(koToEn).forEach(([ko, en]) => {
        const result = getOriginalPlanetName(ko)
        expect(result).toBe(en)
      })
    })

    it('should be case-sensitive', () => {
      const original = getOriginalPlanetName('sun')
      // If not found, returns original
      expect(original).toBe('sun')
    })
  })

  describe('Integration tests', () => {
    it('should round-trip sign localization', () => {
      const enSign = 'Aries'
      const koSign = localizeSignLabel(enSign, 'ko')
      const backToEn = localizeSignLabel(koSign, 'en')
      expect(backToEn).toBe(enSign)
    })

    it('should round-trip planet localization', () => {
      const enPlanet = 'Sun'
      const koPlanet = localizePlanetLabel(enPlanet, 'ko')
      const original = getOriginalPlanetName(koPlanet)
      expect(original).toBe(enPlanet)
    })

    it('should handle AM/PM time correctly', () => {
      const times = [
        { input: '12:00 AM', h: 0, m: 0 },
        { input: '1:00 AM', h: 1, m: 0 },
        { input: '11:59 AM', h: 11, m: 59 },
        { input: '12:00 PM', h: 12, m: 0 },
        { input: '1:00 PM', h: 13, m: 0 },
        { input: '11:59 PM', h: 23, m: 59 },
      ]

      times.forEach(({ input, h, m }) => {
        const result = parseHM(input)
        expect(result.h).toBe(h)
        expect(result.m).toBe(m)
      })
    })

    it('should normalize and pick labels consistently', () => {
      const locale1 = normalizeLocale('ko-KR')
      const locale2 = normalizeLocale('ko')
      const labels1 = pickLabels('ko-KR')
      const labels2 = pickLabels('ko')

      expect(locale1).toBe(locale2)
      expect(labels1).toEqual(labels2)
    })
  })
})
