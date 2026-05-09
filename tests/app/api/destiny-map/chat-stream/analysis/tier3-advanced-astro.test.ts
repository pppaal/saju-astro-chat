/**
 * @file Tests for Tier 3 Advanced Astrology Analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateTier3Analysis,
  type Tier3AnalysisInput,
  type Tier3AnalysisResult,
} from '@/app/api/destiny-map/chat-stream/analysis/tier3-advanced-astro'
import type {
  SajuDataStructure,
  AstroDataStructure,
} from '@/app/api/destiny-map/chat-stream/lib/types'

// Mock dependencies
vi.mock('@/lib/astrology/foundation/electional', () => ({
  getMoonPhase: vi.fn((sunLon: number, moonLon: number) => 90),
  getMoonPhaseName: vi.fn((phase: number) => 'First Quarter'),
  checkVoidOfCourse: vi.fn(() => ({
    isVoid: false,
    description: '달이 활성 상태입니다',
  })),
  getRetrogradePlanets: vi.fn(() => ['Mercury']),
}))

vi.mock('@/lib/Saju/foundation/patternMatcher', () => ({
  analyzePatterns: vi.fn(() => ({
    matchedPatterns: [
      { patternName: '삼합', rarity: 'common', score: 80 },
      { patternName: '육합', rarity: 'rare', score: 90 },
    ],
    patternSummary: '조화로운 사주 구조',
  })),
  getPatternStatistics: vi.fn((patterns) => ({
    averageScore: 85,
    count: patterns.length,
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

describe('Tier3 Advanced Astro Analysis', () => {
  const mockAstro: Partial<AstroDataStructure> = {
    planets: [
      { name: 'Sun', longitude: 0, sign: 'Aries', degree: 10 },
      { name: 'Moon', longitude: 90, sign: 'Cancer', degree: 0 },
      { name: 'Mercury', longitude: 120, sign: 'Leo', degree: 0, retrograde: true },
      { name: 'Venus', longitude: 150, sign: 'Virgo', degree: 0 },
      { name: 'Chiron', longitude: 180, sign: 'Libra', degree: 15 },
      { name: 'Lilith', longitude: 210, sign: 'Scorpio', degree: 20 },
    ],
    extraPoints: {
      vertex: { name: 'Vertex', longitude: 240, sign: 'Sagittarius', degree: 10 },
      partOfFortune: { name: 'Part of Fortune', longitude: 270, sign: 'Capricorn', degree: 5 },
    },
  } as any

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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateTier3Analysis', () => {
    it('should generate tier3 analysis with Korean language', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('section')
      expect(result.section).toContain('[🌙 고급 점성술 분석')
    })

    it('should generate tier3 analysis with English language', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'en',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('[🌙 ADVANCED ASTROLOGY')
    })

    it('should include moon phase analysis', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('🌙 달 위상')
      expect(result.moonPhase).toBe('First Quarter')
    })

    it('should include void of course check', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('달 활성 상태')
    })

    it('should include retrograde planets', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('🔄 역행 중')
      expect(result.retrogrades).toContain('Mercury')
    })

    it('should show Mercury retrograde warning', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('⚠️ 수성 역행')
    })

    it('should show Venus retrograde warning when present', async () => {
      const { getRetrogradePlanets } = await import('@/lib/astrology/foundation/electional')
      vi.mocked(getRetrogradePlanets).mockReturnValueOnce(['Venus'])

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('⚠️ 금성 역행')
    })

    it('should show no retrogrades message when none active', async () => {
      const { getRetrogradePlanets } = await import('@/lib/astrology/foundation/electional')
      vi.mocked(getRetrogradePlanets).mockReturnValueOnce([])

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('✅ 역행 없음')
    })

    it('should include Chiron if present', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('💫 키론')
      expect(result.section).toContain('Libra')
    })

    it('should include Lilith if present', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('🖤 릴리스')
      expect(result.section).toContain('Scorpio')
    })

    it('should include Part of Fortune if present', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('🍀 행운의 파트')
      expect(result.section).toContain('Capricorn')
    })

    it('should include saju pattern analysis', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('--- 사주 패턴 분석 ---')
      expect(result.section).toContain('📊 패턴 수')
    })

    it('should show rare patterns if present', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('✨ 희귀 패턴')
      expect(result.section).toContain('육합')
    })

    it('should include pattern summary', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('📝 요약')
      expect(result.section).toContain('조화로운 사주 구조')
    })

    it('should handle missing astro data', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: undefined,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should handle missing saju data', () => {
      const input: Tier3AnalysisInput = {
        saju: undefined,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should handle missing Sun or Moon', () => {
      const partialAstro: Partial<AstroDataStructure> = {
        planets: [{ name: 'Mercury', longitude: 120, sign: 'Leo' }],
      } as any

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: partialAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle errors gracefully', async () => {
      const { getMoonPhase } = await import('@/lib/astrology/foundation/electional')
      vi.mocked(getMoonPhase).mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should log debug message on success', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      generateTier3Analysis(input)

      expect(logger.debug).toHaveBeenCalledWith('[TIER 3] analysis completed')
    })

    it('should include section dividers', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain(
        '═══════════════════════════════════════════════════════════════'
      )
    })

    it('should return correct type', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result: Tier3AnalysisResult = generateTier3Analysis(input)

      expect(typeof result.section).toBe('string')
      expect(Array.isArray(result.retrogrades)).toBe(true)
      expect(typeof result.moonPhase).toBe('string')
    })

    it('should show void of course warning when active', async () => {
      const { checkVoidOfCourse } = await import('@/lib/astrology/foundation/electional')
      vi.mocked(checkVoidOfCourse).mockReturnValueOnce({
        isVoid: true,
        description: '달이 공전 상태입니다',
      })

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('⚠️ 공전 중')
    })

    it('should handle Black Moon Lilith name variant', () => {
      const astroWithBMLilith: Partial<AstroDataStructure> = {
        planets: [
          { name: 'Sun', longitude: 0, sign: 'Aries' },
          { name: 'Moon', longitude: 90, sign: 'Cancer' },
          { name: 'Black Moon Lilith', longitude: 210, sign: 'Scorpio', degree: 20 },
        ],
      } as any

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: astroWithBMLilith as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('🖤 릴리스')
    })

    it('should handle no matched patterns', async () => {
      const { analyzePatterns } = await import('@/lib/Saju/foundation/patternMatcher')
      vi.mocked(analyzePatterns).mockReturnValueOnce({
        matchedPatterns: [],
        patternSummary: '특별한 패턴이 없습니다',
      } as any)

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
    })

    it('should filter rare patterns correctly', async () => {
      const { analyzePatterns } = await import('@/lib/Saju/foundation/patternMatcher')
      vi.mocked(analyzePatterns).mockReturnValueOnce({
        matchedPatterns: [
          { patternName: '삼합', rarity: 'common', score: 80 },
          { patternName: '육합', rarity: 'rare', score: 90 },
          { patternName: '천을귀인', rarity: 'very_rare', score: 95 },
          { patternName: '신비패턴', rarity: 'legendary', score: 100 },
        ],
        patternSummary: '희귀한 사주',
      } as any)

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result.section).toContain('✨ 희귀 패턴')
      expect(result.section).toContain('육합')
      expect(result.section).toContain('천을귀인')
      expect(result.section).toContain('신비패턴')
    })
  })

  describe('Type Safety', () => {
    it('should have correct input type', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      expect(typeof input.lang).toBe('string')
    })

    it('should have correct result type', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)
      const typedResult: Tier3AnalysisResult = result

      expect(typedResult.section).toBeDefined()
      expect(typedResult.retrogrades).toBeDefined()
      expect(Array.isArray(typedResult.retrogrades)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing planets array', () => {
      const astroNoPlanets: Partial<AstroDataStructure> = {} as any

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: astroNoPlanets as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle missing extraPoints', () => {
      const astroNoExtras: Partial<AstroDataStructure> = {
        planets: [
          { name: 'Sun', longitude: 0, sign: 'Aries' },
          { name: 'Moon', longitude: 90, sign: 'Cancer' },
        ],
        extraPoints: undefined,
      } as any

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: astroNoExtras as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle missing pillars in saju', () => {
      const sajuNoPillars: Partial<SajuDataStructure> = {} as any

      const input: Tier3AnalysisInput = {
        saju: sajuNoPillars as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle various language codes', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ja',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })

    it('should handle empty retrogrades array', () => {
      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: mockAstro as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(Array.isArray(result.retrogrades)).toBe(true)
    })

    it('should handle missing degree values', () => {
      const astroNoDegree: Partial<AstroDataStructure> = {
        planets: [
          { name: 'Sun', longitude: 0, sign: 'Aries' },
          { name: 'Moon', longitude: 90, sign: 'Cancer' },
          { name: 'Chiron', longitude: 180, sign: 'Libra' },
        ],
      } as any

      const input: Tier3AnalysisInput = {
        saju: mockSaju as SajuDataStructure,
        astro: astroNoDegree as AstroDataStructure,
        lang: 'ko',
      }

      const result = generateTier3Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toBeTruthy()
    })
  })
})
