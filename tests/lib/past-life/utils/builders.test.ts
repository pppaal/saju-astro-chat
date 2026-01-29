import { describe, it, expect } from 'vitest'
import {
  buildSoulPattern,
  buildPastLife,
  buildSoulJourney,
  buildSaturnLesson,
  extractTalentsCarried,
  buildThisLifeMission,
} from '@/lib/past-life/utils/builders'

describe('Past Life Builders', () => {
  describe('buildSoulPattern()', () => {
    it('should build soul pattern for valid geokguk type in Korean', () => {
      const result = buildSoulPattern('종왕격', true)

      expect(result).toBeDefined()
      expect(result.type).toBeDefined()
      expect(result.emoji).toBeDefined()
      expect(result.title).toBeDefined()
      expect(result.description).toBeDefined()
      expect(result.traits).toBeInstanceOf(Array)
      expect(result.traits.length).toBeGreaterThan(0)
    })

    it('should build soul pattern for valid geokguk type in English', () => {
      const result = buildSoulPattern('종왕격', false)

      expect(result).toBeDefined()
      expect(result.type).toBeDefined()
      expect(result.emoji).toBeDefined()
      expect(result.title).toBeDefined()
      expect(result.description).toBeDefined()
      expect(result.traits).toBeInstanceOf(Array)
      expect(result.traits.length).toBeGreaterThan(0)
    })

    it('should return default values for null geokguk type', () => {
      const result = buildSoulPattern(null, true)

      expect(result).toBeDefined()
      expect(result.type).toBeDefined()
      expect(result.emoji).toBeDefined()
      expect(result.title).toBeDefined()
      expect(result.description).toBeDefined()
      expect(result.traits).toBeInstanceOf(Array)
    })

    it('should return different languages for Korean vs English', () => {
      const koResult = buildSoulPattern('종왕격', true)
      const enResult = buildSoulPattern('종왕격', false)

      // Type should be different for different languages
      expect(koResult.type).not.toBe(enResult.type)
    })

    it('should handle all standard geokguk types', () => {
      const geokgukTypes = ['종왕격', '종강격', '종아격', '종재격', '종살격'] as const

      geokgukTypes.forEach((type) => {
        const result = buildSoulPattern(type, true)
        expect(result).toBeDefined()
        expect(result.emoji).toBeDefined()
      })
    })

    it('should return array of traits for Korean', () => {
      const result = buildSoulPattern('종왕격', true)
      expect(Array.isArray(result.traits)).toBe(true)
      result.traits.forEach((trait) => {
        expect(typeof trait).toBe('string')
      })
    })

    it('should return array of traits for English', () => {
      const result = buildSoulPattern('종왕격', false)
      expect(Array.isArray(result.traits)).toBe(true)
      result.traits.forEach((trait) => {
        expect(typeof trait).toBe('string')
      })
    })
  })

  describe('buildPastLife()', () => {
    it('should build past life for valid geokguk type in Korean', () => {
      const result = buildPastLife('종왕격', true)

      expect(result).toBeDefined()
      expect(result.likely).toBeDefined()
      expect(result.talents).toBeDefined()
      expect(result.lessons).toBeDefined()
      expect(typeof result.likely).toBe('string')
      expect(typeof result.talents).toBe('string')
      expect(typeof result.lessons).toBe('string')
    })

    it('should build past life for valid geokguk type in English', () => {
      const result = buildPastLife('종왕격', false)

      expect(result).toBeDefined()
      expect(result.likely).toBeDefined()
      expect(result.talents).toBeDefined()
      expect(result.lessons).toBeDefined()
    })

    it('should return fallback for null geokguk type', () => {
      const result = buildPastLife(null, true)

      expect(result).toBeDefined()
      expect(result.likely).toBeDefined()
      expect(result.talents).toBeDefined()
      expect(result.lessons).toBeDefined()
    })

    it('should include era when available', () => {
      const result = buildPastLife('종왕격', true)

      // Era is optional, so we just check it's either string or undefined
      if (result.era !== undefined) {
        expect(typeof result.era).toBe('string')
      }
    })

    it('should return different content for different languages', () => {
      const koResult = buildPastLife('종왕격', true)
      const enResult = buildPastLife('종왕격', false)

      expect(koResult.likely).not.toBe(enResult.likely)
    })

    it('should handle all geokguk types', () => {
      const geokgukTypes = ['종왕격', '종강격', '종아격', '종재격', '종살격'] as const

      geokgukTypes.forEach((type) => {
        const result = buildPastLife(type, true)
        expect(result).toBeDefined()
        expect(result.likely).toBeDefined()
      })
    })
  })

  describe('buildSoulJourney()', () => {
    it('should build soul journey for valid north node house in Korean', () => {
      const result = buildSoulJourney(1, true)

      expect(result).toBeDefined()
      expect(result.pastPattern).toBeDefined()
      expect(result.releasePattern).toBeDefined()
      expect(result.currentDirection).toBeDefined()
      expect(result.lessonToLearn).toBeDefined()
    })

    it('should build soul journey for valid north node house in English', () => {
      const result = buildSoulJourney(1, false)

      expect(result).toBeDefined()
      expect(result.pastPattern).toBeDefined()
      expect(result.releasePattern).toBeDefined()
      expect(result.currentDirection).toBeDefined()
      expect(result.lessonToLearn).toBeDefined()
    })

    it('should return fallback for null house', () => {
      const result = buildSoulJourney(null, true)

      expect(result).toBeDefined()
      expect(result.pastPattern).toBeDefined()
      expect(result.releasePattern).toBeDefined()
      expect(result.currentDirection).toBeDefined()
      expect(result.lessonToLearn).toBeDefined()
    })

    it('should handle all 12 houses', () => {
      for (let house = 1; house <= 12; house++) {
        const result = buildSoulJourney(house as any, true)
        expect(result).toBeDefined()
        expect(result.pastPattern).toBeDefined()
        expect(result.lessonToLearn).toBeDefined()
      }
    })

    it('should return different content for Korean vs English', () => {
      const koResult = buildSoulJourney(1, true)
      const enResult = buildSoulJourney(1, false)

      expect(koResult.pastPattern).not.toBe(enResult.pastPattern)
    })

    it('should have all required fields', () => {
      const result = buildSoulJourney(5, true)

      expect(result).toHaveProperty('pastPattern')
      expect(result).toHaveProperty('releasePattern')
      expect(result).toHaveProperty('currentDirection')
      expect(result).toHaveProperty('lessonToLearn')
    })
  })

  describe('buildSaturnLesson()', () => {
    it('should build Saturn lesson for valid house in Korean', () => {
      const result = buildSaturnLesson(1, true)

      expect(result).toBeDefined()
      expect(result.lesson).toBeDefined()
      expect(result.challenge).toBeDefined()
      expect(result.mastery).toBeDefined()
    })

    it('should build Saturn lesson for valid house in English', () => {
      const result = buildSaturnLesson(1, false)

      expect(result).toBeDefined()
      expect(result.lesson).toBeDefined()
      expect(result.challenge).toBeDefined()
      expect(result.mastery).toBeDefined()
    })

    it('should return fallback for null house', () => {
      const result = buildSaturnLesson(null, true)

      expect(result).toBeDefined()
      expect(result.lesson).toBeDefined()
      expect(result.challenge).toBeDefined()
      expect(result.mastery).toBeDefined()
    })

    it('should mention Saturn return ages in fallback challenge (Korean)', () => {
      const result = buildSaturnLesson(null, true)

      expect(result.challenge).toContain('세')
    })

    it('should mention Saturn return ages in fallback challenge (English)', () => {
      const result = buildSaturnLesson(null, false)

      expect(result.challenge.toLowerCase()).toContain('age')
    })

    it('should handle all 12 houses', () => {
      for (let house = 1; house <= 12; house++) {
        const result = buildSaturnLesson(house as any, true)
        expect(result).toBeDefined()
        expect(result.lesson).toBeDefined()
      }
    })

    it('should return different content for different languages', () => {
      const koResult = buildSaturnLesson(3, true)
      const enResult = buildSaturnLesson(3, false)

      expect(koResult.lesson).not.toBe(enResult.lesson)
    })
  })

  describe('extractTalentsCarried()', () => {
    it('should extract talents and return array for valid geokguk type in Korean', () => {
      const talents = extractTalentsCarried('종왕격', true)

      expect(Array.isArray(talents)).toBe(true)
      // May return empty array if no talents are defined for this type
      if (talents.length > 0) {
        talents.forEach((talent) => {
          expect(typeof talent).toBe('string')
        })
      }
    })

    it('should extract talents and return array for valid geokguk type in English', () => {
      const talents = extractTalentsCarried('종왕격', false)

      expect(Array.isArray(talents)).toBe(true)
      // May return empty array if no talents are defined for this type
    })

    it('should return default talents for null geokguk type', () => {
      const talents = extractTalentsCarried(null, true)

      expect(Array.isArray(talents)).toBe(true)
      expect(talents.length).toBeGreaterThan(0)
    })

    it('should return array (may be different) for different languages', () => {
      const koTalents = extractTalentsCarried(null, true)
      const enTalents = extractTalentsCarried(null, false)

      // Both should be arrays
      expect(Array.isArray(koTalents)).toBe(true)
      expect(Array.isArray(enTalents)).toBe(true)
      // Default talents should exist for both languages
      expect(koTalents.length).toBeGreaterThan(0)
      expect(enTalents.length).toBeGreaterThan(0)
    })

    it('should handle all geokguk types', () => {
      const geokgukTypes = ['종왕격', '종강격', '종아격', '종재격', '종살격'] as const

      geokgukTypes.forEach((type) => {
        const talents = extractTalentsCarried(type, true)
        expect(Array.isArray(talents)).toBe(true)
      })
    })

    it('should return non-empty array for default case', () => {
      const talents = extractTalentsCarried(null, true)
      expect(talents.length).toBeGreaterThan(0)
    })

    it('should return string values when talents exist', () => {
      const talents = extractTalentsCarried(null, true) // Use null to get default talents
      expect(talents.length).toBeGreaterThan(0)
      talents.forEach((talent) => {
        expect(typeof talent).toBe('string')
        expect(talent.length).toBeGreaterThan(0)
      })
    })
  })

  describe('buildThisLifeMission()', () => {
    it('should build mission for valid day master in Korean', () => {
      const result = buildThisLifeMission('甲', true)

      expect(result).toBeDefined()
      expect(result.core).toBeDefined()
      expect(result.expression).toBeDefined()
      expect(result.fulfillment).toBeDefined()
    })

    it('should build mission for valid day master in English', () => {
      const result = buildThisLifeMission('甲', false)

      expect(result).toBeDefined()
      expect(result.core).toBeDefined()
      expect(result.expression).toBeDefined()
      expect(result.fulfillment).toBeDefined()
    })

    it('should return fallback for null day master', () => {
      const result = buildThisLifeMission(null, true)

      expect(result).toBeDefined()
      expect(result.core).toBeDefined()
      expect(result.expression).toBeDefined()
      expect(result.fulfillment).toBeDefined()
    })

    it('should handle all 10 heavenly stems', () => {
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const

      stems.forEach((stem) => {
        const result = buildThisLifeMission(stem, true)
        expect(result).toBeDefined()
        expect(result.core).toBeDefined()
      })
    })

    it('should return different content for different languages', () => {
      const koResult = buildThisLifeMission('甲', true)
      const enResult = buildThisLifeMission('甲', false)

      expect(koResult.core).not.toBe(enResult.core)
    })

    it('should have all required fields', () => {
      const result = buildThisLifeMission('丙', true)

      expect(result).toHaveProperty('core')
      expect(result).toHaveProperty('expression')
      expect(result).toHaveProperty('fulfillment')
    })

    it('should return non-empty strings', () => {
      const result = buildThisLifeMission('庚', false)

      expect(result.core.length).toBeGreaterThan(0)
      expect(result.expression.length).toBeGreaterThan(0)
      expect(result.fulfillment.length).toBeGreaterThan(0)
    })
  })

  describe('Cross-function consistency', () => {
    it('should maintain language consistency across all builders', () => {
      const isKo = true

      const soulPattern = buildSoulPattern('종왕격', isKo)
      const pastLife = buildPastLife('종왕격', isKo)
      const soulJourney = buildSoulJourney(1, isKo)
      const saturnLesson = buildSaturnLesson(1, isKo)
      const talents = extractTalentsCarried('종왕격', isKo)
      const mission = buildThisLifeMission('甲', isKo)

      // All should return defined values
      expect(soulPattern).toBeDefined()
      expect(pastLife).toBeDefined()
      expect(soulJourney).toBeDefined()
      expect(saturnLesson).toBeDefined()
      expect(talents).toBeDefined()
      expect(mission).toBeDefined()
    })

    it('should handle all null inputs gracefully', () => {
      const soulPattern = buildSoulPattern(null, true)
      const pastLife = buildPastLife(null, true)
      const soulJourney = buildSoulJourney(null, true)
      const saturnLesson = buildSaturnLesson(null, true)
      const talents = extractTalentsCarried(null, true)
      const mission = buildThisLifeMission(null, true)

      // All should have fallback values
      expect(soulPattern.type).toBeDefined()
      expect(pastLife.likely).toBeDefined()
      expect(soulJourney.pastPattern).toBeDefined()
      expect(saturnLesson.lesson).toBeDefined()
      expect(talents.length).toBeGreaterThan(0)
      expect(mission.core).toBeDefined()
    })

    it('should return consistent structure regardless of input', () => {
      const validResult = buildSoulPattern('종왕격', true)
      const nullResult = buildSoulPattern(null, true)

      // Both should have same structure
      expect(Object.keys(validResult).sort()).toEqual(Object.keys(nullResult).sort())
    })
  })

  describe('Edge cases', () => {
    it('should handle invalid house numbers gracefully', () => {
      const result1 = buildSoulJourney(0 as any, true)
      const result2 = buildSoulJourney(13 as any, true)
      const result3 = buildSoulJourney(-1 as any, true)

      // Should return fallback
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result3).toBeDefined()
    })

    it('should handle invalid geokguk types gracefully', () => {
      const result = buildSoulPattern('invalid' as any, true)
      expect(result).toBeDefined()
      expect(result.type).toBeDefined()
    })

    it('should handle invalid heavenly stems gracefully', () => {
      const result = buildThisLifeMission('invalid' as any, true)
      expect(result).toBeDefined()
      expect(result.core).toBeDefined()
    })
  })
})
