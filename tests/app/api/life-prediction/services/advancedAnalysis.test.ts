/**
 * @file Tests for Advanced Analysis Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateMoonPhaseFromDegree,
  performAdvancedAnalysis,
  analyzeYearWithAdvanced,
  generateAdvancedPromptContext,
} from '@/app/api/life-prediction/services/advancedAnalysis'

// Mock dependencies
vi.mock('@/lib/prediction/ultraPrecisionEngine', () => ({
  calculateUltraPrecisionScore: vi.fn(() => ({
    gongmang: {
      emptyBranches: ['午', '未'],
      isToday空: true,
      affectedAreas: ['재물', '건강'],
    },
    shinsal: {
      active: [
        { name: '천을귀인', type: 'lucky', description: '귀인의 도움' },
        { name: '백호살', type: 'unlucky', description: '사고 주의' },
      ],
      score: 65,
    },
    energyFlow: {
      energyStrength: 'strong',
      dominantElement: '목',
      tonggeun: ['甲', '乙'],
      tuechul: ['丙'],
    },
    hourlyAdvice: [
      { hour: 9, quality: 'excellent', activity: '미팅' },
      { hour: 11, quality: 'good', activity: '서류작업' },
      { hour: 14, quality: 'average', activity: '휴식' },
      { hour: 16, quality: 'excellent', activity: '계약' },
    ],
  })),
}))

vi.mock('@/lib/prediction/daeunTransitSync', () => ({
  analyzeDaeunTransitSync: vi.fn(() => ({
    syncPoints: [{ age: 34, synergyScore: 78, themes: ['커리어 성장', '재물 증가'] }],
    majorTransitions: [{ themes: ['변화', '도전'] }],
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Advanced Analysis Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateMoonPhaseFromDegree', () => {
    it('should return new_moon for 0 degrees', () => {
      const result = calculateMoonPhaseFromDegree(0)
      expect(result.phase).toBe('new_moon')
      expect(result.name).toBe('새달')
      expect(result.illumination).toBe(0)
    })

    it('should return waxing_crescent for 60 degrees', () => {
      const result = calculateMoonPhaseFromDegree(60)
      expect(result.phase).toBe('waxing_crescent')
      expect(result.name).toBe('초승달')
    })

    it('should return first_quarter for 100 degrees', () => {
      const result = calculateMoonPhaseFromDegree(100)
      expect(result.phase).toBe('first_quarter')
      expect(result.name).toBe('상현달')
    })

    it('should return waxing_gibbous for 150 degrees', () => {
      const result = calculateMoonPhaseFromDegree(150)
      expect(result.phase).toBe('waxing_gibbous')
      expect(result.name).toBe('차오르는 달')
    })

    it('should return full_moon for 200 degrees', () => {
      const result = calculateMoonPhaseFromDegree(200)
      expect(result.phase).toBe('full_moon')
      expect(result.name).toBe('보름달')
    })

    it('should return waning_gibbous for 250 degrees', () => {
      const result = calculateMoonPhaseFromDegree(250)
      expect(result.phase).toBe('waning_gibbous')
      expect(result.name).toBe('기우는 달')
    })

    it('should return last_quarter for 290 degrees', () => {
      const result = calculateMoonPhaseFromDegree(290)
      expect(result.phase).toBe('last_quarter')
      expect(result.name).toBe('하현달')
    })

    it('should return waning_crescent for 330 degrees', () => {
      const result = calculateMoonPhaseFromDegree(330)
      expect(result.phase).toBe('waning_crescent')
      expect(result.name).toBe('그믐달')
    })

    it('should normalize negative degrees', () => {
      const result = calculateMoonPhaseFromDegree(-90)
      // -90 normalized = 270 → last_quarter
      expect(result.phase).toBe('last_quarter')
    })

    it('should normalize degrees over 360', () => {
      const result = calculateMoonPhaseFromDegree(400)
      // 400 % 360 = 40 → new_moon
      expect(result.phase).toBe('new_moon')
    })

    it('should calculate illumination correctly for 180 degrees', () => {
      const result = calculateMoonPhaseFromDegree(180)
      // cos(180°) = -1 → illumination = (1-(-1))/2*100 = 100
      expect(result.illumination).toBe(100)
    })

    it('should calculate illumination correctly for 90 degrees', () => {
      const result = calculateMoonPhaseFromDegree(90)
      // cos(90°) = 0 → illumination = (1-0)/2*100 = 50
      expect(result.illumination).toBe(50)
    })
  })

  describe('performAdvancedAnalysis', () => {
    const baseReq = {
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 1,
      gender: 'male' as const,
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '丑',
      yearBranch: '午',
    }

    const baseInput = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      latitude: 37.5,
      longitude: 127.0,
    }

    it('should return tier1 analysis', () => {
      const result = performAdvancedAnalysis(baseReq as any, baseInput as any)

      expect(result.tier1).toBeDefined()
      expect(result.tier1!.gongmang).toBeDefined()
      expect(result.tier1!.gongmang!.isAffected).toBe(true)
      expect(result.tier1!.gongmang!.affectedAreas).toEqual(['재물', '건강'])
    })

    it('should filter hourlyAdvice to excellent and good only', () => {
      const result = performAdvancedAnalysis(baseReq as any, baseInput as any)

      expect(result.tier1!.hourlyAdvice).toHaveLength(3) // 2 excellent + 1 good
      expect(result.tier1!.hourlyAdvice![0].quality).toBe('excellent')
    })

    it('should return tier2 when daeunList provided', () => {
      const input = {
        ...baseInput,
        daeunList: [{ startAge: 30, endAge: 39, stem: '庚', branch: '申' }],
      }

      const result = performAdvancedAnalysis(baseReq as any, input as any)

      expect(result.tier2).toBeDefined()
      expect(result.tier2!.daeunSync).toBeDefined()
    })

    it('should not return tier2 without daeunList', () => {
      const result = performAdvancedAnalysis(baseReq as any, baseInput as any)

      expect(result.tier2).toBeUndefined()
    })

    it('should return tier3 with moon phase fallback when no astro data', () => {
      const result = performAdvancedAnalysis(baseReq as any, baseInput as any)

      expect(result.tier3).toBeDefined()
      expect(result.tier3!.moonPhase).toBeDefined()
      expect(result.tier3!.voidOfCourse).toEqual({ isVoid: false })
    })

    it('should use electional data when available for tier3', () => {
      const req = {
        ...baseReq,
        advancedAstro: {
          electional: {
            moonPhase: { phase: 'full_moon', illumination: 100, name: '보름달' },
            voidOfCourse: { isVoid: true, endsAt: '2025-03-01T14:00:00' },
            retrograde: ['Mercury', 'Venus'],
          },
        },
      }

      const result = performAdvancedAnalysis(req as any, baseInput as any)

      expect(result.tier3!.moonPhase!.phase).toBe('full_moon')
      expect(result.tier3!.voidOfCourse!.isVoid).toBe(true)
      expect(result.tier3!.retrogrades).toEqual(['Mercury', 'Venus'])
    })

    it('should compute moon phase from astroChart planets', () => {
      const req = {
        ...baseReq,
        astroChart: {
          sun: { longitude: 0 },
          moon: { longitude: 180 },
          planets: [
            { name: 'Mercury', isRetrograde: true },
            { name: 'Venus', isRetrograde: false },
          ],
        },
      }

      const result = performAdvancedAnalysis(req as any, baseInput as any)

      expect(result.tier3!.moonPhase!.phase).toBe('full_moon')
      expect(result.tier3!.retrogrades).toEqual(['Mercury'])
    })

    it('should include eclipse impact from advancedAstro', () => {
      const req = {
        ...baseReq,
        advancedAstro: {
          electional: {
            moonPhase: { phase: 'new_moon', illumination: 0, name: '새달' },
            voidOfCourse: { isVoid: false },
            retrograde: [],
          },
          eclipses: {
            impact: {
              type: 'solar',
              affectedPlanets: ['Sun', 'Moon'],
            },
          },
        },
      }

      const result = performAdvancedAnalysis(req as any, baseInput as any)

      expect((result.tier3 as any).eclipseImpact).toBeDefined()
      expect((result.tier3 as any).eclipseImpact.type).toBe('solar')
    })

    it('should include solar return from advancedAstro', () => {
      const req = {
        ...baseReq,
        advancedAstro: {
          electional: {
            moonPhase: { phase: 'new_moon', illumination: 0, name: '새달' },
            voidOfCourse: { isVoid: false },
            retrograde: [],
          },
          solarReturn: {
            summary: {
              year: 2025,
              theme: 'growth',
              keyPlanets: ['Jupiter', 'Venus'],
            },
          },
        },
      }

      const result = performAdvancedAnalysis(req as any, baseInput as any)

      expect((result.tier3 as any).solarReturnTheme).toBeDefined()
      expect((result.tier3 as any).solarReturnTheme.year).toBe(2025)
    })

    it('should handle errors gracefully', async () => {
      const { calculateUltraPrecisionScore } = vi.mocked(
        await import('@/lib/prediction/ultraPrecisionEngine')
      )
      calculateUltraPrecisionScore.mockImplementationOnce(() => {
        throw new Error('Engine error')
      })

      const result = performAdvancedAnalysis(baseReq as any, baseInput as any)

      expect(result).toBeDefined()
      expect(result.tier1).toBeUndefined()
    })
  })

  describe('analyzeYearWithAdvanced', () => {
    const baseReq = {
      birthYear: 1990,
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '丑',
      yearBranch: '午',
    }

    it('should return year and analysis result', () => {
      const result = analyzeYearWithAdvanced(baseReq as any, {} as any, 2025)

      expect(result.year).toBe(2025)
      expect(result.advancedInsights).toBeDefined()
    })
  })

  describe('generateAdvancedPromptContext', () => {
    it('should generate Korean prompt for tier1', () => {
      const analysis = {
        tier1: {
          gongmang: { isAffected: true, affectedAreas: ['재물'], emptyBranches: [] },
          shinsal: {
            active: [
              { name: '천을귀인', type: 'lucky', description: '도움' },
              { name: '백호살', type: 'unlucky', description: '주의' },
            ],
            score: 70,
          },
          energyFlow: { strength: 'strong', dominantElement: '목' },
          hourlyAdvice: [{ hour: 9, quality: 'excellent', activity: '미팅' }],
        },
      }

      const result = generateAdvancedPromptContext(analysis as any, 'ko')

      expect(result).toContain('고급 분석 (TIER 1~3)')
      expect(result).toContain('TIER 1: 초정밀 분석')
      expect(result).toContain('공망 활성')
      expect(result).toContain('천을귀인(길)')
      expect(result).toContain('에너지: strong (목)')
      expect(result).toContain('9시')
    })

    it('should generate Korean prompt for tier2', () => {
      const analysis = {
        tier2: {
          daeunSync: {
            currentDaeun: { stem: '庚', branch: '申', age: 34 },
            transitAlignment: 78,
            majorThemes: ['커리어', '재물'],
          },
        },
      }

      const result = generateAdvancedPromptContext(analysis as any, 'ko')

      expect(result).toContain('TIER 2: 대운-트랜짓 동기화')
      expect(result).toContain('庚申')
      expect(result).toContain('78%')
      expect(result).toContain('커리어')
    })

    it('should generate Korean prompt for tier3', () => {
      const analysis = {
        tier3: {
          moonPhase: { name: '보름달', illumination: 100, phase: 'full_moon' },
          voidOfCourse: { isVoid: true },
          retrogrades: ['Mercury', 'Venus'],
          sajuPatterns: {
            found: [{ name: '삼합패턴', rarity: 85, description: '강한 패턴' }],
            rarityScore: 85,
          },
        },
      }

      const result = generateAdvancedPromptContext(analysis as any, 'ko')

      expect(result).toContain('TIER 3: 고급 점성술 + 패턴')
      expect(result).toContain('보름달 (100%)')
      expect(result).toContain('Void of Course')
      expect(result).toContain('Mercury')
      expect(result).toContain('수성 역행')
      expect(result).toContain('삼합패턴')
      expect(result).toContain('85/100')
    })

    it('should generate English prompt', () => {
      const analysis = {
        tier1: {
          gongmang: { isAffected: true, affectedAreas: ['wealth'] },
          energyFlow: { strength: 'strong' },
        },
        tier2: {
          daeunSync: {
            transitAlignment: 78,
            majorThemes: [],
          },
        },
        tier3: {
          moonPhase: { name: 'Full Moon', phase: 'full_moon', illumination: 100 },
          retrogrades: ['Mercury'],
        },
      }

      const result = generateAdvancedPromptContext(analysis as any, 'en')

      expect(result).toContain('Advanced Analysis (TIER 1~3)')
      expect(result).toContain('TIER 1: Ultra-Precision')
      expect(result).toContain('Gongmang Active')
      expect(result).toContain('TIER 2: Daeun-Transit Sync')
      expect(result).toContain('78%')
      expect(result).toContain('TIER 3: Advanced Astrology')
      expect(result).toContain('Full Moon')
    })

    it('should handle empty analysis', () => {
      const result = generateAdvancedPromptContext({}, 'ko')

      expect(result).toContain('고급 분석')
      // Header contains 'TIER 1~3' but no actual tier1 section
      expect(result).not.toContain('【TIER 1: 초정밀 분석】')
    })
  })
})
