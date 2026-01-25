/**
 * Sibsin Analyzer Tests
 * 십신 분석기 테스트
 */

import { describe, it, expect } from 'vitest';
import { getSibsinDistribution, getSibsinAnalysis } from '@/components/destiny-map/fun-insights/analyzers/sibsinAnalyzer';
import type { SajuData } from '@/components/destiny-map/fun-insights/types';

describe('getSibsinDistribution', () => {
  describe('from advancedAnalysis', () => {
    it('should return sibsinDistribution from advancedAnalysis if available', () => {
      const saju: SajuData = {
        advancedAnalysis: {
          sibsin: {
            sibsinDistribution: {
              '비견': 2,
              '식신': 1,
              '편재': 3,
            },
          },
        },
      } as unknown as SajuData;

      const result = getSibsinDistribution(saju);

      expect(result).toEqual({
        '비견': 2,
        '식신': 1,
        '편재': 3,
      });
    });
  });

  describe('from pillars', () => {
    it('should extract sibsin from heavenly stems as strings', () => {
      const saju: SajuData = {
        yearPillar: {
          heavenlyStem: { sibsin: '비견' },
          earthlyBranch: { sibsin: '식신' },
        },
        monthPillar: {
          heavenlyStem: { sibsin: '편재' },
          earthlyBranch: { sibsin: '정재' },
        },
        dayPillar: {
          heavenlyStem: { sibsin: '비견' },
          earthlyBranch: { sibsin: '편관' },
        },
        timePillar: {
          heavenlyStem: { sibsin: '정인' },
          earthlyBranch: { sibsin: '상관' },
        },
      } as unknown as SajuData;

      const result = getSibsinDistribution(saju);

      expect(result['비견']).toBe(2);
      expect(result['식신']).toBe(1);
      expect(result['편재']).toBe(1);
      expect(result['정재']).toBe(1);
      expect(result['편관']).toBe(1);
      expect(result['정인']).toBe(1);
      expect(result['상관']).toBe(1);
    });

    it('should extract sibsin from objects with name property', () => {
      const saju: SajuData = {
        yearPillar: {
          heavenlyStem: { sibsin: { name: '비견' } },
          earthlyBranch: { sibsin: { name: '식신' } },
        },
      } as unknown as SajuData;

      const result = getSibsinDistribution(saju);

      expect(result['비견']).toBe(1);
      expect(result['식신']).toBe(1);
    });

    it('should extract sibsin from objects with kind property', () => {
      const saju: SajuData = {
        yearPillar: {
          heavenlyStem: { sibsin: { kind: '겁재' } },
        },
      } as unknown as SajuData;

      const result = getSibsinDistribution(saju);

      expect(result['겁재']).toBe(1);
    });

    it('should handle missing pillars', () => {
      const saju: SajuData = {
        yearPillar: {
          heavenlyStem: { sibsin: '비견' },
        },
      } as unknown as SajuData;

      const result = getSibsinDistribution(saju);

      expect(result['비견']).toBe(1);
      expect(Object.keys(result).length).toBe(1);
    });

    it('should handle null/undefined sibsin values', () => {
      const saju: SajuData = {
        yearPillar: {
          heavenlyStem: { sibsin: null },
          earthlyBranch: { sibsin: undefined },
        },
      } as unknown as SajuData;

      const result = getSibsinDistribution(saju);

      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should return empty object for undefined saju', () => {
      const result = getSibsinDistribution(undefined);
      expect(result).toEqual({});
    });

    it('should return empty object for empty saju', () => {
      const result = getSibsinDistribution({} as SajuData);
      expect(result).toEqual({});
    });
  });
});

