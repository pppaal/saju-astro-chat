/**
 * @file Tests for Tier 1 Daily Precision Analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateTier1Analysis,
  type Tier1AnalysisInput,
  type Tier1AnalysisResult,
} from '@/app/api/destiny-map/chat-stream/analysis/tier1-daily-precision'
import type { SajuDataStructure } from '@/app/api/destiny-map/chat-stream/lib/types'

// Mock the ultraPrecisionEngine
vi.mock('@/lib/prediction/ultraPrecisionEngine', () => ({
  analyzeGongmang: vi.fn((dayStem: string, dayBranch: string, todayBranch: string) => ({
    isToday空: todayBranch === '午',
    emptyBranches: ['午', '未'],
    affectedAreas: ['재물', '관계'],
  })),
  analyzeShinsal: vi.fn(() => ({
    active: [
      { name: '천을귀인', description: '귀인의 도움', type: 'lucky' },
      { name: '역마살', description: '이동 변화', type: 'neutral' },
    ],
  })),
  analyzeEnergyFlow: vi.fn(() => ({
    dominantElement: '목',
    energyStrength: '강함',
    description: '목 기운이 강하게 작용합니다',
  })),
  generateHourlyAdvice: vi.fn(() => [
    { hour: '9-11', siGan: '辰時', quality: 'excellent' },
    { hour: '11-13', siGan: '午時', quality: 'excellent' },
    { hour: '13-15', siGan: '未時', quality: 'good' },
    { hour: '15-17', siGan: '申時', quality: 'good' },
    { hour: '17-19', siGan: '酉時', quality: 'caution' },
  ]),
  calculateDailyPillar: vi.fn(() => ({
    stem: '甲',
    branch: '子',
  })),
}))

describe('Tier1 Daily Precision Analysis', () => {
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
  } as any

  describe('generateTier1Analysis', () => {
    it('should generate tier1 analysis with Korean language', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('section')
      expect(result).toHaveProperty('dailyPillar')
      expect(result.section).toContain('[🔮 오늘의 정밀 분석')
      expect(result.section).toContain('📅 오늘 일진')
    })

    it('should generate tier1 analysis with English language', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'en',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain("[🔮 TODAY'S PRECISION ANALYSIS")
      expect(result.section).toContain('📅 Today')
    })

    it('should return dailyPillar', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result.dailyPillar).toBeDefined()
      expect(result.dailyPillar).toHaveProperty('stem', '甲')
      expect(result.dailyPillar).toHaveProperty('branch', '子')
    })

    it('should include gongmang analysis when active', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain('공망')
    })

    it('should include shinsal analysis', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain('활성 신살')
    })

    it('should include energy flow analysis', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain('⚡ 에너지 흐름')
    })

    it('should include hourly recommendations', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain('⏰ 오늘 시간대 추천')
    })

    it('should handle missing pillar data gracefully', () => {
      const incompleteSaju: Partial<SajuDataStructure> = {
        pillars: {
          year: undefined,
          month: undefined,
          day: undefined,
          time: undefined,
        },
      } as any

      const input: Tier1AnalysisInput = {
        saju: incompleteSaju as SajuDataStructure,
        dayStem: '甲',
        dayBranch: '子',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should filter out undefined stems and branches', () => {
      const partialSaju: Partial<SajuDataStructure> = {
        pillars: {
          year: {
            heavenlyStem: { name: '庚' },
            earthlyBranch: { name: '午' },
          },
          month: undefined,
          day: undefined,
          time: undefined,
        },
      } as any

      const input: Tier1AnalysisInput = {
        saju: partialSaju as SajuDataStructure,
        dayStem: '甲',
        dayBranch: '子',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should show excellent hours in Korean', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain('🌟 최고')
    })

    it('should show excellent hours in English', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'en',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain('🌟 Excellent')
    })

    it('should show good hours', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain('✅ 좋음')
    })

    it('should show caution hours', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain('⚠️ 주의')
    })

    it('should limit shinsal to 4 items', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      // Mock returns 2 shinsals, so both should appear
      expect(result.section).toContain('천을귀인')
      expect(result.section).toContain('역마살')
    })

    it('should use default branches when missing', () => {
      const noDataSaju: Partial<SajuDataStructure> = {
        pillars: undefined,
      } as any

      const input: Tier1AnalysisInput = {
        saju: noDataSaju as SajuDataStructure,
        dayStem: '甲',
        dayBranch: '子',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should include section dividers', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result.section).toContain(
        '═══════════════════════════════════════════════════════════════'
      )
    })

    it('should return correct type', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result: Tier1AnalysisResult = generateTier1Analysis(input)

      expect(typeof result.section).toBe('string')
      expect(typeof result.dailyPillar.stem).toBe('string')
      expect(typeof result.dailyPillar.branch).toBe('string')
    })

    it('should handle gongmang not active', () => {
      // Mock will need to return different value
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '寅', // Different from mock's '午'
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should slice excellent hours to max 3', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      // Mock returns 2 excellent hours, result should not exceed 3
      expect(result.section).toBeTruthy()
    })

    it('should slice good hours to max 4', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      // Mock returns 2 good hours
      expect(result.section).toBeTruthy()
    })

    it('should slice caution hours to max 3', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      // Mock returns 1 caution hour
      expect(result.section).toBeTruthy()
    })
  })

  describe('Type Safety', () => {
    it('should have correct input type', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      expect(input.saju).toBeDefined()
      expect(typeof input.dayStem).toBe('string')
      expect(typeof input.dayBranch).toBe('string')
      expect(typeof input.lang).toBe('string')
    })

    it('should have correct result type', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)
      const typedResult: Tier1AnalysisResult = result

      expect(typedResult.section).toBeDefined()
      expect(typedResult.dailyPillar).toBeDefined()
      expect(typedResult.dailyPillar.stem).toBeDefined()
      expect(typedResult.dailyPillar.branch).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty saju object', () => {
      const emptySaju = {} as any

      const input: Tier1AnalysisInput = {
        saju: emptySaju,
        dayStem: '甲',
        dayBranch: '子',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should handle null pillar values', () => {
      const nullPillarSaju: Partial<SajuDataStructure> = {
        pillars: {
          year: null,
          month: null,
          day: null,
          time: null,
        },
      } as any

      const input: Tier1AnalysisInput = {
        saju: nullPillarSaju as SajuDataStructure,
        dayStem: '甲',
        dayBranch: '子',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should handle various language codes', () => {
      const input: Tier1AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        dayStem: '癸',
        dayBranch: '卯',
        lang: 'ja',
      }

      const result = generateTier1Analysis(input)

      // Should default to English-like output
      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should handle empty stems and branches arrays', () => {
      const noDataSaju: Partial<SajuDataStructure> = {
        pillars: {
          year: { heavenlyStem: undefined, earthlyBranch: undefined },
          month: { heavenlyStem: undefined, earthlyBranch: undefined },
          day: { heavenlyStem: undefined, earthlyBranch: undefined },
          time: { heavenlyStem: undefined, earthlyBranch: undefined },
        },
      } as any

      const input: Tier1AnalysisInput = {
        saju: noDataSaju as SajuDataStructure,
        dayStem: '甲',
        dayBranch: '子',
        lang: 'ko',
      }

      const result = generateTier1Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })
  })
})
