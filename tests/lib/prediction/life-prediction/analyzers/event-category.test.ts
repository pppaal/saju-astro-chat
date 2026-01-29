import { describe, it, expect } from 'vitest'
import {
  generateDetailedEventAnalysis,
  getSibsinEffect,
  getStageEffect,
} from '@/lib/prediction/life-prediction/analyzers/event-category'
import type {
  EventCategoryScores,
  CausalFactor,
  SolarTerm,
  LunarMansion,
} from '@/lib/prediction/precisionEngine'

describe('Event Category Analyzers', () => {
  describe('getSibsinEffect()', () => {
    describe('Career effects', () => {
      it('should return career effect for 정관', () => {
        const effect = getSibsinEffect('정관', 'career')
        expect(effect).toBeDefined()
        expect(effect).toContain('정관운')
        expect(effect).toContain('승진')
      })

      it('should return career effect for 편관', () => {
        const effect = getSibsinEffect('편관', 'career')
        expect(effect).toBeDefined()
        expect(effect).toContain('경쟁')
      })

      it('should return career effect for 상관', () => {
        const effect = getSibsinEffect('상관', 'career')
        expect(effect).toBeDefined()
        expect(effect).toContain('변화')
      })
    })

    describe('Finance effects', () => {
      it('should return finance effect for 정재', () => {
        const effect = getSibsinEffect('정재', 'finance')
        expect(effect).toBeDefined()
        expect(effect).toContain('안정적 수입')
      })

      it('should return finance effect for 편재', () => {
        const effect = getSibsinEffect('편재', 'finance')
        expect(effect).toBeDefined()
        expect(effect).toContain('투자')
      })

      it('should return finance effect for 식신', () => {
        const effect = getSibsinEffect('식신', 'finance')
        expect(effect).toBeDefined()
        expect(effect).toContain('수입')
      })

      it('should return finance warning for 겁재', () => {
        const effect = getSibsinEffect('겁재', 'finance')
        expect(effect).toBeDefined()
        expect(effect).toContain('지출 주의')
      })
    })

    describe('Relationship effects', () => {
      it('should return relationship effect for 정관', () => {
        const effect = getSibsinEffect('정관', 'relationship')
        expect(effect).toBeDefined()
        expect(effect).toContain('귀인')
      })

      it('should return relationship effect for 정재', () => {
        const effect = getSibsinEffect('정재', 'relationship')
        expect(effect).toBeDefined()
        expect(effect).toContain('좋은 인연')
      })

      it('should return relationship effect for 비견', () => {
        const effect = getSibsinEffect('비견', 'relationship')
        expect(effect).toBeDefined()
        expect(effect).toContain('협력')
      })
    })

    describe('Health effects', () => {
      it('should return health warning for 편관', () => {
        const effect = getSibsinEffect('편관', 'health')
        expect(effect).toBeDefined()
        expect(effect).toContain('스트레스')
      })

      it('should return health effect for 정인', () => {
        const effect = getSibsinEffect('정인', 'health')
        expect(effect).toBeDefined()
        expect(effect).toContain('건강 양호')
      })

      it('should return health effect for 식신', () => {
        const effect = getSibsinEffect('식신', 'health')
        expect(effect).toBeDefined()
        expect(effect).toContain('건강 좋음')
      })
    })

    describe('Education effects', () => {
      it('should return education effect for 정인', () => {
        const effect = getSibsinEffect('정인', 'education')
        expect(effect).toBeDefined()
        expect(effect).toContain('학업 성취')
      })

      it('should return education effect for 편인', () => {
        const effect = getSibsinEffect('편인', 'education')
        expect(effect).toBeDefined()
        expect(effect).toContain('창의적')
      })

      it('should return education effect for 상관', () => {
        const effect = getSibsinEffect('상관', 'education')
        expect(effect).toBeDefined()
        expect(effect).toContain('학업')
      })
    })

    describe('Travel effects', () => {
      it('should return travel effect for 편재', () => {
        const effect = getSibsinEffect('편재', 'travel')
        expect(effect).toBeDefined()
        expect(effect).toContain('활동적')
      })

      it('should return travel effect for 편인', () => {
        const effect = getSibsinEffect('편인', 'travel')
        expect(effect).toBeDefined()
        expect(effect).toContain('이동운')
      })
    })

    describe('No effect cases', () => {
      it('should return null for sibsin with no effect on category', () => {
        const effect = getSibsinEffect('정관', 'travel')
        expect(effect).toBeNull()
      })

      it('should return null for unknown sibsin', () => {
        const effect = getSibsinEffect('unknown', 'career')
        expect(effect).toBeNull()
      })

      it('should handle empty string sibsin', () => {
        const effect = getSibsinEffect('', 'career')
        expect(effect).toBeNull()
      })
    })
  })

  describe('getStageEffect()', () => {
    describe('Career effects', () => {
      it('should return career effect for 관대', () => {
        const effect = getStageEffect('관대', 'career')
        expect(effect).toBeDefined()
        expect(effect).toContain('성장기')
      })

      it('should return career effect for 건록', () => {
        const effect = getStageEffect('건록', 'career')
        expect(effect).toBeDefined()
        expect(effect).toContain('직업 안정')
      })

      it('should return career peak for 제왕', () => {
        const effect = getStageEffect('제왕', 'career')
        expect(effect).toBeDefined()
        expect(effect).toContain('전성기')
      })

      it('should return career maintenance for 쇠', () => {
        const effect = getStageEffect('쇠', 'career')
        expect(effect).toBeDefined()
        expect(effect).toContain('현상 유지')
      })
    })

    describe('Health effects', () => {
      it('should return health energy for 장생', () => {
        const effect = getStageEffect('장생', 'health')
        expect(effect).toBeDefined()
        expect(effect).toContain('에너지')
      })

      it('should return health warning for 쇠', () => {
        const effect = getStageEffect('쇠', 'health')
        expect(effect).toBeDefined()
        expect(effect).toContain('건강 관리')
      })

      it('should return health warning for 병', () => {
        const effect = getStageEffect('병', 'health')
        expect(effect).toBeDefined()
        expect(effect).toContain('건강 주의')
      })

      it('should return recovery for 양', () => {
        const effect = getStageEffect('양', 'health')
        expect(effect).toBeDefined()
        expect(effect).toContain('회복')
      })
    })

    describe('Relationship effects', () => {
      it('should return relationship effect for 목욕', () => {
        const effect = getStageEffect('목욕', 'relationship')
        expect(effect).toBeDefined()
        expect(effect).toContain('새로운 만남')
      })

      it('should return relationship effect for 관대', () => {
        const effect = getStageEffect('관대', 'relationship')
        expect(effect).toBeDefined()
        expect(effect).toContain('인기')
      })

      it('should return relationship change for 절', () => {
        const effect = getStageEffect('절', 'relationship')
        expect(effect).toBeDefined()
        expect(effect).toContain('관계 정리')
      })

      it('should return new connection for 태', () => {
        const effect = getStageEffect('태', 'relationship')
        expect(effect).toBeDefined()
        expect(effect).toContain('새 인연')
      })
    })

    describe('Finance effects', () => {
      it('should return finance increase for 건록', () => {
        const effect = getStageEffect('건록', 'finance')
        expect(effect).toBeDefined()
        expect(effect).toContain('수입 증가')
      })

      it('should return finance peak for 제왕', () => {
        const effect = getStageEffect('제왕', 'finance')
        expect(effect).toBeDefined()
        expect(effect).toContain('재물 최고조')
      })

      it('should return finance warning for 사', () => {
        const effect = getStageEffect('사', 'finance')
        expect(effect).toBeDefined()
        expect(effect).toContain('지출 주의')
      })
    })

    describe('Education effects', () => {
      it('should return education start for 장생', () => {
        const effect = getStageEffect('장생', 'education')
        expect(effect).toBeDefined()
        expect(effect).toContain('새로운 시작')
      })

      it('should return education preparation for 태', () => {
        const effect = getStageEffect('태', 'education')
        expect(effect).toBeDefined()
        expect(effect).toContain('잉태기')
      })

      it('should return education growth for 양', () => {
        const effect = getStageEffect('양', 'education')
        expect(effect).toBeDefined()
        expect(effect).toContain('성장 준비')
      })
    })

    describe('Travel effects', () => {
      it('should return travel effect for 목욕', () => {
        const effect = getStageEffect('목욕', 'travel')
        expect(effect).toBeDefined()
        expect(effect).toContain('이동')
      })
    })

    describe('No effect cases', () => {
      it('should return null for stage with no effect on category', () => {
        const effect = getStageEffect('장생', 'finance')
        expect(effect).toBeNull()
      })

      it('should return null for unknown stage', () => {
        const effect = getStageEffect('unknown', 'career')
        expect(effect).toBeNull()
      })
    })
  })

  describe('generateDetailedEventAnalysis()', () => {
    const mockScores: EventCategoryScores = {
      career: 75,
      finance: 60,
      relationship: 80,
      health: 70,
      travel: 50,
      education: 65,
    }

    const mockCausalFactors: CausalFactor[] = [
      {
        factor: '천간합',
        description: '천간합으로 인한 협력 운',
        strength: 0.8,
        affectedAreas: ['커리어', '관계'],
      },
      {
        factor: '재성운',
        description: '재물운이 좋은 날',
        strength: 0.6,
        affectedAreas: ['재물', '재정'],
      },
    ]

    const mockSolarTerm: SolarTerm = {
      nameKo: '입춘',
      nameEn: 'Beginning of Spring',
      element: '목',
      description: '봄의 시작',
    }

    const mockLunarMansion: LunarMansion = {
      nameKo: '각',
      nameEn: 'Horn',
      goodFor: ['결혼', '계약'],
      badFor: ['이사'],
    }

    it('should generate analysis for all six categories', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        mockCausalFactors,
        '정관',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result).toHaveProperty('career')
      expect(result).toHaveProperty('finance')
      expect(result).toHaveProperty('relationship')
      expect(result).toHaveProperty('health')
      expect(result).toHaveProperty('travel')
      expect(result).toHaveProperty('education')
    })

    it('should include scores in each category', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        mockCausalFactors,
        '정관',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result.career.score).toBe(75)
      expect(result.finance.score).toBe(60)
      expect(result.relationship.score).toBe(80)
      expect(result.health.score).toBe(70)
      expect(result.travel.score).toBe(50)
      expect(result.education.score).toBe(65)
    })

    it('should include factors array in each category', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        mockCausalFactors,
        '정관',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(Array.isArray(result.career.factors)).toBe(true)
      expect(Array.isArray(result.finance.factors)).toBe(true)
      expect(Array.isArray(result.relationship.factors)).toBe(true)
    })

    it('should include whyHappened array in each category', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        mockCausalFactors,
        '정관',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(Array.isArray(result.career.whyHappened)).toBe(true)
      expect(Array.isArray(result.finance.whyHappened)).toBe(true)
    })

    it('should limit factors to 5 items', () => {
      const manyFactors: CausalFactor[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          factor: `factor${i}`,
          description: `description${i}`,
          strength: 0.5,
          affectedAreas: ['커리어'],
        }))

      const result = generateDetailedEventAnalysis(
        mockScores,
        manyFactors,
        '정관',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result.career.factors.length).toBeLessThanOrEqual(5)
    })

    it('should limit whyHappened to 3 items', () => {
      const manyFactors: CausalFactor[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          factor: `factor${i}`,
          description: `description${i}`,
          strength: 0.5,
          affectedAreas: ['커리어'],
        }))

      const result = generateDetailedEventAnalysis(
        mockScores,
        manyFactors,
        '정관',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result.career.whyHappened.length).toBeLessThanOrEqual(3)
    })

    it('should include sibsin effect in career factors', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result.career.factors.some((f) => f.includes('정관운'))).toBe(true)
    })

    it('should include stage effect in career factors', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result.career.factors.some((f) => f.includes('건록'))).toBe(true)
    })

    it('should include causal factors in relevant categories', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        mockCausalFactors,
        '정재',
        '제왕',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result.finance.factors.some((f) => f.includes('재성운'))).toBe(true)
    })

    it('should include lunar mansion effect for relationship when good for marriage', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정재',
        '목욕',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result.relationship.factors.some((f) => f.includes('각수'))).toBe(true)
    })

    it('should handle empty causal factors', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result).toBeDefined()
      expect(result.career).toBeDefined()
      expect(result.career.factors.length).toBeGreaterThan(0)
    })

    it('should match causal factors to correct categories', () => {
      const careerFactor: CausalFactor = {
        factor: '경쟁운',
        description: '경쟁이 치열한 날',
        strength: 0.7,
        affectedAreas: ['사업', '커리어'],
      }

      const result = generateDetailedEventAnalysis(
        mockScores,
        [careerFactor],
        '비견',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result.career.factors.includes('경쟁운')).toBe(true)
    })

    it('should match finance-related keywords', () => {
      const financeFactor: CausalFactor = {
        factor: '재물운',
        description: '재물이 들어오는 날',
        strength: 0.8,
        affectedAreas: ['재물', '재정'],
      }

      const result = generateDetailedEventAnalysis(
        mockScores,
        [financeFactor],
        '정재',
        '건록',
        mockSolarTerm,
        mockLunarMansion
      )

      expect(result.finance.whyHappened.some((w) => w.includes('재물'))).toBe(true)
    })

    it('should include health-related solar term effect', () => {
      const healthSolarTerm: SolarTerm = {
        nameKo: '처서',
        nameEn: 'End of Heat',
        element: '토',
        description: '더위가 물러가는 시기',
      }

      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정인',
        '장생',
        healthSolarTerm,
        mockLunarMansion
      )

      expect(result.health.factors.some((f) => f.includes('처서'))).toBe(true)
      expect(result.health.factors.some((f) => f.includes('건강 안정기'))).toBe(true)
    })
  })
})