describe('getSibsinAnalysis', () => {
  const createSajuWithDistribution = (distribution: Record<string, number>): SajuData => ({
    advancedAnalysis: {
      sibsin: {
        sibsinDistribution: distribution,
      },
    },
  } as unknown as SajuData);

  describe('Korean language', () => {
    it('should return bigyeob category for 비견/겁재', () => {
      const saju = createSajuWithDistribution({ '비견': 2, '겁재': 1 });
      const result = getSibsinAnalysis(saju, 'ko');

      const bigyeob = result.find(r => r.category === '비겁(比劫)');
      expect(bigyeob).toBeDefined();
      expect(bigyeob?.count).toBe(3);
      expect(bigyeob?.emoji).toBe('👥');
      expect(bigyeob?.description).toContain('독립심');
    });

    it('should return siksang category for 식신/상관', () => {
      const saju = createSajuWithDistribution({ '식신': 2, '상관': 1 });
      const result = getSibsinAnalysis(saju, 'ko');

      const siksang = result.find(r => r.category === '식상(食傷)');
      expect(siksang).toBeDefined();
      expect(siksang?.count).toBe(3);
      expect(siksang?.emoji).toBe('🎨');
      expect(siksang?.description).toContain('창의력');
    });

    it('should return jaeseong category for 편재/정재', () => {
      const saju = createSajuWithDistribution({ '편재': 1, '정재': 2 });
      const result = getSibsinAnalysis(saju, 'ko');

      const jaeseong = result.find(r => r.category === '재성(財星)');
      expect(jaeseong).toBeDefined();
      expect(jaeseong?.count).toBe(3);
      expect(jaeseong?.emoji).toBe('💰');
      expect(jaeseong?.description).toContain('재물운');
    });

    it('should return gwanseong category for 편관/정관', () => {
      const saju = createSajuWithDistribution({ '편관': 2, '정관': 1 });
      const result = getSibsinAnalysis(saju, 'ko');

      const gwanseong = result.find(r => r.category === '관성(官星)');
      expect(gwanseong).toBeDefined();
      expect(gwanseong?.count).toBe(3);
      expect(gwanseong?.emoji).toBe('👑');
      expect(gwanseong?.description).toContain('명예');
    });

    it('should return inseong category for 편인/정인', () => {
      const saju = createSajuWithDistribution({ '편인': 1, '정인': 2 });
      const result = getSibsinAnalysis(saju, 'ko');

      const inseong = result.find(r => r.category === '인성(印星)');
      expect(inseong).toBeDefined();
      expect(inseong?.count).toBe(3);
      expect(inseong?.emoji).toBe('📚');
      expect(inseong?.description).toContain('학문');
    });
  });

  describe('English language', () => {
    it('should return English category names and descriptions', () => {
      const saju = createSajuWithDistribution({
        '비견': 2,
        '식신': 1,
        '편재': 1,
        '정관': 1,
        '정인': 1,
      });
      const result = getSibsinAnalysis(saju, 'en');

      expect(result.find(r => r.category === 'Peers')).toBeDefined();
      expect(result.find(r => r.category === 'Expression')).toBeDefined();
      expect(result.find(r => r.category === 'Wealth')).toBeDefined();
      expect(result.find(r => r.category === 'Status')).toBeDefined();
      expect(result.find(r => r.category === 'Knowledge')).toBeDefined();

      const peers = result.find(r => r.category === 'Peers');
      expect(peers?.description).toContain('Independence');
    });
  });

  describe('sorting', () => {
    it('should sort results by count in descending order', () => {
      const saju = createSajuWithDistribution({
        '비견': 1,
        '식신': 3,
        '편재': 2,
      });
      const result = getSibsinAnalysis(saju, 'ko');

      expect(result[0].count).toBe(3); // 식상
      expect(result[1].count).toBe(2); // 재성
      expect(result[2].count).toBe(1); // 비겁
    });
  });

  describe('filtering', () => {
    it('should not include categories with zero count', () => {
      const saju = createSajuWithDistribution({
        '비견': 2,
        '식신': 1,
      });
      const result = getSibsinAnalysis(saju, 'ko');

      expect(result.length).toBe(2);
      expect(result.find(r => r.category === '재성(財星)')).toBeUndefined();
      expect(result.find(r => r.category === '관성(官星)')).toBeUndefined();
      expect(result.find(r => r.category === '인성(印星)')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should return empty array for undefined saju', () => {
      const result = getSibsinAnalysis(undefined, 'ko');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty distribution', () => {
      const saju = createSajuWithDistribution({});
      const result = getSibsinAnalysis(saju, 'ko');
      expect(result).toEqual([]);
    });

    it('should handle combined 비견 and 겁재 in single category', () => {
      const saju = createSajuWithDistribution({
        '비견': 2,
        '겁재': 3,
      });
      const result = getSibsinAnalysis(saju, 'ko');

      const bigyeob = result.find(r => r.category === '비겁(比劫)');
      expect(bigyeob?.count).toBe(5);
    });
  });
});
