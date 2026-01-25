/**
 * Wealth Analyzer Tests
 * 재물 분석 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWealthAnalysis } from '@/components/destiny-map/fun-insights/analyzers/wealthAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/fun-insights/types';

// Mock utils
vi.mock('@/components/destiny-map/fun-insights/analyzers/utils', () => ({
  extractDayMaster: vi.fn((saju) => {
    if (!saju?.dayMaster) return null;
    return typeof saju.dayMaster === 'string' ? saju.dayMaster : saju.dayMaster.name;
  }),
  extractFiveElementsSorted: vi.fn((saju) => {
    if (!saju?.fiveElements) return [];
    return Object.entries(saju.fiveElements).sort(([, a], [, b]) => (b as number) - (a as number));
  }),
  extractPlanetSign: vi.fn((astro, planet) => {
    if (!astro?.planets) return null;
    const planetData = astro.planets.find((p: { name: string }) => p.name.toLowerCase() === planet);
    return planetData?.sign?.toLowerCase() || null;
  }),
  selectLang: vi.fn((isKo, obj) => isKo ? obj.ko : obj.en),
}));

describe('getWealthAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createBasicSaju = (dayMaster: string = '갑'): SajuData => ({
    dayMaster: { name: dayMaster },
    fiveElements: { wood: 3, fire: 2, earth: 1, metal: 2, water: 2 },
  } as unknown as SajuData);

  const createBasicAstro = (): AstroData => ({
    planets: [
      { name: 'venus', sign: 'taurus', house: 2 },
      { name: 'jupiter', sign: 'sagittarius', house: 9 },
      { name: 'saturn', sign: 'capricorn', house: 10 },
      { name: 'pluto', sign: 'scorpio', house: 8 },
    ],
    houses: [
      { index: 2, sign: 'taurus' },
    ],
  } as unknown as AstroData);

  describe('basic analysis', () => {
    it('should return null if dayMaster is not available', () => {
      const result = getWealthAnalysis({} as SajuData, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should return analysis with dayMaster traits', () => {
      const saju = createBasicSaju('갑');
      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.moneyStyle).toContain('크게 벌어');
      expect(result?.earningWay).toContain('새로운 사업');
      expect(result?.spendingPattern).toContain('성장');
      expect(result?.wealthTip).toContain('장기 투자');
    });

    it('should return English text when lang is en', () => {
      const saju = createBasicSaju('갑');
      const result = getWealthAnalysis(saju, undefined, 'en');

      expect(result).not.toBeNull();
      expect(result?.moneyStyle).toContain('Earn big');
      expect(result?.earningWay).toContain('ventures');
    });

    it('should fall back to default dayMaster if not found', () => {
      const saju = { dayMaster: { name: '알수없음' } } as unknown as SajuData;
      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.moneyStyle).toContain('크게');
    });
  });

  describe('different dayMasters', () => {
    it('should return traits for 을 dayMaster', () => {
      const saju = createBasicSaju('을');
      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.moneyStyle).toContain('유연하게');
      expect(result?.earningWay).toContain('관계');
    });

    it('should return traits for 병 dayMaster', () => {
      const saju = createBasicSaju('병');
      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.moneyStyle).toContain('화끈하게');
      expect(result?.spendingPattern).toContain('즉흥적');
    });

    it('should return traits for 무 dayMaster', () => {
      const saju = createBasicSaju('무');
      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.moneyStyle).toContain('안정적');
      expect(result?.earningWay).toContain('부동산');
    });

    it('should return traits for 경 dayMaster', () => {
      const saju = createBasicSaju('경');
      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.moneyStyle).toContain('칼같이');
      expect(result?.earningWay).toContain('금융');
    });

    it('should return traits for 계 dayMaster', () => {
      const saju = createBasicSaju('계');
      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.moneyStyle).toContain('조용히');
      expect(result?.earningWay).toContain('연구');
    });
  });

  describe('2nd house integration', () => {
    it('should include house 2 wealth style', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.house2Style).toContain('안정적');
      expect(result?.moneyStyle).toContain('안정적');
    });

    it('should handle different house 2 signs', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        ...createBasicAstro(),
        houses: [{ index: 2, sign: 'scorpio' }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.house2Style).toContain('투자');
    });
  });

  describe('jupiter blessings', () => {
    it('should include jupiter wealth blessings', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'jupiter', sign: 'sagittarius', house: 2 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.jupiterWealth).toContain('재물 복');
    });

    it('should handle jupiter in 10th house', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'jupiter', sign: 'capricorn', house: 10 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.jupiterWealth).toContain('커리어');
    });

    it('should handle jupiter in 8th house', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'jupiter', sign: 'scorpio', house: 8 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.jupiterWealth).toContain('투자');
    });
  });

  describe('venus wealth style', () => {
    it('should include venus wealth style', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'venus', sign: 'taurus', house: 2 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.venusWealth).toContain('품질');
      expect(result?.spendingPattern).toContain('품질');
    });

    it('should handle venus in leo', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'venus', sign: 'leo', house: 5 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.venusWealth).toContain('럭셔리');
    });

    it('should handle venus in virgo', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'venus', sign: 'virgo', house: 6 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.venusWealth).toContain('실용적');
    });
  });

  describe('sibsin wealth traits', () => {
    it('should detect strong jaeseong', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '정재': 2, '편재': 2 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinWealth).toContain('재물 복');
    });

    it('should detect dominant pyeonjae', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '편재': 2, '정재': 0 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinWealth).toContain('투자');
    });

    it('should detect dominant jeongjae', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '정재': 2, '편재': 0 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinWealth).toContain('꾸준히');
    });

    it('should detect weak jaeseong', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '정재': 0, '편재': 0 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinWealth).toContain('다른 가치');
    });
  });

  describe('pluto wealth transform', () => {
    it('should include pluto in 2nd house', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'pluto', sign: 'scorpio', house: 2 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.plutoWealth).toContain('변화');
    });

    it('should include pluto in 8th house', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'pluto', sign: 'scorpio', house: 8 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.plutoWealth).toContain('타인');
    });

    it('should not include pluto in other houses', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'pluto', sign: 'scorpio', house: 5 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.plutoWealth).toBeUndefined();
    });
  });

  describe('saturn wealth lesson', () => {
    it('should include saturn in 2nd house', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'saturn', sign: 'capricorn', house: 2 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.saturnWealth).toContain('시련');
    });

    it('should include saturn in 10th house', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'saturn', sign: 'capricorn', house: 10 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.saturnWealth).toContain('사회적 성공');
    });

    it('should not include saturn in other houses', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'saturn', sign: 'capricorn', house: 4 }],
      } as unknown as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result?.saturnWealth).toBeUndefined();
    });
  });

  describe('element wealth traits', () => {
    it('should include wood element wealth', () => {
      const saju = createBasicSaju();
      saju.fiveElements = { wood: 5, fire: 2, earth: 1, metal: 1, water: 1 };

      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.elementWealth).toContain('성장');
      expect(result?.luckyField).toContain('교육');
    });

    it('should include fire element wealth', () => {
      const saju = createBasicSaju();
      saju.fiveElements = { fire: 5, wood: 2, earth: 1, metal: 1, water: 1 };

      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.elementWealth).toContain('주목');
      expect(result?.luckyField).toContain('엔터테인먼트');
    });

    it('should include metal element wealth', () => {
      const saju = createBasicSaju();
      saju.fiveElements = { metal: 5, wood: 2, earth: 1, fire: 1, water: 1 };

      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.elementWealth).toContain('결단력');
      expect(result?.luckyField).toContain('금융');
    });
  });

  describe('default lucky field', () => {
    it('should provide default lucky field when no element', () => {
      const saju = { dayMaster: { name: '갑' } } as unknown as SajuData;

      const result = getWealthAnalysis(saju, undefined, 'ko');

      expect(result?.luckyField).toContain('전문성');
    });

    it('should provide English default lucky field', () => {
      const saju = { dayMaster: { name: '갑' } } as unknown as SajuData;

      const result = getWealthAnalysis(saju, undefined, 'en');

      expect(result?.luckyField).toContain('expertise');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined saju', () => {
      const result = getWealthAnalysis(undefined, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should handle empty astro data', () => {
      const saju = createBasicSaju();
      const result = getWealthAnalysis(saju, {} as AstroData, 'ko');

      expect(result).not.toBeNull();
      expect(result?.house2Style).toBeUndefined();
    });

    it('should handle missing planets array', () => {
      const saju = createBasicSaju();
      const astro = { houses: [{ index: 2, sign: 'taurus' }] } as AstroData;

      const result = getWealthAnalysis(saju, astro, 'ko');

      expect(result).not.toBeNull();
      expect(result?.jupiterWealth).toBeUndefined();
    });
  });
});
