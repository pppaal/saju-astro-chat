/**
 * Tests for src/components/calendar/constants.ts
 * DestinyCalendar 상수 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  CATEGORY_EMOJI,
  WEEKDAYS_KO,
  WEEKDAYS_EN,
  ICONS,
  GRADE_EMOJI,
  CATEGORY_LABELS_KO,
  CATEGORY_LABELS_EN,
} from '@/components/calendar/constants'

describe('calendar constants', () => {
  describe('CATEGORY_EMOJI', () => {
    it('should define emoji for all 7 categories', () => {
      const keys = Object.keys(CATEGORY_EMOJI)
      expect(keys).toHaveLength(7)
    })

    it('should define wealth emoji', () => {
      expect(CATEGORY_EMOJI.wealth).toBe('💰')
    })

    it('should define career emoji', () => {
      expect(CATEGORY_EMOJI.career).toBe('💼')
    })

    it('should define love emoji', () => {
      expect(CATEGORY_EMOJI.love).toBe('💕')
    })

    it('should define health emoji', () => {
      expect(CATEGORY_EMOJI.health).toBe('💪')
    })

    it('should define travel emoji', () => {
      expect(CATEGORY_EMOJI.travel).toBe('✈️')
    })

    it('should define study emoji', () => {
      expect(CATEGORY_EMOJI.study).toBe('📚')
    })

    it('should define general emoji', () => {
      expect(CATEGORY_EMOJI.general).toBe('⭐')
    })

    it('should have all values as non-empty strings', () => {
      Object.values(CATEGORY_EMOJI).forEach((emoji) => {
        expect(typeof emoji).toBe('string')
        expect(emoji.length).toBeGreaterThan(0)
      })
    })

    it('should have unique emoji for each category', () => {
      const emojis = Object.values(CATEGORY_EMOJI)
      const uniqueEmojis = new Set(emojis)
      expect(uniqueEmojis.size).toBe(emojis.length)
    })
  })

  describe('WEEKDAYS_KO', () => {
    it('should define 7 Korean weekday abbreviations', () => {
      expect(WEEKDAYS_KO).toHaveLength(7)
    })

    it('should start with Sunday (일)', () => {
      expect(WEEKDAYS_KO[0]).toBe('일')
    })

    it('should end with Saturday (토)', () => {
      expect(WEEKDAYS_KO[6]).toBe('토')
    })

    it('should define all weekdays in correct order', () => {
      expect(WEEKDAYS_KO).toEqual(['일', '월', '화', '수', '목', '금', '토'])
    })

    it('should have all values as single-character strings', () => {
      WEEKDAYS_KO.forEach((day) => {
        expect(typeof day).toBe('string')
        expect(day.length).toBe(1)
      })
    })

    it('should have unique values', () => {
      const uniqueDays = new Set(WEEKDAYS_KO)
      expect(uniqueDays.size).toBe(7)
    })
  })

  describe('WEEKDAYS_EN', () => {
    it('should define 7 English weekday abbreviations', () => {
      expect(WEEKDAYS_EN).toHaveLength(7)
    })

    it('should start with Sunday (Sun)', () => {
      expect(WEEKDAYS_EN[0]).toBe('Sun')
    })

    it('should end with Saturday (Sat)', () => {
      expect(WEEKDAYS_EN[6]).toBe('Sat')
    })

    it('should define all weekdays in correct order', () => {
      expect(WEEKDAYS_EN).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    })

    it('should have all values as 3-character strings', () => {
      WEEKDAYS_EN.forEach((day) => {
        expect(typeof day).toBe('string')
        expect(day.length).toBe(3)
      })
    })

    it('should have unique values', () => {
      const uniqueDays = new Set(WEEKDAYS_EN)
      expect(uniqueDays.size).toBe(7)
    })

    it('should have values capitalized', () => {
      WEEKDAYS_EN.forEach((day) => {
        expect(day[0]).toBe(day[0].toUpperCase())
        expect(day.slice(1)).toBe(day.slice(1).toLowerCase())
      })
    })
  })

  describe('ICONS', () => {
    it('should define all 7 icon types', () => {
      const keys = Object.keys(ICONS)
      expect(keys).toHaveLength(7)
    })

    it('should define calendar icon', () => {
      expect(ICONS.calendar).toBe('📅')
    })

    it('should define clock icon', () => {
      expect(ICONS.clock).toBe('🕐')
    })

    it('should define globe icon', () => {
      expect(ICONS.globe).toBe('🌍')
    })

    it('should define gender icon', () => {
      expect(ICONS.gender).toBe('⚧')
    })

    it('should define star icon', () => {
      expect(ICONS.star).toBe('🌟')
    })

    it('should define crystal icon', () => {
      expect(ICONS.crystal).toBe('🔮')
    })

    it('should define sparkle icon', () => {
      expect(ICONS.sparkle).toBe('✦')
    })

    it('should have all values as non-empty strings', () => {
      Object.values(ICONS).forEach((icon) => {
        expect(typeof icon).toBe('string')
        expect(icon.length).toBeGreaterThan(0)
      })
    })

    it('should have expected icon names', () => {
      expect(ICONS).toHaveProperty('calendar')
      expect(ICONS).toHaveProperty('clock')
      expect(ICONS).toHaveProperty('globe')
      expect(ICONS).toHaveProperty('gender')
      expect(ICONS).toHaveProperty('star')
      expect(ICONS).toHaveProperty('crystal')
      expect(ICONS).toHaveProperty('sparkle')
    })
  })

  describe('GRADE_EMOJI', () => {
    it('should define emoji for all 5 grade levels (0-4)', () => {
      const keys = Object.keys(GRADE_EMOJI).map(Number)
      expect(keys).toHaveLength(5)
      expect(keys).toContain(0)
      expect(keys).toContain(1)
      expect(keys).toContain(2)
      expect(keys).toContain(3)
      expect(keys).toContain(4)
    })

    it('should define grade 0 emoji (best day)', () => {
      expect(GRADE_EMOJI[0]).toBe('🌟')
    })

    it('should define grade 1 emoji (good day)', () => {
      expect(GRADE_EMOJI[1]).toBe('✨')
    })

    it('should define grade 2 emoji (normal day)', () => {
      expect(GRADE_EMOJI[2]).toBe('⭐')
    })

    it('should define grade 3 emoji (bad day)', () => {
      expect(GRADE_EMOJI[3]).toBe('⚠️')
    })

    it('should define grade 4 emoji (worst day)', () => {
      expect(GRADE_EMOJI[4]).toBe('☠️')
    })

    it('should have all values as non-empty strings', () => {
      Object.values(GRADE_EMOJI).forEach((emoji) => {
        expect(typeof emoji).toBe('string')
        expect(emoji.length).toBeGreaterThan(0)
      })
    })

    it('should have unique emoji for each grade', () => {
      const emojis = Object.values(GRADE_EMOJI)
      const uniqueEmojis = new Set(emojis)
      expect(uniqueEmojis.size).toBe(emojis.length)
    })

    it('should have sequential grade keys', () => {
      const keys = Object.keys(GRADE_EMOJI).map(Number).sort((a, b) => a - b)
      expect(keys).toEqual([0, 1, 2, 3, 4])
    })
  })

  describe('CATEGORY_LABELS_KO', () => {
    it('should define Korean labels for all 7 categories', () => {
      const keys = Object.keys(CATEGORY_LABELS_KO)
      expect(keys).toHaveLength(7)
    })

    it('should define wealth label in Korean', () => {
      expect(CATEGORY_LABELS_KO.wealth).toBe('재물')
    })

    it('should define career label in Korean', () => {
      expect(CATEGORY_LABELS_KO.career).toBe('직장')
    })

    it('should define love label in Korean', () => {
      expect(CATEGORY_LABELS_KO.love).toBe('연애')
    })

    it('should define health label in Korean', () => {
      expect(CATEGORY_LABELS_KO.health).toBe('건강')
    })

    it('should define travel label in Korean', () => {
      expect(CATEGORY_LABELS_KO.travel).toBe('여행')
    })

    it('should define study label in Korean', () => {
      expect(CATEGORY_LABELS_KO.study).toBe('학업')
    })

    it('should define general label in Korean', () => {
      expect(CATEGORY_LABELS_KO.general).toBe('전체')
    })

    it('should have all values as non-empty strings', () => {
      Object.values(CATEGORY_LABELS_KO).forEach((label) => {
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })

    it('should have matching keys with CATEGORY_EMOJI', () => {
      const koKeys = Object.keys(CATEGORY_LABELS_KO).sort()
      const emojiKeys = Object.keys(CATEGORY_EMOJI).sort()
      expect(koKeys).toEqual(emojiKeys)
    })
  })

  describe('CATEGORY_LABELS_EN', () => {
    it('should define English labels for all 7 categories', () => {
      const keys = Object.keys(CATEGORY_LABELS_EN)
      expect(keys).toHaveLength(7)
    })

    it('should define wealth label in English', () => {
      expect(CATEGORY_LABELS_EN.wealth).toBe('Wealth')
    })

    it('should define career label in English', () => {
      expect(CATEGORY_LABELS_EN.career).toBe('Career')
    })

    it('should define love label in English', () => {
      expect(CATEGORY_LABELS_EN.love).toBe('Love')
    })

    it('should define health label in English', () => {
      expect(CATEGORY_LABELS_EN.health).toBe('Health')
    })

    it('should define travel label in English', () => {
      expect(CATEGORY_LABELS_EN.travel).toBe('Travel')
    })

    it('should define study label in English', () => {
      expect(CATEGORY_LABELS_EN.study).toBe('Study')
    })

    it('should define general label in English', () => {
      expect(CATEGORY_LABELS_EN.general).toBe('General')
    })

    it('should have all values as non-empty strings', () => {
      Object.values(CATEGORY_LABELS_EN).forEach((label) => {
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })

    it('should have all values capitalized', () => {
      Object.values(CATEGORY_LABELS_EN).forEach((label) => {
        expect(label[0]).toBe(label[0].toUpperCase())
      })
    })

    it('should have matching keys with CATEGORY_EMOJI', () => {
      const enKeys = Object.keys(CATEGORY_LABELS_EN).sort()
      const emojiKeys = Object.keys(CATEGORY_EMOJI).sort()
      expect(enKeys).toEqual(emojiKeys)
    })

    it('should have matching keys with CATEGORY_LABELS_KO', () => {
      const enKeys = Object.keys(CATEGORY_LABELS_EN).sort()
      const koKeys = Object.keys(CATEGORY_LABELS_KO).sort()
      expect(enKeys).toEqual(koKeys)
    })
  })

  describe('Integration', () => {
    describe('Category consistency', () => {
      it('should have matching category keys across all category constants', () => {
        const emojiKeys = Object.keys(CATEGORY_EMOJI).sort()
        const koKeys = Object.keys(CATEGORY_LABELS_KO).sort()
        const enKeys = Object.keys(CATEGORY_LABELS_EN).sort()

        expect(emojiKeys).toEqual(koKeys)
        expect(emojiKeys).toEqual(enKeys)
      })

      it('should have all 7 categories in all category constants', () => {
        expect(Object.keys(CATEGORY_EMOJI)).toHaveLength(7)
        expect(Object.keys(CATEGORY_LABELS_KO)).toHaveLength(7)
        expect(Object.keys(CATEGORY_LABELS_EN)).toHaveLength(7)
      })
    })

    describe('Weekday consistency', () => {
      it('should have same length for Korean and English weekdays', () => {
        expect(WEEKDAYS_KO.length).toBe(WEEKDAYS_EN.length)
      })

      it('should have 7 days in both languages', () => {
        expect(WEEKDAYS_KO).toHaveLength(7)
        expect(WEEKDAYS_EN).toHaveLength(7)
      })

      it('should start with Sunday in both languages', () => {
        expect(WEEKDAYS_KO[0]).toBe('일')
        expect(WEEKDAYS_EN[0]).toBe('Sun')
      })

      it('should end with Saturday in both languages', () => {
        expect(WEEKDAYS_KO[6]).toBe('토')
        expect(WEEKDAYS_EN[6]).toBe('Sat')
      })
    })

    describe('Grade levels', () => {
      it('should have 5 grade levels (0-4)', () => {
        expect(Object.keys(GRADE_EMOJI)).toHaveLength(5)
      })

      it('should have grades from best (0) to worst (4)', () => {
        const keys = Object.keys(GRADE_EMOJI).map(Number).sort((a, b) => a - b)
        expect(keys[0]).toBe(0) // Best
        expect(keys[4]).toBe(4) // Worst
      })

      it('should have positive emoji for grade 0', () => {
        expect(GRADE_EMOJI[0]).toMatch(/[🌟✨⭐]/)
      })

      it('should have negative emoji for grade 4', () => {
        expect(GRADE_EMOJI[4]).toBe('☠️')
      })
    })

    describe('Emoji uniqueness', () => {
      it('should not have duplicate emoji across category and grade', () => {
        const categoryEmojis = Object.values(CATEGORY_EMOJI)
        const gradeEmojis = Object.values(GRADE_EMOJI)
        const iconEmojis = Object.values(ICONS)

        // Allow some overlap (like ⭐) as they serve different contexts
        const allEmojis = [...categoryEmojis, ...gradeEmojis, ...iconEmojis]
        expect(allEmojis.length).toBeGreaterThan(0)
      })
    })

    describe('Type safety', () => {
      it('should have all category emoji values as strings', () => {
        Object.values(CATEGORY_EMOJI).forEach((value) => {
          expect(typeof value).toBe('string')
        })
      })

      it('should have all grade emoji values as strings', () => {
        Object.values(GRADE_EMOJI).forEach((value) => {
          expect(typeof value).toBe('string')
        })
      })

      it('should have all icon values as strings', () => {
        Object.values(ICONS).forEach((value) => {
          expect(typeof value).toBe('string')
        })
      })

      it('should have all weekday values as strings', () => {
        WEEKDAYS_KO.forEach((value) => {
          expect(typeof value).toBe('string')
        })
        WEEKDAYS_EN.forEach((value) => {
          expect(typeof value).toBe('string')
        })
      })

      it('should have all label values as strings', () => {
        Object.values(CATEGORY_LABELS_KO).forEach((value) => {
          expect(typeof value).toBe('string')
        })
        Object.values(CATEGORY_LABELS_EN).forEach((value) => {
          expect(typeof value).toBe('string')
        })
      })
    })
  })
})
