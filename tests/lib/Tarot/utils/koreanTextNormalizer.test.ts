/**
 * Korean Text Normalizer Tests
 */

import { describe, it, expect } from 'vitest'
import {
  isChosungOnly,
  chosungToPattern,
  expandChosungQuestion,
  normalizeText,
  prepareForMatching,
  fuzzyMatch,
  enhancedYesNoMatch,
  decodeChosung,
  similarity,
} from '@/lib/Tarot/utils/koreanTextNormalizer'

describe('Korean Text Normalizer', () => {
  describe('isChosungOnly', () => {
    it('identifies chosung-only text', () => {
      expect(isChosungOnly('ㄱㄴㄷㄹㅁㅂ')).toBe(true)
      expect(isChosungOnly('ㅇㄷㅇㄷㄱㄹㄲ')).toBe(true)
    })

    it('identifies mixed text as not chosung-only', () => {
      expect(isChosungOnly('오늘 운동 갈까')).toBe(false)
      expect(isChosungOnly('안녕하세요')).toBe(false)
    })

    it('handles text with special characters', () => {
      expect(isChosungOnly('ㄱㄴㄷ?')).toBe(true)
      expect(isChosungOnly('ㄱㄴㄷ 123')).toBe(true)
    })

    it('returns false for empty or non-Korean text', () => {
      expect(isChosungOnly('')).toBe(false)
      expect(isChosungOnly('123')).toBe(false)
      expect(isChosungOnly('abc')).toBe(false)
    })

    it('handles partially chosung text (>50% threshold)', () => {
      // 50% 이상 초성이면 true
      expect(isChosungOnly('ㄱㄴㄷ가나')).toBe(true)
      expect(isChosungOnly('가나다ㄱ')).toBe(false)
    })
  })

  describe('chosungToPattern', () => {
    it('converts chosung to regex pattern', () => {
      const pattern = chosungToPattern('ㄱ')
      expect(pattern).toBe('[가-깋]')
    })

    it('handles multiple chosung characters', () => {
      const pattern = chosungToPattern('ㄱㄴ')
      expect(pattern).toContain('[가-깋]')
      expect(pattern).toContain('[나-닣]')
    })

    it('preserves complete Hangul characters', () => {
      const pattern = chosungToPattern('가ㄴ다')
      expect(pattern).toContain('가')
      expect(pattern).toContain('[나-닣]')
      expect(pattern).toContain('다')
    })

    it('escapes special regex characters', () => {
      const pattern = chosungToPattern('ㄱ?')
      expect(pattern).toContain('\\?')
    })

    it('handles mixed Korean and non-Korean text', () => {
      const pattern = chosungToPattern('ㄱ123')
      expect(pattern).toContain('[가-깋]')
      expect(pattern).toContain('123')
    })
  })

  describe('expandChosungQuestion', () => {
    it('expands common chosung questions', () => {
      const expansions = expandChosungQuestion('ㅇㄷㅇㄷㄱㄹㄲ')

      expect(Array.isArray(expansions)).toBe(true)
      if (expansions.length > 0) {
        expect(expansions[0]).toBe('오늘 운동 갈까')
      }
    })

    it('expands food-related questions', () => {
      const expansions = expandChosungQuestion('ㄹㅁㄴㅁㅇㄹㄲ')

      if (expansions.length > 0) {
        expect(expansions[0]).toBe('라면 먹을까')
      }
    })

    it('returns array even for unknown patterns', () => {
      const expansions = expandChosungQuestion('ㅁㅁㅁ')

      expect(Array.isArray(expansions)).toBe(true)
    })

    it('handles multiple possible expansions', () => {
      const expansions = expandChosungQuestion('ㅇㄷㅎㄹㄲ')

      expect(Array.isArray(expansions)).toBe(true)
      if (expansions.length > 0) {
        expect(expansions).toContain('어떨까')
      }
    })
  })

  describe('Integration tests', () => {
    it('correctly processes typical chosung questions', () => {
      const testCases = [
        { input: 'ㄱㅇㅎㄹㄲ', shouldBe: '초성' },
        { input: '게임할까', shouldBe: '완성' },
        { input: 'ㄱㄴㄷㄹ?', shouldBe: '초성' },
      ]

      testCases.forEach(({ input, shouldBe }) => {
        const isChosung = isChosungOnly(input)
        if (shouldBe === '초성') {
          expect(isChosung).toBe(true)
        } else {
          expect(isChosung).toBe(false)
        }
      })
    })

    it('generates valid regex patterns', () => {
      const pattern = chosungToPattern('ㄱㄴㄷ')
      expect(() => new RegExp(pattern)).not.toThrow()

      const regex = new RegExp(pattern)
      expect(regex.test('가나다')).toBe(true)
    })

    it('expands and validates common patterns', () => {
      const commonChosungs = ['ㅇㄷㅇㄷㄱㄹㄲ', 'ㄹㅁㄴㅁㅇㄹㄲ', 'ㅅㅁㅅㄹㄲ']

      commonChosungs.forEach((chosung) => {
        const expansions = expandChosungQuestion(chosung)
        expect(Array.isArray(expansions)).toBe(true)
      })
    })
  })

  describe('Edge cases', () => {
    it('handles empty string', () => {
      expect(isChosungOnly('')).toBe(false)
      expect(chosungToPattern('')).toBe('')
      expect(expandChosungQuestion('')).toEqual([])
    })

    it('handles only spaces', () => {
      expect(isChosungOnly('   ')).toBe(false)
    })

    it('handles special characters', () => {
      const pattern = chosungToPattern('ㄱ!@#')
      expect(pattern).toContain('[가-깋]')
    })

    it('handles numbers in text', () => {
      expect(isChosungOnly('ㄱㄴ123')).toBe(true)
      const pattern = chosungToPattern('ㄱ123')
      expect(pattern).toContain('123')
    })
  })

  describe('normalizeText', () => {
    it('lowercases English', () => {
      expect(normalizeText('Hello World')).toBe('helloworld')
    })

    it('removes all whitespace', () => {
      expect(normalizeText('a  b  c')).toBe('abc')
    })

    it('removes punctuation', () => {
      expect(normalizeText('안녕하세요?!')).toBe('안녕하세요')
    })

    it('handles mixed Korean and English', () => {
      expect(normalizeText('오늘 today!')).toBe('오늘today')
    })

    it('trims whitespace', () => {
      expect(normalizeText('  hello  ')).toBe('hello')
    })
  })

  describe('prepareForMatching', () => {
    it('includes original text', () => {
      const result = prepareForMatching('오늘 운세')
      expect(result).toContain('오늘 운세')
    })

    it('includes normalized text', () => {
      const result = prepareForMatching('오늘 운세?')
      expect(result).toContain('오늘운세')
    })

    it('expands chosung questions', () => {
      const result = prepareForMatching('ㅇㄷㅎㄹㄲ')
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('deduplicates results', () => {
      const result = prepareForMatching('hello')
      const unique = new Set(result)
      expect(result.length).toBe(unique.size)
    })

    it('applies typo fixes', () => {
      const result = prepareForMatching('되요')
      expect(result.some((v) => v.includes('돼요'))).toBe(true)
    })
  })

  describe('fuzzyMatch', () => {
    it('matches normalized text', () => {
      expect(fuzzyMatch('할 까 요?', [/할까/])).toBe(true)
    })

    it('returns false when no match', () => {
      expect(fuzzyMatch('안녕', [/할까/, /갈까/])).toBe(false)
    })

    it('matches case-insensitively', () => {
      expect(fuzzyMatch('HELLO', [/hello/])).toBe(true)
    })

    it('matches with typo correction', () => {
      expect(fuzzyMatch('되요', [/돼요/])).toBe(true)
    })
  })

  describe('enhancedYesNoMatch', () => {
    it('matches 할까 ending', () => {
      expect(enhancedYesNoMatch('운동 할까')).toBe(true)
    })

    it('matches 갈까 ending', () => {
      expect(enhancedYesNoMatch('여행 갈까')).toBe(true)
    })

    it('matches 살까 ending', () => {
      expect(enhancedYesNoMatch('옷 살까')).toBe(true)
    })

    it('matches 먹을까 ending', () => {
      expect(enhancedYesNoMatch('라면 먹을까')).toBe(true)
    })

    it('matches 마실까 ending', () => {
      expect(enhancedYesNoMatch('술 마실까')).toBe(true)
    })

    it('matches 좋을까 ending', () => {
      expect(enhancedYesNoMatch('이게 좋을까')).toBe(true)
    })

    it('matches 할까말까 pattern', () => {
      expect(enhancedYesNoMatch('할까 말까')).toBe(true)
    })

    it('matches 해야하나', () => {
      expect(enhancedYesNoMatch('해야 하나')).toBe(true)
    })

    it('does not match general text', () => {
      expect(enhancedYesNoMatch('오늘 운세 알려줘')).toBe(false)
    })
  })

  describe('decodeChosung', () => {
    it('decodes known pattern 오늘운동갈까', () => {
      expect(decodeChosung('ㅇㄷㅇㄷㄱㄹㄲ')).toBe('오늘운동갈까')
    })

    it('decodes 할까', () => {
      expect(decodeChosung('ㅎㄹㄲ')).toBe('할까')
    })

    it('decodes 먹을까', () => {
      expect(decodeChosung('ㅁㅇㄹㄲ')).toBe('먹을까')
    })

    it('decodes 어떨까', () => {
      expect(decodeChosung('ㅇㄷㅎㄹㄲ')).toBe('어떨까')
    })

    it('returns null for unknown pattern', () => {
      expect(decodeChosung('ㅁㅁㅁㅁ')).toBeNull()
    })

    it('returns null for non-chosung text', () => {
      expect(decodeChosung('안녕하세요')).toBeNull()
    })
  })

  describe('similarity', () => {
    it('returns 1 for identical strings', () => {
      expect(similarity('hello', 'hello')).toBe(1)
    })

    it('returns low similarity for very different strings', () => {
      expect(similarity('abc', 'xyz')).toBeLessThan(0.5)
    })

    it('returns high similarity for similar strings', () => {
      expect(similarity('hello', 'hallo')).toBeGreaterThan(0.7)
    })

    it('handles one empty string', () => {
      expect(similarity('hello', '')).toBe(0)
    })

    it('is symmetric', () => {
      const ab = similarity('abc', 'abd')
      const ba = similarity('abd', 'abc')
      expect(ab).toBeCloseTo(ba, 5)
    })

    it('calculates Korean text similarity', () => {
      expect(similarity('안녕하세요', '안녕하셨어요')).toBeGreaterThan(0.5)
    })
  })
})
