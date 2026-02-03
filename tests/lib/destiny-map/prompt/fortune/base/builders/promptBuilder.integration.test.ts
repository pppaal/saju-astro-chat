/**
 * promptBuilder.integration.test.ts - 전체 프롬프트 생성 통합 테스트
 *
 * 모든 모듈이 함께 동작하여 완전한 프롬프트를 생성하는지 검증
 */

import { describe, it, expect } from 'vitest'
import { buildComprehensivePrompt } from '@/lib/destiny-map/prompt/fortune/base/builders/promptBuilder'
import type { SajuData } from '@/lib/destiny-map/astrology/types'

describe('promptBuilder Integration Tests', () => {
  const mockSajuData: SajuData = {
    pillars: {
      year: { heavenlyStem: '甲', earthlyBranch: '子' },
      month: { heavenlyStem: '乙', earthlyBranch: '丑' },
      day: { heavenlyStem: '丙', earthlyBranch: '寅' },
      time: { heavenlyStem: '丁', earthlyBranch: '卯' },
    },
    dayMaster: '丙',
    daeun: {
      current: {
        pillar: { heavenlyStem: '戊', earthlyBranch: '辰' },
        startAge: 20,
        endAge: 29,
      },
      list: [
        { pillar: { heavenlyStem: '戊', earthlyBranch: '辰' }, startAge: 20, endAge: 29 },
        { pillar: { heavenlyStem: '己', earthlyBranch: '巳' }, startAge: 30, endAge: 39 },
      ],
    },
    annual: {
      current: { ganji: '甲辰', year: 2024 },
      list: [
        { ganji: '甲辰', year: 2024 },
        { ganji: '乙巳', year: 2025 },
      ],
    },
    monthly: {
      current: { ganji: '丙寅', month: 1 },
      list: [
        { ganji: '丙寅', month: 1 },
        { ganji: '丁卯', month: 2 },
      ],
    },
    sinsal: {
      lucky: ['천을귀인', '천덕귀인'],
      unlucky: ['백호살', '도화살'],
    },
    advancedAnalysis: {
      extended: {
        strength: {
          level: '신강',
          score: 75,
          rootCount: 3,
        },
        geokguk: {
          type: '정재격',
          description: '재물운이 좋은 격국',
        },
        yongsin: {
          primary: '木',
          secondary: '水',
          avoid: '金',
        },
      },
      sibsin: {
        count: {
          정재: 2,
          편재: 1,
          식신: 3,
        },
        dominantSibsin: ['식신', '정재'],
        missingSibsin: ['인수'],
        relationships: [
          { type: '배우자', quality: '조화로움' },
          { type: '친구', quality: '좋은 관계' },
        ],
        careerAptitudes: [
          { field: '예술', score: 85 },
          { field: '경영', score: 70 },
        ],
      },
      score: {
        total: 85,
        business: 75,
        wealth: 80,
        health: 70,
      },
    },
  }

  const mockAstrologyData = {
    planets: [
      { name: 'Sun', sign: 'Aries', house: 1, degree: 15 },
      { name: 'Moon', sign: 'Taurus', house: 2, degree: 20 },
      { name: 'Mercury', sign: 'Aries', house: 1, degree: 10 },
    ],
    houses: [
      { cusp: 0, sign: 'Aries' },
      { cusp: 30, sign: 'Taurus' },
      { cusp: 60, sign: 'Gemini' },
    ],
    aspects: [
      { planet1: 'Sun', planet2: 'Moon', type: 'trine', degree: 120 },
      { planet1: 'Mercury', planet2: 'Venus', type: 'conjunction', degree: 5 },
    ],
    facts: {
      elementRatios: {
        fire: 40,
        earth: 30,
        air: 20,
        water: 10,
      },
    },
    transits: [
      { transitPlanet: 'Jupiter', natalPoint: 'Sun', type: 'trine', isApplying: true },
      { transitPlanet: 'Saturn', natalPoint: 'Moon', type: 'square', isApplying: false },
    ],
    extraPoints: {
      chiron: { sign: 'Pisces', house: 12 },
      lilith: { sign: 'Scorpio', house: 8 },
    },
  }

  describe('Basic Integration', () => {
    it('should generate complete prompt with all data', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(500)
    })

    it('should include saju basic information', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      // Check that saju section exists
      expect(result.includes('PART 1') || result.includes('사주팔자')).toBe(true)
      // Check that advanced data is included
      expect(result.includes('신강') || result.includes('정재격')).toBe(true)
    })

    it('should include astrology information', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result).toContain('Sun')
      expect(result).toContain('Aries')
    })

    it('should include advanced analysis', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result).toContain('신강')
      expect(result).toContain('정재격')
    })
  })

  describe('Theme Variations', () => {
    it('should generate love theme', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should generate career theme', () => {
      const result = buildComprehensivePrompt('ko', 'career', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should generate health theme', () => {
      const result = buildComprehensivePrompt('ko', 'health', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should generate fortune theme', () => {
      const result = buildComprehensivePrompt('ko', 'fortune', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Module Integration', () => {
    it('should use ganjiFormatter module', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      // ganjiFormatter module should format data - check that saju data is present
      expect(result.includes('사주팔자') || result.includes('PART 1')).toBe(true)
    })

    it('should use astrologyFormatter module', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      // 행성 포맷팅이 적용되었는지 확인
      expect(result).toContain('Sun') && expect(result).toContain('Aries')
    })

    it('should use sajuSection module', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      // 대운 정보가 포함되었는지 확인
      expect(result.includes('20-29세') || result.includes('戊辰') || result.includes('대운')).toBe(
        true
      )
    })

    it('should use advancedSajuSection module', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      // 용신 정보가 포함되었는지 확인
      expect(result).toContain('木') // yongsin
    })

    it('should use astrologySection module', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      // 트랜싯 정보가 포함되었는지 확인
      expect(result).toContain('Jupiter') || expect(result).toContain('trine')
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimal saju data', () => {
      const minimalSaju: SajuData = {
        pillars: {
          year: { heavenlyStem: '甲', earthlyBranch: '子' },
          month: { heavenlyStem: '乙', earthlyBranch: '丑' },
          day: { heavenlyStem: '丙', earthlyBranch: '寅' },
          time: { heavenlyStem: '丁', earthlyBranch: '卯' },
        },
        dayMaster: '丙',
        advancedAnalysis: {}, // empty advanced analysis
      }

      const result = buildComprehensivePrompt('ko', 'love', {
        saju: minimalSaju,
      })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle missing astrology data', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
      })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should produce consistent output', () => {
      const result1 = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      const result2 = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result1).toBe(result2)
    })

    it('should not contain placeholder text', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result).not.toContain('TODO')
      expect(result).not.toContain('[object Object]')
    })
  })

  describe('Performance', () => {
    it('should generate prompt quickly', () => {
      const startTime = Date.now()

      buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(100) // Should complete within 100ms
    })

    it('should generate reasonably sized output', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result.length).toBeGreaterThan(500)
      expect(result.length).toBeLessThan(50000)
    })
  })

  describe('Data Completeness', () => {
    it('should include all major sections', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      // 주요 섹션들이 포함되어야 함
      expect(result).toContain('PART 1')
      expect(result).toContain('PART 2')
      expect(result).toContain('PART 3') || expect(result).toContain('PART 4')
    })

    it('should include sinsal information', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      // Sinsal section exists in output
      expect(result.includes('신살') || result.includes('길신') || result.includes('흉신')).toBe(
        true
      )
    })

    it('should include current luck periods', () => {
      const result = buildComprehensivePrompt('ko', 'love', {
        saju: mockSajuData,
        astrology: mockAstrologyData,
      })

      expect(result).toContain('대운') || expect(result).toContain('세운')
    })
  })
})
