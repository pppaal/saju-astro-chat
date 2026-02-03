/**
 * sajuSection.test.ts - 사주 섹션 빌더 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  extractSajuBasics,
  calculateCurrentLuck,
  buildFutureLuckData,
  extractSinsal,
} from '@/lib/destiny-map/prompt/fortune/base/sections/sajuSection'
import type {
  SajuData,
  PillarData,
  DaeunItem,
  AnnualItem,
  MonthlyItem,
} from '@/lib/destiny-map/prompt/fortune/base/prompt-types'

describe('sajuSection', () => {
  describe('extractSajuBasics', () => {
    it('should extract basic saju information', () => {
      const saju: SajuData = {
        pillars: {
          year: {
            heavenlyStem: { name: '甲', element: '木', yin_yang: '陽' },
            earthlyBranch: { name: '子', element: '水', yin_yang: '陽' },
          },
          month: {
            heavenlyStem: { name: '乙', element: '木', yin_yang: '陰' },
            earthlyBranch: { name: '丑', element: '土', yin_yang: '陰' },
          },
          day: {
            heavenlyStem: { name: '丙', element: '火', yin_yang: '陽' },
            earthlyBranch: { name: '寅', element: '木', yin_yang: '陽' },
          },
          time: {
            heavenlyStem: { name: '丁', element: '火', yin_yang: '陰' },
            earthlyBranch: { name: '卯', element: '木', yin_yang: '陰' },
          },
        },
        dayMaster: { name: '丙', element: '火' },
      }

      const result = extractSajuBasics(saju)

      expect(result.pillarText).toBe('甲子 / 乙丑 / 丙寅 / 丁卯')
      expect(result.actualDayMaster).toBe('丙')
      expect(result.actualDayMasterElement).toBe('火')
    })

    it('should handle missing pillars gracefully', () => {
      const saju: SajuData = {
        pillars: {
          year: {
            heavenlyStem: { name: '甲', element: '木', yin_yang: '陽' },
            earthlyBranch: { name: '子', element: '水', yin_yang: '陽' },
          },
        },
        dayMaster: { name: '丙', element: '火' },
      }

      const result = extractSajuBasics(saju)

      expect(result.pillarText).toBe('甲子')
      expect(result.actualDayMaster).toBe('丙')
    })

    it('should extract day master from day pillar if dayMaster is missing', () => {
      const saju: SajuData = {
        pillars: {
          day: {
            heavenlyStem: { name: '丙', element: '火', yin_yang: '陽' },
            earthlyBranch: { name: '寅', element: '木', yin_yang: '陽' },
          },
        },
      }

      const result = extractSajuBasics(saju)

      expect(result.actualDayMaster).toBe('丙')
      expect(result.actualDayMasterElement).toBe('火')
    })

    it('should return dash for missing data', () => {
      const saju: SajuData = {
        pillars: {},
      }

      const result = extractSajuBasics(saju)

      expect(result.pillarText).toBe('-')
      expect(result.actualDayMaster).toBe('-')
      expect(result.actualDayMasterElement).toBe('-')
    })
  })

  describe('calculateCurrentLuck', () => {
    it('should calculate current daeun correctly', () => {
      const saju: SajuData = {
        unse: {
          daeun: [
            { age: 10, heavenlyStem: '甲', earthlyBranch: '子' },
            { age: 20, heavenlyStem: '乙', earthlyBranch: '丑' },
            { age: 30, heavenlyStem: '丙', earthlyBranch: '寅' },
          ] as DaeunItem[],
          annual: [
            { year: 2024, ganji: '甲辰', element: '木' },
            { year: 2025, ganji: '乙巳', element: '木' },
          ] as AnnualItem[],
          monthly: [
            { year: 2024, month: 1, ganji: '丙寅', element: '火' },
            { year: 2024, month: 2, ganji: '丁卯', element: '火' },
          ] as MonthlyItem[],
        },
      }

      const result = calculateCurrentLuck(saju, 2024, 1, 25)

      expect(result.currentDaeun).toBeDefined()
      expect(result.currentDaeun?.age).toBe(20)
      expect(result.daeunText).toContain('20-29세')
    })

    it('should handle current annual and monthly luck', () => {
      const saju: SajuData = {
        unse: {
          daeun: [] as DaeunItem[],
          annual: [{ year: 2024, ganji: '甲辰', element: '木' }] as AnnualItem[],
          monthly: [{ year: 2024, month: 2, ganji: '丁卯', element: '火' }] as MonthlyItem[],
        },
      }

      const result = calculateCurrentLuck(saju, 2024, 2, 30)

      expect(result.currentAnnual).toBeDefined()
      expect(result.currentAnnual?.year).toBe(2024)
      expect(result.currentMonthly).toBeDefined()
      expect(result.currentMonthly?.month).toBe(2)
    })

    it('should handle missing current daeun', () => {
      const saju: SajuData = {
        unse: {
          daeun: [{ age: 10, heavenlyStem: '甲', earthlyBranch: '子' }] as DaeunItem[],
          annual: [] as AnnualItem[],
          monthly: [] as MonthlyItem[],
        },
      }

      const result = calculateCurrentLuck(saju, 2024, 1, 50) // Age 50, but only daeun for age 10-19

      expect(result.currentDaeun).toBeUndefined()
      expect(result.daeunText).toContain('10-19세') // Should show first 3 as fallback
    })

    it('should format daeun text with easy Korean', () => {
      const saju: SajuData = {
        unse: {
          daeun: [{ age: 20, heavenlyStem: '甲', earthlyBranch: '子' }] as DaeunItem[],
          annual: [] as AnnualItem[],
          monthly: [] as MonthlyItem[],
        },
      }

      const result = calculateCurrentLuck(saju, 2024, 1, 25)

      expect(result.daeunText).toContain('갑목(나무+)')
      expect(result.daeunText).toContain('자(쥐/물)')
    })
  })

  describe('buildFutureLuckData', () => {
    it('should build future daeun list', () => {
      const saju: SajuData = {
        unse: {
          daeun: [
            { age: 10, heavenlyStem: '甲', earthlyBranch: '子' },
            { age: 20, heavenlyStem: '乙', earthlyBranch: '丑' },
            { age: 30, heavenlyStem: '丙', earthlyBranch: '寅' },
          ] as DaeunItem[],
          annual: [] as AnnualItem[],
          monthly: [] as MonthlyItem[],
        },
      }

      const result = buildFutureLuckData(saju, 2024, 1, 25)

      expect(result.allDaeunText).toContain('10-19세')
      expect(result.allDaeunText).toContain('20-29세')
      expect(result.allDaeunText).toContain('30-39세')
      expect(result.allDaeunText).toContain('★현재★')
    })

    it('should build future annual list (next 5 years)', () => {
      const saju: SajuData = {
        unse: {
          daeun: [] as DaeunItem[],
          annual: [
            { year: 2024, ganji: '甲辰', element: '木' },
            { year: 2025, ganji: '乙巳', element: '木' },
            { year: 2026, ganji: '丙午', element: '火' },
            { year: 2027, ganji: '丁未', element: '火' },
            { year: 2028, ganji: '戊申', element: '土' },
            { year: 2029, ganji: '己酉', element: '土' },
            { year: 2030, ganji: '庚戌', element: '金' },
          ] as AnnualItem[],
          monthly: [] as MonthlyItem[],
        },
      }

      const result = buildFutureLuckData(saju, 2024, 1, 30)

      expect(result.futureAnnualList).toContain('2024년')
      expect(result.futureAnnualList).toContain('2025년')
      expect(result.futureAnnualList).toContain('2029년')
      expect(result.futureAnnualList).not.toContain('2030년') // Should limit to +5 years
    })

    it('should build future monthly list (next 12 months)', () => {
      const saju: SajuData = {
        unse: {
          daeun: [] as DaeunItem[],
          annual: [] as AnnualItem[],
          monthly: Array.from({ length: 24 }, (_, i) => ({
            year: 2024,
            month: (i % 12) + 1,
            ganji: '甲子',
            element: '木',
          })) as MonthlyItem[],
        },
      }

      const result = buildFutureLuckData(saju, 2024, 1, 30)

      const monthCount = result.futureMonthlyList.split('\n').filter((line) => line.trim()).length
      expect(monthCount).toBeLessThanOrEqual(12) // Should limit to 12 months
    })

    it('should mark current periods with ★현재★', () => {
      const saju: SajuData = {
        unse: {
          daeun: [{ age: 20, heavenlyStem: '甲', earthlyBranch: '子' }] as DaeunItem[],
          annual: [{ year: 2024, ganji: '甲辰', element: '木' }] as AnnualItem[],
          monthly: [{ year: 2024, month: 2, ganji: '丁卯', element: '火' }] as MonthlyItem[],
        },
      }

      const result = buildFutureLuckData(saju, 2024, 2, 25)

      expect(result.allDaeunText).toContain('★현재★')
      expect(result.futureAnnualList).toContain('★현재★')
      expect(result.futureMonthlyList).toContain('★현재★')
    })
  })

  describe('extractSinsal', () => {
    it('should extract lucky and unlucky sinsal', () => {
      const saju: SajuData = {
        sinsal: {
          luckyList: [{ name: '천을귀인' }, { name: '도화' }],
          unluckyList: [{ name: '원진살' }, { name: '귀문살' }],
        },
      }

      const result = extractSinsal(saju)

      expect(result.lucky).toBe('천을귀인, 도화')
      expect(result.unlucky).toBe('원진살, 귀문살')
    })

    it('should handle empty sinsal lists', () => {
      const saju: SajuData = {
        sinsal: {
          luckyList: [],
          unluckyList: [],
        },
      }

      const result = extractSinsal(saju)

      expect(result.lucky).toBe('')
      expect(result.unlucky).toBe('')
    })

    it('should handle missing sinsal data', () => {
      const saju: SajuData = {}

      const result = extractSinsal(saju)

      expect(result.lucky).toBe('')
      expect(result.unlucky).toBe('')
    })

    it('should handle multiple sinsal items', () => {
      const saju: SajuData = {
        sinsal: {
          luckyList: [
            { name: '천을귀인' },
            { name: '도화' },
            { name: '문창귀인' },
            { name: '학당' },
          ],
          unluckyList: [],
        },
      }

      const result = extractSinsal(saju)

      expect(result.lucky).toBe('천을귀인, 도화, 문창귀인, 학당')
    })
  })

  describe('integration tests', () => {
    it('should work together to extract complete saju section data', () => {
      const saju: SajuData = {
        pillars: {
          year: {
            heavenlyStem: { name: '甲', element: '木', yin_yang: '陽' },
            earthlyBranch: { name: '子', element: '水', yin_yang: '陽' },
          },
          day: {
            heavenlyStem: { name: '丙', element: '火', yin_yang: '陽' },
            earthlyBranch: { name: '寅', element: '木', yin_yang: '陽' },
          },
        },
        dayMaster: { name: '丙', element: '火' },
        unse: {
          daeun: [{ age: 20, heavenlyStem: '乙', earthlyBranch: '丑' }] as DaeunItem[],
          annual: [{ year: 2024, ganji: '甲辰', element: '木' }] as AnnualItem[],
          monthly: [] as MonthlyItem[],
        },
        sinsal: {
          luckyList: [{ name: '천을귀인' }],
          unluckyList: [{ name: '원진살' }],
        },
      }

      const basics = extractSajuBasics(saju)
      const luck = calculateCurrentLuck(saju, 2024, 1, 25)
      const future = buildFutureLuckData(saju, 2024, 1, 25)
      const sinsal = extractSinsal(saju)

      expect(basics.actualDayMaster).toBe('丙')
      expect(luck.currentDaeun).toBeDefined()
      expect(future.allDaeunText).toContain('20-29세')
      expect(sinsal.lucky).toBe('천을귀인')
      expect(sinsal.unlucky).toBe('원진살')
    })
  })
})
