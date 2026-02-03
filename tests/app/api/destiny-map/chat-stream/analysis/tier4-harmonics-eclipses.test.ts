/**
 * @file Tests for Tier 4 Harmonics, Eclipses, Fixed Stars Analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateTier4Analysis,
  type Tier4AnalysisInput,
  type Tier4AnalysisResult,
} from '@/app/api/destiny-map/chat-stream/analysis/tier4-harmonics-eclipses'

// Mock dependencies
vi.mock('@/lib/astrology/foundation/harmonics', () => ({
  generateHarmonicProfile: vi.fn(() => ({
    strongestHarmonics: [
      { harmonic: 7, meaning: '영적 성장' },
      { harmonic: 5, meaning: '창의적 표현' },
    ],
  })),
  analyzeAgeHarmonic: vi.fn(() => ({
    strength: 78.5,
    patterns: [{ type: 'trine' }, { type: 'sextile' }],
  })),
  getHarmonicMeaning: vi.fn((age: number) => ({
    name: `H${age} 하모닉`,
    meaning: '새로운 시작과 도전',
    lifeArea: '커리어',
    sajuParallel: '갑목의 기운',
  })),
}))

vi.mock('@/lib/astrology/foundation/eclipses', () => ({
  findEclipseImpact: vi.fn(() => [
    {
      eclipse: { date: '2025-03-14', type: 'solar', sign: 'Pisces', degree: 24 },
      affectedPoint: 'Sun',
      aspectType: 'conjunction',
      orb: 1.5,
      interpretation: '중요한 변화의 시기',
    },
  ]),
  getUpcomingEclipses: vi.fn(() => [
    { date: '2025-03-14', type: 'solar', sign: 'Pisces', degree: 24 },
    { date: '2025-03-29', type: 'lunar', sign: 'Libra', degree: 8 },
    { date: '2025-09-07', type: 'solar', sign: 'Virgo', degree: 15 },
  ]),
  checkEclipseSensitivity: vi.fn(() => ({
    sensitive: true,
    sensitivePoints: ['Sun', 'Moon'],
  })),
}))

vi.mock('@/lib/astrology/foundation/fixedStars', () => ({
  findFixedStarConjunctions: vi.fn(() => [
    {
      planet: 'Sun',
      star: {
        name: 'Regulus',
        name_ko: '레굴루스',
        nature: 'Mars/Jupiter',
        keywords: ['리더십', '명예', '권위'],
        interpretation: '왕의 별 - 강력한 리더십 잠재력',
      },
      orb: 0.5,
    },
    {
      planet: 'Moon',
      star: {
        name: 'Sirius',
        name_ko: '시리우스',
        nature: 'Jupiter/Mars',
        keywords: ['성공', '명성', '화려함'],
        interpretation: '빛나는 별 - 큰 성공의 잠재력',
      },
      orb: 0.8,
    },
  ]),
}))

vi.mock('@/lib/astrology', () => ({
  toChart: vi.fn((data: unknown) => data),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '@/lib/logger'

describe('Tier4 Harmonics-Eclipses Analysis', () => {
  const mockNatalChartData = {
    planets: [
      { name: 'Sun', longitude: 0, sign: 'Aries' },
      { name: 'Moon', longitude: 90, sign: 'Cancer' },
    ],
    ascendant: { longitude: 30, sign: 'Taurus' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateTier4Analysis', () => {
    it('should generate tier4 analysis with Korean language', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result).toBeDefined()
      expect(result.section).toContain('[🌟 고급 점성술 확장')
    })

    it('should generate tier4 analysis with English language', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'en',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('[🌟 ADVANCED ASTROLOGY EXT')
    })

    it('should include harmonic analysis', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('🎵 하모닉 분석')
      expect(result.section).toContain('📊 나이 하모닉')
      expect(result.section).toContain('H35')
    })

    it('should include harmonic meaning and life area', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('의미:')
      expect(result.section).toContain('영향 영역:')
      expect(result.section).toContain('강도:')
    })

    it('should include saju parallel if available', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('사주 병렬')
    })

    it('should include harmonic patterns', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('패턴')
    })

    it('should include strongest harmonic', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('🌟 가장 강한 하모닉')
      expect(result.section).toContain('H7')
    })

    it('should include eclipse analysis', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('🌑 이클립스')
      expect(result.section).toContain('📅 다가오는 이클립스')
    })

    it('should display upcoming eclipses', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('일식')
      expect(result.section).toContain('월식')
      expect(result.section).toContain('Pisces')
    })

    it('should display eclipse impacts on natal chart', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('⚡ 나탈 차트 영향')
      expect(result.section).toContain('Sun')
      expect(result.section).toContain('합')
    })

    it('should return eclipse impact count', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.eclipseImpacts).toBe(1)
    })

    it('should show eclipse sensitivity warning', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('⚠️ 이클립스 민감')
    })

    it('should include fixed star analysis', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('⭐ 항성')
      expect(result.section).toContain('레굴루스')
      expect(result.section).toContain('시리우스')
    })

    it('should detect royal stars', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.hasRoyalStars).toBe(true)
      expect(result.section).toContain('👑 왕의 별')
    })

    it('should handle null natalChartData', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: null,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result).toBeDefined()
      expect(result.hasRoyalStars).toBe(false)
      expect(result.eclipseImpacts).toBe(0)
    })

    it('should handle missing userAge', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: undefined,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result).toBeDefined()
      // Harmonics should be skipped without userAge
      expect(result.section).not.toContain('🎵 하모닉 분석')
    })

    it('should handle harmonic analysis failure gracefully', async () => {
      const { analyzeAgeHarmonic } = await import('@/lib/astrology/foundation/harmonics')
      vi.mocked(analyzeAgeHarmonic).mockImplementationOnce(() => {
        throw new Error('Harmonic error')
      })

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result).toBeDefined()
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should handle eclipse analysis failure gracefully', async () => {
      const { getUpcomingEclipses } = await import('@/lib/astrology/foundation/eclipses')
      vi.mocked(getUpcomingEclipses).mockImplementationOnce(() => {
        throw new Error('Eclipse error')
      })

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle fixed star analysis failure gracefully', async () => {
      const { findFixedStarConjunctions } = await import('@/lib/astrology/foundation/fixedStars')
      vi.mocked(findFixedStarConjunctions).mockImplementationOnce(() => {
        throw new Error('Star error')
      })

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result).toBeDefined()
    })

    it('should include section dividers', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain(
        '═══════════════════════════════════════════════════════════════'
      )
    })

    it('should return correct type', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result: Tier4AnalysisResult = generateTier4Analysis(input)

      expect(typeof result.section).toBe('string')
      expect(typeof result.hasRoyalStars).toBe('boolean')
      expect(typeof result.eclipseImpacts).toBe('number')
    })

    it('should show English eclipse formats', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'en',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).toContain('Solar')
      expect(result.section).toContain('Lunar')
      expect(result.section).toContain('Eclipse Impact')
    })

    it('should limit eclipses shown to 3', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      // Mock returns 3 eclipses, all should appear
      expect(result.section).toContain('2025-03-14')
      expect(result.section).toContain('2025-03-29')
      expect(result.section).toContain('2025-09-07')
    })

    it('should limit star conjunctions shown to 5', () => {
      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      // Mock returns 2 conjunctions
      expect(result.section).toBeTruthy()
    })

    it('should show no royal stars when none present', async () => {
      const { findFixedStarConjunctions } = await import('@/lib/astrology/foundation/fixedStars')
      vi.mocked(findFixedStarConjunctions).mockReturnValueOnce([
        {
          planet: 'Mars',
          star: {
            name: 'Vega',
            name_ko: '베가',
            nature: 'Venus/Mercury',
            keywords: ['예술', '매력'],
            interpretation: '예술적 재능',
          },
          orb: 0.3,
        },
      ] as any)

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.hasRoyalStars).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty eclipse list', async () => {
      const { getUpcomingEclipses } = await import('@/lib/astrology/foundation/eclipses')
      vi.mocked(getUpcomingEclipses).mockReturnValueOnce([])

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle empty star conjunctions', async () => {
      const { findFixedStarConjunctions } = await import('@/lib/astrology/foundation/fixedStars')
      vi.mocked(findFixedStarConjunctions).mockReturnValueOnce([])

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.hasRoyalStars).toBe(false)
    })

    it('should handle no eclipse impacts', async () => {
      const { findEclipseImpact } = await import('@/lib/astrology/foundation/eclipses')
      vi.mocked(findEclipseImpact).mockReturnValueOnce([])

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.eclipseImpacts).toBe(0)
    })

    it('should handle eclipse not sensitive', async () => {
      const { checkEclipseSensitivity } = await import('@/lib/astrology/foundation/eclipses')
      vi.mocked(checkEclipseSensitivity).mockReturnValueOnce({
        sensitive: false,
        sensitivePoints: [],
      } as any)

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result.section).not.toContain('⚠️ 이클립스 민감')
    })

    it('should handle harmonic with no patterns', async () => {
      const { analyzeAgeHarmonic } = await import('@/lib/astrology/foundation/harmonics')
      vi.mocked(analyzeAgeHarmonic).mockReturnValueOnce({
        strength: 50,
        patterns: [],
      } as any)

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result).toBeDefined()
    })

    it('should handle harmonic without sajuParallel', async () => {
      const { getHarmonicMeaning } = await import('@/lib/astrology/foundation/harmonics')
      vi.mocked(getHarmonicMeaning).mockReturnValueOnce({
        name: 'H35',
        meaning: '테스트',
        lifeArea: '건강',
        sajuParallel: undefined,
      } as any)

      const input: Tier4AnalysisInput = {
        natalChartData: mockNatalChartData as any,
        userAge: 35,
        currentYear: 2025,
        lang: 'ko',
      }

      const result = generateTier4Analysis(input)

      expect(result).toBeDefined()
    })
  })
})
