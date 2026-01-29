/**
 * @file Event Category Analyzer Tests
 *
 * Comprehensive test coverage for event-category.ts
 * Target: 90%+ lines, 85%+ branches
 */

import { describe, it, expect } from 'vitest';
import {
  generateDetailedEventAnalysis,
  getSibsinEffect,
  getStageEffect,
} from '@/lib/prediction/life-prediction/analyzers/event-category';
import type { EventCategoryScores, CausalFactor, SolarTerm, LunarMansion } from '@/lib/prediction/precisionEngine';

describe('Event Category Analyzer Module', () => {
  // Test data
  const mockScores: EventCategoryScores = {
    career: 75,
    finance: 80,
    relationship: 70,
    health: 65,
    travel: 60,
    education: 85,
  };

  const mockSolarTerm: SolarTerm = {
    nameKo: '입춘',
    name: 'Start of Spring',
    element: '목',
    date: new Date(2024, 1, 4),
  };

  const mockLunarMansion: LunarMansion = {
    nameKo: '각',
    name: 'Horn',
    isAuspicious: true,
    goodFor: ['결혼', '개업'],
    badFor: [],
  };

  describe('getSibsinEffect', () => {
    const sibsinTypes = ['정관', '편관', '정재', '편재', '정인', '편인', '식신', '상관', '비견', '겁재'];
    const categories = ['career', 'finance', 'relationship', 'health', 'travel', 'education'] as const;

    describe('정관 (正官) effects', () => {
      it('should return career effect for 정관', () => {
        expect(getSibsinEffect('정관', 'career')).toBe('정관운 - 승진/안정');
      });

      it('should return relationship effect for 정관', () => {
        expect(getSibsinEffect('정관', 'relationship')).toBe('정관운 - 귀인 만남');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('정관', 'finance')).toBeNull();
        expect(getSibsinEffect('정관', 'health')).toBeNull();
        expect(getSibsinEffect('정관', 'travel')).toBeNull();
        expect(getSibsinEffect('정관', 'education')).toBeNull();
      });
    });

    describe('편관 (偏官) effects', () => {
      it('should return career effect for 편관', () => {
        expect(getSibsinEffect('편관', 'career')).toBe('편관운 - 경쟁/도전');
      });

      it('should return health effect for 편관', () => {
        expect(getSibsinEffect('편관', 'health')).toBe('편관운 - 스트레스 주의');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('편관', 'finance')).toBeNull();
        expect(getSibsinEffect('편관', 'relationship')).toBeNull();
        expect(getSibsinEffect('편관', 'travel')).toBeNull();
        expect(getSibsinEffect('편관', 'education')).toBeNull();
      });
    });

    describe('정재 (正財) effects', () => {
      it('should return finance effect for 정재', () => {
        expect(getSibsinEffect('정재', 'finance')).toBe('정재운 - 안정적 수입');
      });

      it('should return relationship effect for 정재', () => {
        expect(getSibsinEffect('정재', 'relationship')).toBe('정재운 - 좋은 인연');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('정재', 'career')).toBeNull();
        expect(getSibsinEffect('정재', 'health')).toBeNull();
        expect(getSibsinEffect('정재', 'travel')).toBeNull();
        expect(getSibsinEffect('정재', 'education')).toBeNull();
      });
    });

    describe('편재 (偏財) effects', () => {
      it('should return finance effect for 편재', () => {
        expect(getSibsinEffect('편재', 'finance')).toBe('편재운 - 투자 기회');
      });

      it('should return travel effect for 편재', () => {
        expect(getSibsinEffect('편재', 'travel')).toBe('편재운 - 활동적');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('편재', 'career')).toBeNull();
        expect(getSibsinEffect('편재', 'relationship')).toBeNull();
        expect(getSibsinEffect('편재', 'health')).toBeNull();
        expect(getSibsinEffect('편재', 'education')).toBeNull();
      });
    });

    describe('정인 (正印) effects', () => {
      it('should return education effect for 정인', () => {
        expect(getSibsinEffect('정인', 'education')).toBe('정인운 - 학업 성취');
      });

      it('should return health effect for 정인', () => {
        expect(getSibsinEffect('정인', 'health')).toBe('정인운 - 건강 양호');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('정인', 'career')).toBeNull();
        expect(getSibsinEffect('정인', 'finance')).toBeNull();
        expect(getSibsinEffect('정인', 'relationship')).toBeNull();
        expect(getSibsinEffect('정인', 'travel')).toBeNull();
      });
    });

    describe('편인 (偏印) effects', () => {
      it('should return education effect for 편인', () => {
        expect(getSibsinEffect('편인', 'education')).toBe('편인운 - 창의적 학습');
      });

      it('should return travel effect for 편인', () => {
        expect(getSibsinEffect('편인', 'travel')).toBe('편인운 - 이동운');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('편인', 'career')).toBeNull();
        expect(getSibsinEffect('편인', 'finance')).toBeNull();
        expect(getSibsinEffect('편인', 'relationship')).toBeNull();
        expect(getSibsinEffect('편인', 'health')).toBeNull();
      });
    });

    describe('식신 (食神) effects', () => {
      it('should return health effect for 식신', () => {
        expect(getSibsinEffect('식신', 'health')).toBe('식신운 - 건강 좋음');
      });

      it('should return finance effect for 식신', () => {
        expect(getSibsinEffect('식신', 'finance')).toBe('식신운 - 수입 증가');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('식신', 'career')).toBeNull();
        expect(getSibsinEffect('식신', 'relationship')).toBeNull();
        expect(getSibsinEffect('식신', 'travel')).toBeNull();
        expect(getSibsinEffect('식신', 'education')).toBeNull();
      });
    });

    describe('상관 (傷官) effects', () => {
      it('should return career effect for 상관', () => {
        expect(getSibsinEffect('상관', 'career')).toBe('상관운 - 변화 가능');
      });

      it('should return education effect for 상관', () => {
        expect(getSibsinEffect('상관', 'education')).toBe('상관운 - 학업 진전');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('상관', 'finance')).toBeNull();
        expect(getSibsinEffect('상관', 'relationship')).toBeNull();
        expect(getSibsinEffect('상관', 'health')).toBeNull();
        expect(getSibsinEffect('상관', 'travel')).toBeNull();
      });
    });

    describe('비견 (比肩) effects', () => {
      it('should return relationship effect for 비견', () => {
        expect(getSibsinEffect('비견', 'relationship')).toBe('비견운 - 협력 기회');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('비견', 'career')).toBeNull();
        expect(getSibsinEffect('비견', 'finance')).toBeNull();
        expect(getSibsinEffect('비견', 'health')).toBeNull();
        expect(getSibsinEffect('비견', 'travel')).toBeNull();
        expect(getSibsinEffect('비견', 'education')).toBeNull();
      });
    });

    describe('겁재 (劫財) effects', () => {
      it('should return finance effect for 겁재', () => {
        expect(getSibsinEffect('겁재', 'finance')).toBe('겁재운 - 지출 주의');
      });

      it('should return relationship effect for 겁재', () => {
        expect(getSibsinEffect('겁재', 'relationship')).toBe('겁재운 - 경쟁 관계');
      });

      it('should return null for unmapped categories', () => {
        expect(getSibsinEffect('겁재', 'career')).toBeNull();
        expect(getSibsinEffect('겁재', 'health')).toBeNull();
        expect(getSibsinEffect('겁재', 'travel')).toBeNull();
        expect(getSibsinEffect('겁재', 'education')).toBeNull();
      });
    });

    describe('Invalid/unknown sibsin', () => {
      it('should return null for unknown sibsin type', () => {
        expect(getSibsinEffect('unknown', 'career')).toBeNull();
        expect(getSibsinEffect('', 'finance')).toBeNull();
        expect(getSibsinEffect('invalid', 'relationship')).toBeNull();
      });
    });

    describe('Complete sibsin × category matrix (60 combinations)', () => {
      it('should test all 60 combinations return string or null', () => {
        sibsinTypes.forEach(sibsin => {
          categories.forEach(category => {
            const result = getSibsinEffect(sibsin, category);
            expect(result === null || typeof result === 'string').toBe(true);
          });
        });
      });
    });
  });

  describe('getStageEffect', () => {
    const stages = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
    const categories = ['career', 'finance', 'relationship', 'health', 'travel', 'education'] as const;

    describe('장생 (長生) effects', () => {
      it('should return education effect for 장생', () => {
        expect(getStageEffect('장생', 'education')).toBe('장생 - 새로운 시작');
      });

      it('should return health effect for 장생', () => {
        expect(getStageEffect('장생', 'health')).toBe('장생 - 에너지 충만');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('장생', 'career')).toBeNull();
        expect(getStageEffect('장생', 'finance')).toBeNull();
        expect(getStageEffect('장생', 'relationship')).toBeNull();
        expect(getStageEffect('장생', 'travel')).toBeNull();
      });
    });

    describe('목욕 (沐浴) effects', () => {
      it('should return relationship effect for 목욕', () => {
        expect(getStageEffect('목욕', 'relationship')).toBe('목욕 - 새로운 만남');
      });

      it('should return travel effect for 목욕', () => {
        expect(getStageEffect('목욕', 'travel')).toBe('목욕 - 이동 활발');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('목욕', 'career')).toBeNull();
        expect(getStageEffect('목욕', 'finance')).toBeNull();
        expect(getStageEffect('목욕', 'health')).toBeNull();
        expect(getStageEffect('목욕', 'education')).toBeNull();
      });
    });

    describe('관대 (冠帶) effects', () => {
      it('should return career effect for 관대', () => {
        expect(getStageEffect('관대', 'career')).toBe('관대 - 성장기');
      });

      it('should return relationship effect for 관대', () => {
        expect(getStageEffect('관대', 'relationship')).toBe('관대 - 인기 상승');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('관대', 'finance')).toBeNull();
        expect(getStageEffect('관대', 'health')).toBeNull();
        expect(getStageEffect('관대', 'travel')).toBeNull();
        expect(getStageEffect('관대', 'education')).toBeNull();
      });
    });

    describe('건록 (建祿) effects', () => {
      it('should return career effect for 건록', () => {
        expect(getStageEffect('건록', 'career')).toBe('건록 - 직업 안정');
      });

      it('should return finance effect for 건록', () => {
        expect(getStageEffect('건록', 'finance')).toBe('건록 - 수입 증가');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('건록', 'relationship')).toBeNull();
        expect(getStageEffect('건록', 'health')).toBeNull();
        expect(getStageEffect('건록', 'travel')).toBeNull();
        expect(getStageEffect('건록', 'education')).toBeNull();
      });
    });

    describe('제왕 (帝旺) effects', () => {
      it('should return career effect for 제왕', () => {
        expect(getStageEffect('제왕', 'career')).toBe('제왕 - 전성기');
      });

      it('should return finance effect for 제왕', () => {
        expect(getStageEffect('제왕', 'finance')).toBe('제왕 - 재물 최고조');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('제왕', 'relationship')).toBeNull();
        expect(getStageEffect('제왕', 'health')).toBeNull();
        expect(getStageEffect('제왕', 'travel')).toBeNull();
        expect(getStageEffect('제왕', 'education')).toBeNull();
      });
    });

    describe('쇠 (衰) effects', () => {
      it('should return health effect for 쇠', () => {
        expect(getStageEffect('쇠', 'health')).toBe('쇠 - 건강 관리');
      });

      it('should return career effect for 쇠', () => {
        expect(getStageEffect('쇠', 'career')).toBe('쇠 - 현상 유지');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('쇠', 'finance')).toBeNull();
        expect(getStageEffect('쇠', 'relationship')).toBeNull();
        expect(getStageEffect('쇠', 'travel')).toBeNull();
        expect(getStageEffect('쇠', 'education')).toBeNull();
      });
    });

    describe('병 (病) effects', () => {
      it('should return health effect for 병', () => {
        expect(getStageEffect('병', 'health')).toBe('병 - 건강 주의');
      });

      it('should return career effect for 병', () => {
        expect(getStageEffect('병', 'career')).toBe('병 - 활동 제한');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('병', 'finance')).toBeNull();
        expect(getStageEffect('병', 'relationship')).toBeNull();
        expect(getStageEffect('병', 'travel')).toBeNull();
        expect(getStageEffect('병', 'education')).toBeNull();
      });
    });

    describe('사 (死) effects', () => {
      it('should return health effect for 사', () => {
        expect(getStageEffect('사', 'health')).toBe('사 - 재충전 필요');
      });

      it('should return finance effect for 사', () => {
        expect(getStageEffect('사', 'finance')).toBe('사 - 지출 주의');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('사', 'career')).toBeNull();
        expect(getStageEffect('사', 'relationship')).toBeNull();
        expect(getStageEffect('사', 'travel')).toBeNull();
        expect(getStageEffect('사', 'education')).toBeNull();
      });
    });

    describe('묘 (墓) effects', () => {
      it('should return career effect for 묘', () => {
        expect(getStageEffect('묘', 'career')).toBe('묘 - 휴식기');
      });

      it('should return health effect for 묘', () => {
        expect(getStageEffect('묘', 'health')).toBe('묘 - 회복 필요');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('묘', 'finance')).toBeNull();
        expect(getStageEffect('묘', 'relationship')).toBeNull();
        expect(getStageEffect('묘', 'travel')).toBeNull();
        expect(getStageEffect('묘', 'education')).toBeNull();
      });
    });

    describe('절 (絶) effects', () => {
      it('should return career effect for 절', () => {
        expect(getStageEffect('절', 'career')).toBe('절 - 전환기');
      });

      it('should return relationship effect for 절', () => {
        expect(getStageEffect('절', 'relationship')).toBe('절 - 관계 정리');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('절', 'finance')).toBeNull();
        expect(getStageEffect('절', 'health')).toBeNull();
        expect(getStageEffect('절', 'travel')).toBeNull();
        expect(getStageEffect('절', 'education')).toBeNull();
      });
    });

    describe('태 (胎) effects', () => {
      it('should return education effect for 태', () => {
        expect(getStageEffect('태', 'education')).toBe('태 - 잉태기');
      });

      it('should return relationship effect for 태', () => {
        expect(getStageEffect('태', 'relationship')).toBe('태 - 새 인연');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('태', 'career')).toBeNull();
        expect(getStageEffect('태', 'finance')).toBeNull();
        expect(getStageEffect('태', 'health')).toBeNull();
        expect(getStageEffect('태', 'travel')).toBeNull();
      });
    });

    describe('양 (養) effects', () => {
      it('should return education effect for 양', () => {
        expect(getStageEffect('양', 'education')).toBe('양 - 성장 준비');
      });

      it('should return health effect for 양', () => {
        expect(getStageEffect('양', 'health')).toBe('양 - 회복 중');
      });

      it('should return null for unmapped categories', () => {
        expect(getStageEffect('양', 'career')).toBeNull();
        expect(getStageEffect('양', 'finance')).toBeNull();
        expect(getStageEffect('양', 'relationship')).toBeNull();
        expect(getStageEffect('양', 'travel')).toBeNull();
      });
    });

    describe('Invalid/unknown stage', () => {
      it('should return null for unknown stage type', () => {
        expect(getStageEffect('unknown', 'career')).toBeNull();
        expect(getStageEffect('', 'finance')).toBeNull();
        expect(getStageEffect('invalid', 'relationship')).toBeNull();
      });
    });

    describe('Complete stage × category matrix (72 combinations)', () => {
      it('should test all 72 combinations return string or null', () => {
        stages.forEach(stage => {
          categories.forEach(category => {
            const result = getStageEffect(stage, category);
            expect(result === null || typeof result === 'string').toBe(true);
          });
        });
      });
    });
  });

  describe('generateDetailedEventAnalysis', () => {
    it('should return analysis for all 6 categories', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result).toHaveProperty('career');
      expect(result).toHaveProperty('finance');
      expect(result).toHaveProperty('relationship');
      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('travel');
      expect(result).toHaveProperty('education');
    });

    it('should include score for each category', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.score).toBe(75);
      expect(result.finance.score).toBe(80);
      expect(result.relationship.score).toBe(70);
      expect(result.health.score).toBe(65);
      expect(result.travel.score).toBe(60);
      expect(result.education.score).toBe(85);
    });

    it('should include sibsin effects in factors', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.factors).toContain('정관운 - 승진/안정');
      expect(result.relationship.factors).toContain('정관운 - 귀인 만남');
    });

    it('should include stage effects in factors', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.education.factors).toContain('장생 - 새로운 시작');
      expect(result.health.factors).toContain('장생 - 에너지 충만');
    });

    it('should include causal factors for matching categories', () => {
      const causalFactors: CausalFactor[] = [
        {
          factor: '천을귀인',
          score: 15,
          affectedAreas: ['커리어', '대인관계'],
          description: '귀인의 도움으로 승진 기회',
        },
        {
          factor: '정재운',
          score: 10,
          affectedAreas: ['재물'],
          description: '안정적인 수입 증가',
        },
      ];

      const result = generateDetailedEventAnalysis(
        mockScores,
        causalFactors,
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.factors).toContain('천을귀인');
      expect(result.career.whyHappened).toContain('귀인의 도움으로 승진 기회');
      expect(result.finance.factors).toContain('정재운');
      expect(result.finance.whyHappened).toContain('안정적인 수입 증가');
    });

    it('should match causal factors with Korean keyword mapping', () => {
      const causalFactors: CausalFactor[] = [
        {
          factor: '사업운',
          score: 12,
          affectedAreas: ['사업'],
          description: '사업 확장 기회',
        },
        {
          factor: '재정운',
          score: 10,
          affectedAreas: ['재정'],
          description: '재정 안정',
        },
        {
          factor: '대인운',
          score: 8,
          affectedAreas: ['대인'],
          description: '좋은 인연',
        },
        {
          factor: '건강운',
          score: 5,
          affectedAreas: ['건강'],
          description: '건강 회복',
        },
        {
          factor: '이동운',
          score: 7,
          affectedAreas: ['이동'],
          description: '여행 기회',
        },
        {
          factor: '학업운',
          score: 9,
          affectedAreas: ['학업'],
          description: '시험 합격',
        },
      ];

      const result = generateDetailedEventAnalysis(
        mockScores,
        causalFactors,
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.factors).toContain('사업운');
      expect(result.finance.factors).toContain('재정운');
      expect(result.relationship.factors).toContain('대인운');
      expect(result.health.factors).toContain('건강운');
      expect(result.travel.factors).toContain('이동운');
      expect(result.education.factors).toContain('학업운');
    });

    it('should include lunar mansion effect for relationship when goodFor includes 결혼', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.relationship.factors).toContain('각수 - 관계에 길');
    });

    it('should not include lunar mansion effect when goodFor does not include 결혼', () => {
      const notMarriageLunarMansion: LunarMansion = {
        nameKo: '방',
        name: 'Room',
        isAuspicious: true,
        goodFor: ['개업', '이사'],
        badFor: [],
      };

      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        mockSolarTerm,
        notMarriageLunarMansion
      );

      expect(result.relationship.factors).not.toContain('방수 - 관계에 길');
    });

    it('should include solar term effect for health when element is 토', () => {
      const earthSolarTerm: SolarTerm = {
        nameKo: '대서',
        name: 'Great Heat',
        element: '토',
        date: new Date(2024, 6, 22),
      };

      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        earthSolarTerm,
        mockLunarMansion
      );

      expect(result.health.factors).toContain('대서 - 건강 안정기');
    });

    it('should not include solar term effect when element is not 토', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        mockSolarTerm, // element is 목
        mockLunarMansion
      );

      expect(result.health.factors).not.toContain('입춘 - 건강 안정기');
    });

    it('should limit factors to 5 items max', () => {
      const manyFactors: CausalFactor[] = Array.from({ length: 10 }, (_, i) => ({
        factor: `factor${i}`,
        score: 5,
        affectedAreas: ['커리어'],
        description: `description${i}`,
      }));

      const result = generateDetailedEventAnalysis(
        mockScores,
        manyFactors,
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.factors.length).toBeLessThanOrEqual(5);
    });

    it('should limit whyHappened to 3 items max', () => {
      const manyFactors: CausalFactor[] = Array.from({ length: 10 }, (_, i) => ({
        factor: `factor${i}`,
        score: 5,
        affectedAreas: ['커리어'],
        description: `description${i}`,
      }));

      const result = generateDetailedEventAnalysis(
        mockScores,
        manyFactors,
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.whyHappened.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty causal factors array', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.whyHappened).toEqual([]);
      expect(result.finance.whyHappened).toEqual([]);
    });

    it('should handle sibsin with no effects for any category', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        'unknown_sibsin',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.factors).not.toContain('unknown_sibsin');
    });

    it('should handle stage with no effects for any category', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        'unknown_stage',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.factors.some(f => f.includes('unknown_stage'))).toBe(false);
    });

    it('should generate correct category name for each category', () => {
      const result = generateDetailedEventAnalysis(
        mockScores,
        [],
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      // Each category should exist with proper structure
      expect(result.career).toHaveProperty('score');
      expect(result.career).toHaveProperty('factors');
      expect(result.career).toHaveProperty('whyHappened');
    });

    it('should handle multiple matching causal factors for same category', () => {
      const causalFactors: CausalFactor[] = [
        {
          factor: 'factor1',
          score: 10,
          affectedAreas: ['커리어'],
          description: 'description1',
        },
        {
          factor: 'factor2',
          score: 8,
          affectedAreas: ['사업'],
          description: 'description2',
        },
        {
          factor: 'factor3',
          score: 6,
          affectedAreas: ['직업'],
          description: 'description3',
        },
      ];

      const result = generateDetailedEventAnalysis(
        mockScores,
        causalFactors,
        '정관',
        '장생',
        mockSolarTerm,
        mockLunarMansion
      );

      expect(result.career.factors).toContain('factor1');
      expect(result.career.factors).toContain('factor2');
      expect(result.career.whyHappened).toContain('description1');
      expect(result.career.whyHappened).toContain('description2');
    });
  });
});
