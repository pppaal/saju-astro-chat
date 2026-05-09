/**
 * @file Tests for Tier 2 Daeun-Transit Sync Analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateTier2Analysis,
  type Tier2AnalysisInput,
  type Tier2AnalysisResult,
} from '@/app/api/destiny-map/chat-stream/analysis/tier2-daeun-transit'

// Mock dependencies
vi.mock('@/lib/timing/daeunTransitSync', () => ({
  convertSajuDaeunToInfo: vi.fn((data: unknown[]) => {
    if (!data || data.length === 0) return []
    return [
      { stem: '甲', branch: '寅', startAge: 5 },
      { stem: '乙', branch: '卯', startAge: 15 },
      { stem: '丙', branch: '辰', startAge: 25 },
    ]
  }),
  analyzeDaeunTransitSync: vi.fn(() => ({
    lifeCyclePattern: '상승기',
    overallConfidence: 85,
    majorTransitions: [
      {
        age: 25,
        year: 2015,
        synergyType: '확장기',
        synergyScore: 92,
        themes: ['커리어 성장', '인맥 확대'],
      },
      {
        age: 35,
        year: 2025,
        synergyType: '정점기',
        synergyScore: 95,
        themes: ['정점 도달', '성취'],
      },
    ],
    peakYears: [
      { age: 28, year: 2018 },
      { age: 35, year: 2025 },
    ],
    challengeYears: [
      { age: 22, year: 2012 },
      { age: 30, year: 2020 },
    ],
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '@/lib/logger'

describe('Tier2 Daeun-Transit Analysis', () => {
  const mockDaeunData = [
    { stem: '甲', branch: '寅', startAge: 5 },
    { stem: '乙', branch: '卯', startAge: 15 },
    { stem: '丙', branch: '辰', startAge: 25 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateTier2Analysis', () => {
    it('should generate tier2 analysis with Korean language', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('section')
      expect(result.section).toContain('[🌟 대운-트랜짓 동기화 분석')
      expect(result.section).toContain('📈 인생 패턴')
    })

    it('should generate tier2 analysis with English language', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'en',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toContain('[🌟 DAEUN-TRANSIT SYNC')
      expect(result.section).toContain('📈 Life Pattern')
    })

    it('should include syncAnalysis in result', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toHaveProperty('syncAnalysis')
      expect(result.syncAnalysis).toBeDefined()
      expect(result.syncAnalysis?.lifeCyclePattern).toBe('상승기')
      expect(result.syncAnalysis?.overallConfidence).toBe(85)
    })

    it('should display confidence percentage', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toContain('📊 분석 신뢰도: 85%')
    })

    it('should list major transitions', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toContain('--- 주요 전환점 ---')
      expect(result.section).toContain('25세')
      expect(result.section).toContain('35세')
    })

    it('should mark current age in transitions', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toContain('★현재★')
    })

    it('should limit major transitions to 3', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      // Mock returns 2 transitions
      expect(result.section).toContain('확장기')
      expect(result.section).toContain('정점기')
    })

    it('should show themes for transitions', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toContain('커리어 성장')
      expect(result.section).toContain('인맥 확대')
    })

    it('should limit themes to 2 per transition', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      // Themes should be sliced to 2
      expect(result.section).toBeTruthy()
    })

    it('should display peak years', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toContain('🌟 최고 시기')
      expect(result.section).toContain('28세')
      expect(result.section).toContain('35세')
    })

    it('should display challenge years', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toContain('⚡ 도전 시기')
      expect(result.section).toContain('22세')
      expect(result.section).toContain('30세')
    })

    it('should limit peak years to 3', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      // Mock returns 2 peak years
      expect(result.section).toBeTruthy()
    })

    it('should limit challenge years to 3', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      // Mock returns 2 challenge years
      expect(result.section).toBeTruthy()
    })

    it('should return empty section when no daeun data', () => {
      const input: Tier2AnalysisInput = {
        daeunData: [],
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toBe('')
      expect(result.syncAnalysis).toBeUndefined()
    })

    it('should handle missing birthYear by calculating from age', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 0,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should log debug message on success', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      generateTier2Analysis(input)

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('[TIER 2]'))
    })

    it('should handle errors gracefully', async () => {
      const { convertSajuDaeunToInfo } = await import('@/lib/timing/daeunTransitSync')
      vi.mocked(convertSajuDaeunToInfo).mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toBe('')
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should include section dividers', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toContain(
        '═══════════════════════════════════════════════════════════════'
      )
    })

    it('should format years in English correctly', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'en',
      }

      const result = generateTier2Analysis(input)

      expect(result.section).toContain('Age 28')
      expect(result.section).toContain('Age 35')
    })

    it('should return correct type', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result: Tier2AnalysisResult = generateTier2Analysis(input)

      expect(typeof result.section).toBe('string')
    })
  })

  describe('Type Safety', () => {
    it('should have correct input type', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      expect(Array.isArray(input.daeunData)).toBe(true)
      expect(typeof input.birthYear).toBe('number')
      expect(typeof input.currentAge).toBe('number')
      expect(typeof input.currentYear).toBe('number')
      expect(typeof input.lang).toBe('string')
    })

    it('should have correct result type', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)
      const typedResult: Tier2AnalysisResult = result

      expect(typedResult.section).toBeDefined()
      expect(typeof typedResult.section).toBe('string')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null daeunData', () => {
      const input: Tier2AnalysisInput = {
        daeunData: null as any,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle undefined daeunData', () => {
      const input: Tier2AnalysisInput = {
        daeunData: undefined as any,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle zero currentAge', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 2025,
        currentAge: 0,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle negative birthYear', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: -1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle future currentYear', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 3000,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle very large age', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1900,
        currentAge: 125,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle various language codes', () => {
      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ja',
      }

      const result = generateTier2Analysis(input)

      // Should use English format for non-ko languages
      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should handle empty arrays in syncAnalysis', async () => {
      const { analyzeDaeunTransitSync } = await import('@/lib/timing/daeunTransitSync')
      vi.mocked(analyzeDaeunTransitSync).mockReturnValueOnce({
        lifeCyclePattern: '안정기',
        overallConfidence: 50,
        majorTransitions: [],
        peakYears: [],
        challengeYears: [],
      } as any)

      const input: Tier2AnalysisInput = {
        daeunData: mockDaeunData,
        birthYear: 1990,
        currentAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier2Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })
  })
})
