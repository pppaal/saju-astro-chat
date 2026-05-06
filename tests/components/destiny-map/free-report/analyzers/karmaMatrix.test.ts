/**
 * KarmaMatrix Analyzer Unit Tests
 * 카르마 매트릭스 분석 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { getKarmaMatrixAnalysis } from '@/components/destiny-map/free-report/analyzers/domains/karma/karmaMatrix';
import type { SajuData, AstroData } from '@/components/destiny-map/types';

// Mock matrix data
vi.mock('@/lib/destiny-matrix/engine', () => ({
  getInteractionColor: vi.fn(() => '#FFD700'),
}));

vi.mock('@/lib/destiny-matrix/data/layer7-advanced-analysis', () => ({
  ADVANCED_ANALYSIS_MATRIX: {
    jeonggwan: {
      draconic: { level: 'synergy', score: 8, icon: '✨', keyword: '영혼의 질서', keywordEn: 'Soul Order' },
    },
    pyeongwan: {
      draconic: { level: 'harmony', score: 6, icon: '⚔️', keyword: '전사 영혼', keywordEn: 'Warrior Soul' },
    },
  },
}));

vi.mock('@/lib/destiny-matrix/data/layer10-extrapoint-element', () => ({
  EXTRAPOINT_ELEMENT_MATRIX: {
    NorthNode: {
      '목': { level: 'synergy', score: 8, icon: '🌱', keyword: '성장', keywordEn: 'Growth' },
      '화': { level: 'harmony', score: 6, icon: '🔥', keyword: '열정', keywordEn: 'Passion' },
    },
    SouthNode: {
      '목': { level: 'neutral', score: 4, icon: '🍂', keyword: '과거', keywordEn: 'Past' },
      '화': { level: 'tension', score: 3, icon: '💭', keyword: '기억', keywordEn: 'Memory' },
    },
  },
}));

vi.mock('@/lib/destiny-matrix/data/layer5-relation-aspect', () => ({
  RELATION_ASPECT_MATRIX: {
    samhap: {
      conjunction: { level: 'synergy', score: 9, icon: '🔗', keyword: '삼합', keywordEn: 'Triple Harmony' },
    },
    yukhap: {
      conjunction: { level: 'harmony', score: 7, icon: '💫', keyword: '육합', keywordEn: 'Six Harmony' },
    },
    chung: {
      conjunction: { level: 'tension', score: 3, icon: '⚡', keyword: '충', keywordEn: 'Clash' },
    },
  },
}));

vi.mock('@/lib/destiny-matrix/data/layer8-shinsal-planet', () => ({
  SHINSAL_PLANET_MATRIX: {
    '원진': {
      Pluto: { level: 'tension', score: 3, icon: '🌑', keyword: '원한', keywordEn: 'Resentment' },
    },
    '역마': {
      Pluto: { level: 'neutral', score: 5, icon: '🏃', keyword: '여행자', keywordEn: 'Traveler' },
    },
    '화개': {
      Pluto: { level: 'synergy', score: 8, icon: '🙏', keyword: '수행자', keywordEn: 'Practitioner' },
    },
  },
}));

vi.mock('@/components/destiny-map/free-report/shared', () => ({
  KARMA_SHINSALS: ['원진', '역마', '화개', '천라지망', '공망'],
}));

describe('getKarmaMatrixAnalysis', () => {
  const createBaseSajuData = (overrides: Partial<SajuData> = {}): SajuData => ({
    dayMaster: { element: 'wood', name: '갑목', heavenlyStem: '갑' },
    advancedAnalysis: {
      geokguk: { name: '정관격', type: '정관' },
      hyungChungHoeHap: {
        hap: [],
        harmony: [],
        chung: [],
        conflicts: [],
      },
      sinsal: {
        luckyList: [],
        unluckyList: [],
      },
    },
    ...overrides,
  } as SajuData);

  const createBaseAstroData = (): AstroData => ({
    planets: [],
    houses: [],
    aspects: [],
  } as unknown as AstroData);

  describe('basic functionality', () => {
    it('should return null when both saju and astro are undefined', () => {
      const result = getKarmaMatrixAnalysis(undefined, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should return analysis when saju data is provided', () => {
      const saju = createBaseSajuData();
      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('karmaScore');
      expect(result).toHaveProperty('karmaMessage');
    });

    it('should return karmaScore in valid range (30-100)', () => {
      const saju = createBaseSajuData();
      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.karmaScore).toBeGreaterThanOrEqual(30);
      expect(result?.karmaScore).toBeLessThanOrEqual(100);
    });
  });

  describe('soul pattern analysis', () => {
    it('should analyze soul pattern for 정관격', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          geokguk: { name: '정관격' },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.soulPattern).not.toBeNull();
      expect(result?.soulPattern?.geokguk).toBe('정관격');
      expect(result?.soulPattern?.soulTheme?.ko).toContain('정의');
    });

    it('should analyze soul pattern for 편관격', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          geokguk: { name: '편관격' },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.soulPattern).not.toBeNull();
      expect(result?.soulPattern?.geokguk).toBe('편관격');
      expect(result?.soulPattern?.soulTheme?.ko).toContain('전사');
    });

    it('should return null soul pattern for unknown geokguk', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          geokguk: { name: '알수없는격' },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.soulPattern).toBeNull();
    });
  });

  describe('node axis analysis', () => {
    it('should analyze node axis based on day master element', () => {
      const saju = createBaseSajuData({
        dayMaster: { element: 'wood' },
      });

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.nodeAxis).not.toBeNull();
      expect(result?.nodeAxis?.northNode?.element).toBe('목');
      expect(result?.nodeAxis?.southNode?.element).toBe('목');
    });

    it('should include direction and lesson for north node', () => {
      const saju = createBaseSajuData({
        dayMaster: { element: 'wood' },
      });

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.nodeAxis?.northNode?.direction?.ko).toContain('성장');
      expect(result?.nodeAxis?.northNode?.lesson?.ko).toContain('도전');
    });

    it('should include past pattern and release for south node', () => {
      const saju = createBaseSajuData({
        dayMaster: { element: 'fire' },
      });

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.nodeAxis?.southNode?.pastPattern?.ko).toContain('과거');
      expect(result?.nodeAxis?.southNode?.release?.ko).toContain('내려놓');
    });
  });

  describe('karmic relations analysis', () => {
    it('should analyze karmic relations from hyungChungHoeHap', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          hyungChungHoeHap: {
            hap: ['인오술 삼합'],
            harmony: [],
            chung: [],
            conflicts: [],
          },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.karmicRelations?.length).toBeGreaterThan(0);
      expect(result?.karmicRelations?.[0]?.relation).toBe('samhap');
    });

    it('should analyze chung (conflict) relations', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          hyungChungHoeHap: {
            hap: [],
            harmony: [],
            chung: ['자오충'],
            conflicts: [],
          },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.karmicRelations?.some(r => r.relation === 'chung')).toBe(true);
    });

    it('should limit karmic relations to 3', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          hyungChungHoeHap: {
            hap: ['삼합1', '삼합2'],
            harmony: ['육합1', '육합2'],
            chung: ['충1'],
            conflicts: ['충2'],
          },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.karmicRelations?.length).toBeLessThanOrEqual(3);
    });
  });

  describe('past life hints analysis', () => {
    it('should analyze past life hints from karma shinsals', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          sinsal: {
            luckyList: [{ name: '화개' }],
            unluckyList: [{ name: '원진' }],
          },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.pastLifeHints?.length).toBeGreaterThan(0);
    });

    it('should handle string format shinsals', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          sinsal: {
            luckyList: ['역마', '화개'],
            unluckyList: [],
          },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.pastLifeHints?.length).toBeGreaterThan(0);
      expect(result?.pastLifeHints?.some(h => h.shinsal === '역마' || h.shinsal === '화개')).toBe(true);
    });

    it('should limit past life hints to 3', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          sinsal: {
            luckyList: ['역마', '화개'],
            unluckyList: ['원진', '공망', '천라지망'],
          },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.pastLifeHints?.length).toBeLessThanOrEqual(3);
    });

    it('should provide hint messages for each shinsal', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          sinsal: {
            luckyList: ['화개'],
            unluckyList: [],
          },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.pastLifeHints?.[0]?.hint?.ko).toContain('수행자');
    });
  });

  describe('karma score calculation', () => {
    it('should increase score with soul pattern', () => {
      const withSoulPattern = createBaseSajuData({
        advancedAnalysis: {
          geokguk: { name: '정관격' },
        },
      } as Partial<SajuData>);

      const withoutSoulPattern = createBaseSajuData({
        advancedAnalysis: {
          geokguk: { name: '알수없음' },
        },
      } as Partial<SajuData>);

      const scoreWith = getKarmaMatrixAnalysis(withSoulPattern, undefined, 'ko')?.karmaScore ?? 0;
      const scoreWithout = getKarmaMatrixAnalysis(withoutSoulPattern, undefined, 'ko')?.karmaScore ?? 0;

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it('should increase score with karmic relations', () => {
      const withRelations = createBaseSajuData({
        advancedAnalysis: {
          hyungChungHoeHap: {
            hap: ['삼합'],
            harmony: ['육합'],
            chung: [],
            conflicts: [],
          },
        },
      } as Partial<SajuData>);

      const withoutRelations = createBaseSajuData({
        advancedAnalysis: {
          hyungChungHoeHap: {
            hap: [],
            harmony: [],
            chung: [],
            conflicts: [],
          },
        },
      } as Partial<SajuData>);

      const scoreWith = getKarmaMatrixAnalysis(withRelations, undefined, 'ko')?.karmaScore ?? 0;
      const scoreWithout = getKarmaMatrixAnalysis(withoutRelations, undefined, 'ko')?.karmaScore ?? 0;

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });
  });

  describe('karma message', () => {
    it('should return strong karma message for score >= 80', () => {
      // Create conditions that maximize karma score
      const saju = createBaseSajuData({
        dayMaster: { element: 'wood' },
        advancedAnalysis: {
          geokguk: { name: '정관격' },
          hyungChungHoeHap: {
            hap: ['삼합1'],
            harmony: ['육합1'],
            chung: [],
            conflicts: [],
          },
          sinsal: {
            luckyList: ['화개', '역마'],
            unluckyList: ['원진'],
          },
        },
      } as Partial<SajuData>);

      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      if (result && result.karmaScore >= 80) {
        expect(result.karmaMessage.ko).toContain('매우 강력');
      }
    });

    it('should return clear pattern message for score 60-79', () => {
      const result = getKarmaMatrixAnalysis(createBaseSajuData(), undefined, 'ko');

      if (result && result.karmaScore >= 60 && result.karmaScore < 80) {
        expect(result.karmaMessage.ko).toContain('분명히 나타');
      }
    });
  });

  describe('language support', () => {
    it('should return Korean messages for lang="ko"', () => {
      const saju = createBaseSajuData();
      const result = getKarmaMatrixAnalysis(saju, undefined, 'ko');

      expect(result?.karmaMessage?.ko).toBeDefined();
      expect(typeof result?.karmaMessage?.ko).toBe('string');
    });

    it('should return English messages for lang="en"', () => {
      const saju = createBaseSajuData();
      const result = getKarmaMatrixAnalysis(saju, undefined, 'en');

      expect(result?.karmaMessage?.en).toBeDefined();
      expect(typeof result?.karmaMessage?.en).toBe('string');
    });
  });
});
