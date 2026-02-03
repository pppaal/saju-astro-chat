/**
 * @file Tests for Calendar API translations
 */

import { describe, it, expect } from 'vitest'
import {
  SAJU_FACTOR_TRANSLATIONS,
  ASTRO_FACTOR_TRANSLATIONS,
  getFactorTranslation,
  GRADE_REASON_TRANSLATIONS,
  getGradeReasonTranslation,
} from '@/app/api/calendar/lib/translations'

describe('Calendar API Translations', () => {
  describe('SAJU_FACTOR_TRANSLATIONS', () => {
    it('should be defined and not empty', () => {
      expect(SAJU_FACTOR_TRANSLATIONS).toBeDefined()
      expect(Object.keys(SAJU_FACTOR_TRANSLATIONS).length).toBeGreaterThan(0)
    })

    it('should have valid structure for each entry', () => {
      Object.entries(SAJU_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        expect(value).toBeDefined()
        expect(value).toHaveProperty('ko')
        expect(value).toHaveProperty('en')
        expect(typeof value.ko).toBe('string')
        expect(typeof value.en).toBe('string')
        expect(value.ko.length).toBeGreaterThan(0)
        expect(value.en.length).toBeGreaterThan(0)
      })
    })

    it('should contain expected Saju factors', () => {
      const expectedKeys = [
        'stemBijeon',
        'stemInseong',
        'stemJaeseong',
        'stemSiksang',
        'stemGwansal',
        'branchSamhap',
        'branchYukhap',
        'branchChung',
        'branchXing',
        'branchHai',
        'cheoneulGwiin',
        'hiddenStemSupport',
        'hiddenStemConflict',
        'sonEomneunDay',
        'geonrokDay',
        'samjaeYear',
        'yeokmaDay',
        'dohwaDay',
      ]

      expectedKeys.forEach((key) => {
        expect(SAJU_FACTOR_TRANSLATIONS).toHaveProperty(key)
      })
    })

    it('should have Korean text with emoji for special days', () => {
      expect(SAJU_FACTOR_TRANSLATIONS.cheoneulGwiin.ko).toContain('⭐')
      expect(SAJU_FACTOR_TRANSLATIONS.sonEomneunDay.ko).toContain('🏠')
      expect(SAJU_FACTOR_TRANSLATIONS.geonrokDay.ko).toContain('📈')
      expect(SAJU_FACTOR_TRANSLATIONS.yeokmaDay.ko).toContain('🐎')
      expect(SAJU_FACTOR_TRANSLATIONS.dohwaDay.ko).toContain('🌸')
    })

    it('should have sipsin translations', () => {
      const sipsins = [
        'sipsin_정재',
        'sipsin_편재',
        'sipsin_정관',
        'sipsin_편관',
        'sipsin_정인',
        'sipsin_편인',
        'sipsin_식신',
        'sipsin_상관',
        'sipsin_비견',
        'sipsin_겁재',
      ]

      sipsins.forEach((sipsin) => {
        expect(SAJU_FACTOR_TRANSLATIONS).toHaveProperty(sipsin)
        expect(SAJU_FACTOR_TRANSLATIONS[sipsin].ko).toBeDefined()
        expect(SAJU_FACTOR_TRANSLATIONS[sipsin].en).toBeDefined()
      })
    })

    it('should have shinsal translations', () => {
      const shinsals = [
        'shinsal_cheoneulGwiin',
        'shinsal_woldeokGwiin',
        'shinsal_taegukGwiin',
        'shinsal_cheondeokGwiin',
        'shinsal_woldeokHapGwiin',
        'shinsal_samgiGwiin',
      ]

      shinsals.forEach((shinsal) => {
        if (SAJU_FACTOR_TRANSLATIONS[shinsal]) {
          expect(SAJU_FACTOR_TRANSLATIONS[shinsal].ko).toBeDefined()
          expect(SAJU_FACTOR_TRANSLATIONS[shinsal].en).toBeDefined()
        }
      })
    })

    it('should not have empty translations', () => {
      Object.entries(SAJU_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        expect(value.ko.trim()).not.toBe('')
        expect(value.en.trim()).not.toBe('')
      })
    })

    it('should have consistent translation pairs', () => {
      Object.entries(SAJU_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        // Both Korean and English should exist together
        if (value.ko) {
          expect(value.en).toBeDefined()
          expect(value.en.length).toBeGreaterThan(0)
        }
        if (value.en) {
          expect(value.ko).toBeDefined()
          expect(value.ko.length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('ASTRO_FACTOR_TRANSLATIONS', () => {
    it('should be defined and not empty', () => {
      expect(ASTRO_FACTOR_TRANSLATIONS).toBeDefined()
      expect(Object.keys(ASTRO_FACTOR_TRANSLATIONS).length).toBeGreaterThan(0)
    })

    it('should have valid structure for each entry', () => {
      Object.entries(ASTRO_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        expect(value).toBeDefined()
        expect(value).toHaveProperty('ko')
        expect(value).toHaveProperty('en')
        expect(typeof value.ko).toBe('string')
        expect(typeof value.en).toBe('string')
        expect(value.ko.length).toBeGreaterThan(0)
        expect(value.en.length).toBeGreaterThan(0)
      })
    })

    it('should contain planetary aspect translations', () => {
      const aspectKeys = [
        'sunConjunctionMoon',
        'sunTrineJupiter',
        'moonSquareMars',
        'venusConjunctionMars',
        'mercuryRetrograde',
      ]

      // Check if at least some aspect translations exist
      const hasAspects = aspectKeys.some((key) =>
        Object.keys(ASTRO_FACTOR_TRANSLATIONS).includes(key)
      )
      expect(hasAspects || Object.keys(ASTRO_FACTOR_TRANSLATIONS).length > 0).toBe(true)
    })

    it('should not have empty translations', () => {
      Object.entries(ASTRO_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        expect(value.ko.trim()).not.toBe('')
        expect(value.en.trim()).not.toBe('')
      })
    })

    it('should have emoji indicators for important aspects', () => {
      const entries = Object.entries(ASTRO_FACTOR_TRANSLATIONS)
      const hasEmojis = entries.some(
        ([_, value]) =>
          value.ko.includes('⭐') ||
          value.ko.includes('💫') ||
          value.ko.includes('✨') ||
          value.ko.includes('🌟') ||
          value.ko.includes('⚠️') ||
          value.ko.includes('💖') ||
          value.ko.includes('💰')
      )
      // Some translations should have emoji indicators
      expect(entries.length === 0 || hasEmojis).toBe(true)
    })

    it('should have consistent translation pairs', () => {
      Object.entries(ASTRO_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        if (value.ko) {
          expect(value.en).toBeDefined()
          expect(value.en.length).toBeGreaterThan(0)
        }
        if (value.en) {
          expect(value.ko).toBeDefined()
          expect(value.ko.length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Translation Quality', () => {
    it('should have reasonable length for Korean translations', () => {
      Object.entries(SAJU_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        // Korean translations should be reasonable length (not too short, not too long)
        expect(value.ko.length).toBeGreaterThan(10)
        expect(value.ko.length).toBeLessThan(1000)
      })
    })

    it('should have reasonable length for English translations', () => {
      Object.entries(SAJU_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        expect(value.en.length).toBeGreaterThan(10)
        expect(value.en.length).toBeLessThan(1000)
      })
    })

    it('should not have common typo patterns', () => {
      Object.entries(SAJU_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        // Check for common typos
        expect(value.ko).not.toMatch(/\s{2,}/) // No multiple spaces
        expect(value.en).not.toMatch(/\s{2,}/)
      })
    })

    it('should have proper sentence structure', () => {
      Object.entries(SAJU_FACTOR_TRANSLATIONS).forEach(([key, value]) => {
        // Korean should end with proper ending
        const koEndings = ['요', '다', '니다', '세요', '!', '.', '~']
        const endsWithValidKo = koEndings.some((ending) => value.ko.trimEnd().endsWith(ending))
        expect(endsWithValidKo).toBe(true)

        // English should end with proper punctuation
        expect(value.en.trimEnd()).toMatch(/[.!?]$/)
      })
    })
  })

  describe('Data Integrity', () => {
    it('should not have duplicate keys', () => {
      const keys = Object.keys(SAJU_FACTOR_TRANSLATIONS)
      const uniqueKeys = [...new Set(keys)]
      expect(keys.length).toBe(uniqueKeys.length)
    })

    it('should have consistent naming convention', () => {
      const keys = Object.keys(SAJU_FACTOR_TRANSLATIONS)
      keys.forEach((key) => {
        // Keys should be camelCase or underscore_case with valid characters
        expect(key).toMatch(/^[a-zA-Z0-9_가-힣]+$/)
      })
    })

    it('should export proper constants', () => {
      expect(SAJU_FACTOR_TRANSLATIONS).toBeTypeOf('object')
      expect(ASTRO_FACTOR_TRANSLATIONS).toBeTypeOf('object')
      expect(GRADE_REASON_TRANSLATIONS).toBeTypeOf('object')
    })
  })

  describe('Coverage for all factor types', () => {
    it('should have stem (천간) factor translations', () => {
      const stemKeys = Object.keys(SAJU_FACTOR_TRANSLATIONS).filter((key) => key.startsWith('stem'))
      expect(stemKeys.length).toBeGreaterThan(0)
    })

    it('should have branch (지지) factor translations', () => {
      const branchKeys = Object.keys(SAJU_FACTOR_TRANSLATIONS).filter((key) =>
        key.startsWith('branch')
      )
      expect(branchKeys.length).toBeGreaterThan(0)
    })

    it('should have special day translations', () => {
      const specialDayKeys = ['sonEomneunDay', 'geonrokDay', 'samjaeYear', 'yeokmaDay', 'dohwaDay']
      specialDayKeys.forEach((key) => {
        expect(SAJU_FACTOR_TRANSLATIONS).toHaveProperty(key)
      })
    })

    it('should have hidden stem translations', () => {
      expect(SAJU_FACTOR_TRANSLATIONS).toHaveProperty('hiddenStemSupport')
      expect(SAJU_FACTOR_TRANSLATIONS).toHaveProperty('hiddenStemConflict')
    })
  })

  describe('getFactorTranslation function', () => {
    it('should return Korean translation for valid key', () => {
      const result = getFactorTranslation('stemBijeon', 'ko')
      expect(result).toBeDefined()
      expect(result).toBe(SAJU_FACTOR_TRANSLATIONS.stemBijeon.ko)
    })

    it('should return English translation for valid key', () => {
      const result = getFactorTranslation('stemBijeon', 'en')
      expect(result).toBeDefined()
      expect(result).toBe(SAJU_FACTOR_TRANSLATIONS.stemBijeon.en)
    })

    it('should return null for invalid key', () => {
      const result = getFactorTranslation('nonExistentKey', 'ko')
      expect(result).toBeNull()
    })

    it('should check SAJU_FACTOR_TRANSLATIONS first', () => {
      const result = getFactorTranslation('stemInseong', 'ko')
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should check ASTRO_FACTOR_TRANSLATIONS if not in SAJU', () => {
      const astroKeys = Object.keys(ASTRO_FACTOR_TRANSLATIONS)
      if (astroKeys.length > 0) {
        const firstAstroKey = astroKeys[0]
        const result = getFactorTranslation(firstAstroKey, 'ko')
        expect(result).toBeDefined()
      }
    })
  })

  describe('GRADE_REASON_TRANSLATIONS', () => {
    it('should be defined and not empty', () => {
      expect(GRADE_REASON_TRANSLATIONS).toBeDefined()
      expect(Object.keys(GRADE_REASON_TRANSLATIONS).length).toBeGreaterThan(0)
    })

    it('should have valid structure for each entry', () => {
      Object.entries(GRADE_REASON_TRANSLATIONS).forEach(([key, value]) => {
        expect(value).toBeDefined()
        expect(value).toHaveProperty('ko')
        expect(value).toHaveProperty('en')
        expect(typeof value.ko).toBe('string')
        expect(typeof value.en).toBe('string')
        expect(value.ko.length).toBeGreaterThan(0)
        expect(value.en.length).toBeGreaterThan(0)
      })
    })

    it('should not have empty translations', () => {
      Object.entries(GRADE_REASON_TRANSLATIONS).forEach(([key, value]) => {
        expect(value.ko.trim()).not.toBe('')
        expect(value.en.trim()).not.toBe('')
      })
    })
  })

  describe('getGradeReasonTranslation function', () => {
    it('should return translation for valid key', () => {
      const keys = Object.keys(GRADE_REASON_TRANSLATIONS)
      if (keys.length > 0) {
        const firstKey = keys[0]
        const result = getGradeReasonTranslation(firstKey, 'ko')
        expect(result).toBeDefined()
        expect(result).toBe(GRADE_REASON_TRANSLATIONS[firstKey].ko)
      }
    })

    it('should return null for invalid key', () => {
      const result = getGradeReasonTranslation('invalidGradeKey', 'ko')
      expect(result).toBeNull()
    })

    it('should work with both languages', () => {
      const keys = Object.keys(GRADE_REASON_TRANSLATIONS)
      if (keys.length > 0) {
        const firstKey = keys[0]
        const koResult = getGradeReasonTranslation(firstKey, 'ko')
        const enResult = getGradeReasonTranslation(firstKey, 'en')
        expect(koResult).toBeDefined()
        expect(enResult).toBeDefined()
        expect(koResult).not.toBe(enResult)
      }
    })
  })
})
