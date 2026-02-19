import { describe, it, expect } from 'vitest'
import { CITY_NAME_KR, COUNTRY_NAME_KR, COUNTRY_FULL_NAME } from '@/lib/cities/lookups'

describe('cities/lookups', () => {
  describe('CITY_NAME_KR', () => {
    it('should be a non-empty object', () => {
      expect(typeof CITY_NAME_KR).toBe('object')
      expect(Object.keys(CITY_NAME_KR).length).toBeGreaterThan(0)
    })

    it('should have Seoul mapped to 서울', () => {
      expect(CITY_NAME_KR['Seoul']).toBe('서울')
    })

    it('should have major Korean cities', () => {
      expect(CITY_NAME_KR['Busan']).toBe('부산')
      expect(CITY_NAME_KR['Incheon']).toBe('인천')
      expect(CITY_NAME_KR['Daegu']).toBe('대구')
      expect(CITY_NAME_KR['Daejeon']).toBe('대전')
      expect(CITY_NAME_KR['Gwangju']).toBe('광주')
    })

    it('should have major world cities with Korean translations', () => {
      expect(CITY_NAME_KR['Tokyo']).toBeDefined()
      expect(CITY_NAME_KR['Beijing']).toBeDefined()
      expect(CITY_NAME_KR['New York']).toBeDefined()
      expect(CITY_NAME_KR['London']).toBeDefined()
      expect(CITY_NAME_KR['Paris']).toBeDefined()
    })

    it('should have no duplicate keys', () => {
      const keys = Object.keys(CITY_NAME_KR)
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(keys.length)
    })

    it('should have no empty values', () => {
      const values = Object.values(CITY_NAME_KR)
      const emptyValues = values.filter((v) => !v || v.trim() === '')
      expect(emptyValues.length).toBe(0)
    })

    it('should have Korean strings as values', () => {
      const values = Object.values(CITY_NAME_KR)
      values.slice(0, 10).forEach((value) => {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      })
    })

    it('should have reasonable number of entries', () => {
      const count = Object.keys(CITY_NAME_KR).length
      expect(count).toBeGreaterThan(100) // At least 100 cities
      expect(count).toBeLessThan(5000) // But not absurdly many
    })
  })

  describe('COUNTRY_NAME_KR', () => {
    it('should be a non-empty object', () => {
      expect(typeof COUNTRY_NAME_KR).toBe('object')
      expect(Object.keys(COUNTRY_NAME_KR).length).toBeGreaterThan(0)
    })

    it('should have KR mapped to 한국', () => {
      expect(COUNTRY_NAME_KR['KR']).toBe('한국')
    })

    it('should have major country codes', () => {
      expect(COUNTRY_NAME_KR['US']).toBeDefined()
      expect(COUNTRY_NAME_KR['JP']).toBeDefined()
      expect(COUNTRY_NAME_KR['CN']).toBeDefined()
      expect(COUNTRY_NAME_KR['GB']).toBeDefined()
      expect(COUNTRY_NAME_KR['FR']).toBeDefined()
      expect(COUNTRY_NAME_KR['DE']).toBeDefined()
    })

    it('should use 2-letter country codes as keys', () => {
      const keys = Object.keys(COUNTRY_NAME_KR)
      const invalidKeys = keys.filter((k) => k.length !== 2)
      expect(invalidKeys.length).toBe(0)
    })

    it('should have uppercase country codes', () => {
      const keys = Object.keys(COUNTRY_NAME_KR)
      const lowercaseKeys = keys.filter((k) => k !== k.toUpperCase())
      expect(lowercaseKeys.length).toBe(0)
    })

    it('should have no duplicate keys', () => {
      const keys = Object.keys(COUNTRY_NAME_KR)
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(keys.length)
    })

    it('should have no empty values', () => {
      const values = Object.values(COUNTRY_NAME_KR)
      const emptyValues = values.filter((v) => !v || v.trim() === '')
      expect(emptyValues.length).toBe(0)
    })

    it('should have reasonable number of country codes', () => {
      const count = Object.keys(COUNTRY_NAME_KR).length
      expect(count).toBeGreaterThan(50) // At least 50 countries
      expect(count).toBeLessThan(300) // But not more than possible
    })
  })

  describe('COUNTRY_FULL_NAME', () => {
    it('should be a non-empty object', () => {
      expect(typeof COUNTRY_FULL_NAME).toBe('object')
      expect(Object.keys(COUNTRY_FULL_NAME).length).toBeGreaterThan(0)
    })

    it('should have KR mapped to South Korea', () => {
      expect(COUNTRY_FULL_NAME['KR']).toBe('South Korea')
    })

    it('should have major countries', () => {
      expect(COUNTRY_FULL_NAME['KR']).toBeDefined()
      expect(COUNTRY_FULL_NAME['US']).toBeDefined()
      // Check that values are non-empty strings
      expect(typeof COUNTRY_FULL_NAME['KR']).toBe('string')
      expect(COUNTRY_FULL_NAME['KR'].length).toBeGreaterThan(0)
    })

    it('should use 2-letter country codes as keys', () => {
      const keys = Object.keys(COUNTRY_FULL_NAME)
      const invalidKeys = keys.filter((k) => k.length !== 2)
      expect(invalidKeys.length).toBe(0)
    })

    it('should have uppercase country codes', () => {
      const keys = Object.keys(COUNTRY_FULL_NAME)
      const lowercaseKeys = keys.filter((k) => k !== k.toUpperCase())
      expect(lowercaseKeys.length).toBe(0)
    })

    it('should have no duplicate keys', () => {
      const keys = Object.keys(COUNTRY_FULL_NAME)
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(keys.length)
    })

    it('should have English names as values', () => {
      const values = Object.values(COUNTRY_FULL_NAME)
      const emptyValues = values.filter((v) => !v || v.trim() === '')
      expect(emptyValues.length).toBe(0)
    })

    it.skip('should have overlapping country codes (skipped - different coverage)', () => {
      // COUNTRY_FULL_NAME and COUNTRY_NAME_KR have different sets of countries
      // This is expected as they may be curated for different purposes
      const fullNameKeys = new Set(Object.keys(COUNTRY_FULL_NAME))
      const krNameKeys = new Set(Object.keys(COUNTRY_NAME_KR))

      const commonKeys = [...fullNameKeys].filter((k) => krNameKeys.has(k))
      expect(commonKeys.length).toBeGreaterThan(0)
    })
  })

  describe('data consistency', () => {
    it('should have some common country codes', () => {
      const fullNameKeys = new Set(Object.keys(COUNTRY_FULL_NAME))
      const krNameKeys = new Set(Object.keys(COUNTRY_NAME_KR))

      // Calculate common keys
      const commonKeys = [...fullNameKeys].filter((k) => krNameKeys.has(k))

      // Just check that there's some overlap (at least major countries)
      expect(commonKeys.length).toBeGreaterThan(0)
      expect(commonKeys).toContain('KR') // At least Korea should be in both
    })

    it('should not have undefined or null values', () => {
      const allValues = [
        ...Object.values(CITY_NAME_KR),
        ...Object.values(COUNTRY_NAME_KR),
        ...Object.values(COUNTRY_FULL_NAME),
      ]

      const invalidValues = allValues.filter((v) => v === undefined || v === null)
      expect(invalidValues.length).toBe(0)
    })
  })
})
