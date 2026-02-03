/**
 * @file Tests for Pillar Data Extractors
 */

import { describe, it, expect } from 'vitest'
import {
  extractPillarData,
  extractAllStemsAndBranches,
  extractCurrentDaeun,
  type PillarData,
} from '@/app/api/destiny-map/chat-stream/helpers/pillarExtractors'
import type { SajuDataStructure, DaeunCycleItem } from '@/app/api/destiny-map/chat-stream/lib/types'

describe('Pillar Extractors', () => {
  const mockSaju: Partial<SajuDataStructure> = {
    pillars: {
      year: {
        heavenlyStem: { name: '庚', element: 'metal' },
        earthlyBranch: { name: '午', element: 'fire' },
      },
      month: {
        heavenlyStem: { name: '丁', element: 'fire' },
        earthlyBranch: { name: '丑', element: 'earth' },
      },
      day: {
        heavenlyStem: { name: '癸', element: 'water' },
        earthlyBranch: { name: '卯', element: 'wood' },
      },
      time: {
        heavenlyStem: { name: '甲', element: 'wood' },
        earthlyBranch: { name: '寅', element: 'wood' },
      },
    },
    dayMaster: {
      heavenlyStem: '癸',
      name: '卯',
    },
  } as any

  describe('extractPillarData', () => {
    it('should extract all pillar data correctly', () => {
      const result = extractPillarData(mockSaju as SajuDataStructure)

      expect(result).toEqual({
        yearStem: '庚',
        monthStem: '丁',
        dayStem: '癸',
        timeStem: '甲',
        yearBranch: '午',
        monthBranch: '丑',
        dayBranch: '卯',
        timeBranch: '寅',
      })
    })

    it('should return default values for undefined saju', () => {
      const result = extractPillarData(undefined)

      expect(result).toEqual({
        yearStem: '甲',
        monthStem: '甲',
        dayStem: '甲',
        timeStem: '甲',
        yearBranch: '子',
        monthBranch: '子',
        dayBranch: '子',
        timeBranch: '子',
      })
    })

    it('should handle missing pillars', () => {
      const incompleteSaju = {
        dayMaster: {
          heavenlyStem: '癸',
          name: '卯',
        },
      } as any

      const result = extractPillarData(incompleteSaju)

      expect(result.dayStem).toBe('癸')
      expect(result.dayBranch).toBe('卯')
      expect(result.yearStem).toBe('甲') // Default
      expect(result.monthStem).toBe('甲') // Default
    })

    it('should handle missing dayMaster', () => {
      const sajuWithoutDayMaster = {
        pillars: {
          year: {
            heavenlyStem: { name: '庚' },
            earthlyBranch: { name: '午' },
          },
        },
      } as any

      const result = extractPillarData(sajuWithoutDayMaster)

      expect(result.yearStem).toBe('庚')
      expect(result.dayStem).toBe('甲') // Default
      expect(result.dayBranch).toBe('子') // Default
    })

    it('should return correct type', () => {
      const result: PillarData = extractPillarData(mockSaju as SajuDataStructure)

      expect(typeof result.yearStem).toBe('string')
      expect(typeof result.monthStem).toBe('string')
      expect(typeof result.dayStem).toBe('string')
      expect(typeof result.timeStem).toBe('string')
      expect(typeof result.yearBranch).toBe('string')
      expect(typeof result.monthBranch).toBe('string')
      expect(typeof result.dayBranch).toBe('string')
      expect(typeof result.timeBranch).toBe('string')
    })
  })

  describe('extractAllStemsAndBranches', () => {
    it('should extract all stems and branches as arrays', () => {
      const result = extractAllStemsAndBranches(mockSaju as SajuDataStructure)

      expect(result.allStems).toEqual(['庚', '丁', '癸', '甲'])
      expect(result.allBranches).toEqual(['午', '丑', '卯', '寅'])
    })

    it('should return arrays of length 4', () => {
      const result = extractAllStemsAndBranches(mockSaju as SajuDataStructure)

      expect(result.allStems).toHaveLength(4)
      expect(result.allBranches).toHaveLength(4)
    })

    it('should handle undefined saju', () => {
      const result = extractAllStemsAndBranches(undefined)

      expect(result.allStems).toEqual(['甲', '甲', '甲', '甲'])
      expect(result.allBranches).toEqual(['子', '子', '子', '子'])
    })

    it('should maintain order: year, month, day, time', () => {
      const result = extractAllStemsAndBranches(mockSaju as SajuDataStructure)

      expect(result.allStems[0]).toBe('庚') // year
      expect(result.allStems[1]).toBe('丁') // month
      expect(result.allStems[2]).toBe('癸') // day
      expect(result.allStems[3]).toBe('甲') // time
    })

    it('should have consistent data with extractPillarData', () => {
      const pillarData = extractPillarData(mockSaju as SajuDataStructure)
      const arrayData = extractAllStemsAndBranches(mockSaju as SajuDataStructure)

      expect(arrayData.allStems[0]).toBe(pillarData.yearStem)
      expect(arrayData.allStems[1]).toBe(pillarData.monthStem)
      expect(arrayData.allStems[2]).toBe(pillarData.dayStem)
      expect(arrayData.allStems[3]).toBe(pillarData.timeStem)

      expect(arrayData.allBranches[0]).toBe(pillarData.yearBranch)
      expect(arrayData.allBranches[1]).toBe(pillarData.monthBranch)
      expect(arrayData.allBranches[2]).toBe(pillarData.dayBranch)
      expect(arrayData.allBranches[3]).toBe(pillarData.timeBranch)
    })
  })

  describe('extractCurrentDaeun', () => {
    const mockDaeunList: DaeunCycleItem[] = [
      {
        stem: '甲',
        branch: '寅',
        startAge: 5,
      },
      {
        stem: '乙',
        branch: '卯',
        startAge: 15,
      },
      {
        stem: '丙',
        branch: '辰',
        startAge: 25,
      },
    ] as any

    const sajuWithDaeun = {
      ...mockSaju,
      unse: {
        daeun: mockDaeunList,
      },
    } as any

    it('should extract current daeun for age in range', () => {
      const result = extractCurrentDaeun(sajuWithDaeun, 20)

      expect(result).toBeDefined()
      expect(result?.stem).toBe('乙')
      expect(result?.branch).toBe('卯')
      expect(result?.startAge).toBe(15)
    })

    it('should handle age at start of cycle', () => {
      const result = extractCurrentDaeun(sajuWithDaeun, 15)

      expect(result).toBeDefined()
      expect(result?.stem).toBe('乙')
    })

    it('should handle age at end of cycle', () => {
      const result = extractCurrentDaeun(sajuWithDaeun, 24)

      expect(result).toBeDefined()
      expect(result?.stem).toBe('乙')
    })

    it('should return undefined for age before first cycle', () => {
      const result = extractCurrentDaeun(sajuWithDaeun, 3)

      expect(result).toBeUndefined()
    })

    it('should return undefined for age after last cycle', () => {
      const result = extractCurrentDaeun(sajuWithDaeun, 50)

      expect(result).toBeUndefined()
    })

    it('should return undefined for undefined saju', () => {
      const result = extractCurrentDaeun(undefined, 20)

      expect(result).toBeUndefined()
    })

    it('should return undefined for saju without unse.daeun', () => {
      const result = extractCurrentDaeun(mockSaju as SajuDataStructure, 20)

      expect(result).toBeUndefined()
    })

    it('should return undefined for empty unse.daeun', () => {
      const sajuWithEmptyDaeun = {
        ...mockSaju,
        unse: { daeun: [] },
      } as any

      const result = extractCurrentDaeun(sajuWithEmptyDaeun, 20)

      expect(result).toBeUndefined()
    })

    it('should handle negative age', () => {
      const result = extractCurrentDaeun(sajuWithDaeun, -5)

      expect(result).toBeUndefined()
    })

    it('should handle zero age', () => {
      const result = extractCurrentDaeun(sajuWithDaeun, 0)

      expect(result).toBeUndefined()
    })

    it('should work with first cycle', () => {
      const result = extractCurrentDaeun(sajuWithDaeun, 10)

      expect(result).toBeDefined()
      expect(result?.stem).toBe('甲')
      expect(result?.branch).toBe('寅')
    })

    it('should work with last cycle', () => {
      const result = extractCurrentDaeun(sajuWithDaeun, 30)

      expect(result).toBeDefined()
      expect(result?.stem).toBe('丙')
      expect(result?.branch).toBe('辰')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null values in saju structure', () => {
      const nullSaju = {
        pillars: null,
        dayMaster: null,
      } as any

      const result = extractPillarData(nullSaju)

      expect(result.yearStem).toBe('甲')
      expect(result.yearBranch).toBe('子')
    })

    it('should handle partial pillar data', () => {
      const partialSaju = {
        pillars: {
          year: { heavenlyStem: { name: '庚' } },
          month: { earthlyBranch: { name: '丑' } },
        },
        dayMaster: {},
      } as any

      const result = extractPillarData(partialSaju)

      expect(result.yearStem).toBe('庚')
      expect(result.monthBranch).toBe('丑')
      expect(result.dayStem).toBe('甲') // Default
    })

    it('should handle very large age in extractCurrentDaeun', () => {
      const sajuWithDaeun = {
        daeunCycles: [{ stem: '甲', branch: '寅', startAge: 5, endAge: 14 }],
      } as any

      const result = extractCurrentDaeun(sajuWithDaeun, 999)

      expect(result).toBeUndefined()
    })

    it('should handle decimal age', () => {
      const sajuWithDaeun = {
        unse: {
          daeun: [{ stem: '甲', branch: '寅', startAge: 5 }],
        },
      } as any

      const result = extractCurrentDaeun(sajuWithDaeun, 10.5)

      expect(result).toBeDefined()
      expect(result?.stem).toBe('甲')
    })
  })

  describe('Type Safety', () => {
    it('should return PillarData type with all required properties', () => {
      const result = extractPillarData(mockSaju as SajuDataStructure)
      const requiredKeys: (keyof PillarData)[] = [
        'yearStem',
        'monthStem',
        'dayStem',
        'timeStem',
        'yearBranch',
        'monthBranch',
        'dayBranch',
        'timeBranch',
      ]

      requiredKeys.forEach((key) => {
        expect(result).toHaveProperty(key)
        expect(typeof result[key]).toBe('string')
      })
    })

    it('should return arrays for extractAllStemsAndBranches', () => {
      const result = extractAllStemsAndBranches(mockSaju as SajuDataStructure)

      expect(Array.isArray(result.allStems)).toBe(true)
      expect(Array.isArray(result.allBranches)).toBe(true)
    })
  })
})
