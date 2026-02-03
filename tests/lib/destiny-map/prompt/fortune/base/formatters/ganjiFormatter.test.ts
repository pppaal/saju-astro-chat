/**
 * ganjiFormatter.test.ts - 간지 포맷팅 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  formatGanjiEasy,
  parseGanjiEasy,
  formatPillar,
} from '@/lib/destiny-map/prompt/fortune/base/formatters/ganjiFormatter'
import type { PillarData } from '@/lib/destiny-map/prompt/fortune/base/prompt-types'

describe('ganjiFormatter', () => {
  describe('formatGanjiEasy', () => {
    it('should format stem and branch to easy Korean', () => {
      expect(formatGanjiEasy('甲', '子')).toBe('갑목(나무+) + 자(쥐/물)')
      expect(formatGanjiEasy('乙', '丑')).toBe('을목(나무-) + 축(소/흙)')
      expect(formatGanjiEasy('丙', '寅')).toBe('병화(불+) + 인(호랑이/나무)')
    })

    it('should handle missing stem or branch', () => {
      expect(formatGanjiEasy(undefined, '子')).toBe('-')
      expect(formatGanjiEasy('甲', undefined)).toBe('-')
      expect(formatGanjiEasy(undefined, undefined)).toBe('-')
    })

    it('should handle unknown characters', () => {
      expect(formatGanjiEasy('X', 'Y')).toBe('X + Y')
    })

    it('should format all 10 stems correctly', () => {
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
      const expectedStems = [
        '갑목(나무+)',
        '을목(나무-)',
        '병화(불+)',
        '정화(불-)',
        '무토(흙+)',
        '기토(흙-)',
        '경금(쇠+)',
        '신금(쇠-)',
        '임수(물+)',
        '계수(물-)',
      ]

      stems.forEach((stem, index) => {
        const result = formatGanjiEasy(stem, '子')
        expect(result).toContain(expectedStems[index])
      })
    })

    it('should format all 12 branches correctly', () => {
      const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
      const expectedBranches = [
        '자(쥐/물)',
        '축(소/흙)',
        '인(호랑이/나무)',
        '묘(토끼/나무)',
        '진(용/흙)',
        '사(뱀/불)',
        '오(말/불)',
        '미(양/흙)',
        '신(원숭이/쇠)',
        '유(닭/쇠)',
        '술(개/흙)',
        '해(돼지/물)',
      ]

      branches.forEach((branch, index) => {
        const result = formatGanjiEasy('甲', branch)
        expect(result).toContain(expectedBranches[index])
      })
    })
  })

  describe('parseGanjiEasy', () => {
    it('should parse ganji string and format to easy Korean', () => {
      expect(parseGanjiEasy('甲子')).toBe('갑목(나무+) + 자(쥐/물)')
      expect(parseGanjiEasy('乙丑')).toBe('을목(나무-) + 축(소/흙)')
    })

    it('should handle short strings', () => {
      expect(parseGanjiEasy('甲')).toBe('甲')
      expect(parseGanjiEasy('')).toBe('-')
    })

    it('should handle undefined', () => {
      expect(parseGanjiEasy(undefined)).toBe('-')
    })

    it('should handle all 60 Jiazi combinations (sample)', () => {
      const samples = [
        { input: '甲子', stem: '甲', branch: '子' },
        { input: '乙丑', stem: '乙', branch: '丑' },
        { input: '丙寅', stem: '丙', branch: '寅' },
        { input: '丁卯', stem: '丁', branch: '卯' },
        { input: '戊辰', stem: '戊', branch: '辰' },
      ]

      samples.forEach(({ input, stem, branch }) => {
        const result = parseGanjiEasy(input)
        const expected = formatGanjiEasy(stem, branch)
        expect(result).toBe(expected)
      })
    })
  })

  describe('formatPillar', () => {
    it('should format pillar with heavenlyStem and earthlyBranch', () => {
      const pillar: PillarData = {
        heavenlyStem: { name: '甲', element: '木', yin_yang: '陽' },
        earthlyBranch: { name: '子', element: '水', yin_yang: '陽' },
      }
      expect(formatPillar(pillar)).toBe('甲子')
    })

    it('should format pillar with ganji string', () => {
      const pillar: PillarData = {
        ganji: '乙丑',
      }
      expect(formatPillar(pillar)).toBe('乙丑')
    })

    it('should handle undefined pillar', () => {
      expect(formatPillar(undefined)).toBeNull()
    })

    it('should handle incomplete pillar data', () => {
      const incompletePillar: PillarData = {
        heavenlyStem: { name: '甲', element: '木', yin_yang: '陽' },
      }
      expect(formatPillar(incompletePillar)).toBeNull()
    })

    it('should prefer heavenlyStem/earthlyBranch over ganji', () => {
      const pillar: PillarData = {
        heavenlyStem: { name: '甲', element: '木', yin_yang: '陽' },
        earthlyBranch: { name: '子', element: '水', yin_yang: '陽' },
        ganji: '乙丑', // This should be ignored
      }
      expect(formatPillar(pillar)).toBe('甲子')
    })

    it('should handle all four pillars (year, month, day, time)', () => {
      const pillars: PillarData[] = [
        {
          heavenlyStem: { name: '甲', element: '木', yin_yang: '陽' },
          earthlyBranch: { name: '子', element: '水', yin_yang: '陽' },
        },
        {
          heavenlyStem: { name: '乙', element: '木', yin_yang: '陰' },
          earthlyBranch: { name: '丑', element: '土', yin_yang: '陰' },
        },
        {
          heavenlyStem: { name: '丙', element: '火', yin_yang: '陽' },
          earthlyBranch: { name: '寅', element: '木', yin_yang: '陽' },
        },
        {
          heavenlyStem: { name: '丁', element: '火', yin_yang: '陰' },
          earthlyBranch: { name: '卯', element: '木', yin_yang: '陰' },
        },
      ]

      const formattedPillars = pillars.map(formatPillar)
      expect(formattedPillars).toEqual(['甲子', '乙丑', '丙寅', '丁卯'])
    })
  })

  describe('integration tests', () => {
    it('should work together to format complex saju data', () => {
      const yearPillar: PillarData = {
        heavenlyStem: { name: '甲', element: '木', yin_yang: '陽' },
        earthlyBranch: { name: '子', element: '水', yin_yang: '陽' },
      }

      const formattedYear = formatPillar(yearPillar)
      expect(formattedYear).toBe('甲子')

      if (formattedYear) {
        const easyFormat = parseGanjiEasy(formattedYear)
        expect(easyFormat).toBe('갑목(나무+) + 자(쥐/물)')
      }
    })

    it('should handle edge cases gracefully', () => {
      // Empty string
      expect(parseGanjiEasy('')).toBe('-')

      // Null/undefined
      expect(formatPillar(undefined)).toBeNull()
      expect(parseGanjiEasy(undefined)).toBe('-')

      // Invalid data
      expect(formatGanjiEasy('', '')).toBe('-')
    })
  })
})
