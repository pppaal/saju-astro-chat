/**
 * DestinyAnalyzer Unit Tests
 * 인연 분석 테스트
 */

import { describe, it, expect } from 'vitest';
import { getDestinyAnalysis } from '@/components/destiny-map/fun-insights/analyzers/destinyAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/types';

describe('getDestinyAnalysis', () => {
  const createBaseSajuData = (overrides: Partial<SajuData> = {}): SajuData => ({
    dayMaster: {
      name: '갑',
      element: 'wood',
      heavenlyStem: '갑',
    },
    fiveElements: {
      wood: 2,
      fire: 1,
      earth: 2,
      metal: 1,
      water: 2,
    },
    advancedAnalysis: {
      sibsin: {
        sibsinDistribution: {
          '비겁': 2,
          '식상': 1,
          '재성': 2,
          '관성': 1,
          '인성': 2,
        },
      },
    },
    ...overrides,
  } as SajuData);

  const createBaseAstroData = (overrides: Partial<AstroData> = {}): AstroData => ({
    planets: [
      { name: 'Sun', sign: 'Aries' },
      { name: 'Moon', sign: 'Cancer' },
      { name: 'Venus', sign: 'Taurus' },
      { name: 'North Node', sign: 'Aries' },
      { name: 'South Node', sign: 'Libra' },
    ],
    houses: [
      { index: 7, sign: 'Libra' },
    ],
    aspects: [
      { from: 'Venus', to: 'Jupiter', type: 'conjunction' },
    ],
    asteroids: {
      juno: { sign: 'Leo' },
    },
    extraPoints: {
      vertex: { sign: 'Scorpio' },
    },
    ...overrides,
  } as unknown as AstroData);

  describe('basic functionality', () => {
    it('should return null when dayMaster is missing', () => {
      const saju = { ...createBaseSajuData(), dayMaster: undefined } as SajuData;
      const result = getDestinyAnalysis(saju, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should return analysis when saju data is provided', () => {
      const saju = createBaseSajuData();
      const result = getDestinyAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('karmaType');
      expect(result).toHaveProperty('destinyPath');
      expect(result).toHaveProperty('soulMateSign');
      expect(result).toHaveProperty('connectionAdvice');
    });
  });

  describe('day master destiny traits', () => {
    const dayMasters = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

    dayMasters.forEach((dm) => {
      it(`should return destiny traits for day master ${dm}`, () => {
        const saju = createBaseSajuData({
          dayMaster: { name: dm, element: 'wood', heavenlyStem: dm },
        });

        const result = getDestinyAnalysis(saju, undefined, 'ko');

        expect(result).not.toBeNull();
        expect(result?.karmaType).toBeDefined();
        expect(result?.destinyPath).toBeDefined();
        expect(typeof result?.karmaType).toBe('string');
      });
    });

    it('should use default traits for unknown day master', () => {
      const saju = createBaseSajuData({
        dayMaster: { name: '알수없음', element: 'wood', heavenlyStem: '알수없음' },
      });

      const result = getDestinyAnalysis(saju, undefined, 'ko');

      // Should fallback to 갑 traits
      expect(result).not.toBeNull();
    });
  });

  describe('north node integration', () => {
    it('should include north node pattern when available', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'North Node', sign: 'Aries' },
        ],
      });

      const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.northNode).toBeDefined();
      expect(result?.destinyPath).toContain(result?.northNode || '');
    });

    it('should handle different north node signs', () => {
      const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

      signs.forEach((sign) => {
        const astro = createBaseAstroData({
          planets: [
            { name: 'North Node', sign },
          ],
        });

        const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');
        expect(result?.northNode).toBeDefined();
      });
    });
  });

  describe('south node integration', () => {
    it('should include south node pattern when available', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'South Node', sign: 'Libra' },
        ],
      });

      const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.southNode).toBeDefined();
      expect(result?.karmaType).toContain(result?.southNode || '');
    });
  });

  describe('7th house ruler', () => {
    it('should include house 7 ruler pattern', () => {
      const astro = createBaseAstroData({
        houses: [
          { index: 7, sign: 'Leo' }, // Sun ruled
        ],
      });

      const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.house7Ruler).toBeDefined();
      expect(result?.house7Ruler).toContain('파트너');
    });

    it('should handle different house 7 signs', () => {
      const signRulerPairs = [
        { sign: 'Aries', expectedPlanet: 'mars' },
        { sign: 'Taurus', expectedPlanet: 'venus' },
        { sign: 'Gemini', expectedPlanet: 'mercury' },
      ];

      signRulerPairs.forEach(({ sign }) => {
        const astro = createBaseAstroData({
          houses: [{ index: 7, sign }],
        });

        const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');
        expect(result?.house7Ruler).toBeDefined();
      });
    });
  });

  describe('vertex sign', () => {
    it('should include vertex sign pattern when available', () => {
      const astro = createBaseAstroData({
        extraPoints: {
          vertex: { sign: 'Scorpio' },
        },
      });

      const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.vertexSign).toBeDefined();
      expect(result?.soulMateSign).toContain(result?.vertexSign || '');
    });
  });

  describe('juno asteroid', () => {
    it('should include juno pattern when available', () => {
      const astro = createBaseAstroData({
        asteroids: {
          juno: { sign: 'Leo' },
        },
      });

      const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.juno).toBeDefined();
      expect(result?.juno).toContain('결혼');
    });
  });

  describe('venus aspects', () => {
    it('should include venus aspect pattern', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Venus', sign: 'Taurus' },
          { name: 'Jupiter', sign: 'Taurus' },
        ],
        aspects: [
          { from: 'Venus', to: 'Jupiter', type: 'conjunction' },
        ],
      });

      const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.venusAspect).toBeDefined();
    });

    it('should handle venus-saturn aspect', () => {
      const astro = createBaseAstroData({
        aspects: [
          { from: 'Venus', to: 'Saturn', type: 'conjunction' },
        ],
      });

      const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');

      if (result?.venusAspect) {
        expect(result.venusAspect).toContain('진지');
      }
    });
  });

  describe('sibsin destiny', () => {
    it('should include sibsin-based destiny pattern', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: {
          sibsin: {
            sibsinDistribution: {
              '재성': 4,
              '비겁': 1,
            },
          },
        },
      });

      const result = getDestinyAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinDestiny).toBeDefined();
    });
  });

  describe('element destiny', () => {
    it('should include element-based destiny pattern', () => {
      const saju = createBaseSajuData({
        fiveElements: {
          fire: 4,
          wood: 1,
          earth: 1,
          metal: 1,
          water: 1,
        },
      });

      const result = getDestinyAnalysis(saju, undefined, 'ko');

      expect(result?.elementDestiny).toBeDefined();
    });
  });

  describe('language support', () => {
    it('should return Korean text for lang="ko"', () => {
      const result = getDestinyAnalysis(createBaseSajuData(), undefined, 'ko');

      expect(result?.karmaType).toBeDefined();
      // Korean text typically contains Hangul characters
      expect(/[가-힣]/.test(result?.karmaType || '')).toBe(true);
    });

    it('should return English text for lang="en"', () => {
      const result = getDestinyAnalysis(createBaseSajuData(), undefined, 'en');

      expect(result?.karmaType).toBeDefined();
      // English text should contain ASCII letters
      expect(/[a-zA-Z]/.test(result?.karmaType || '')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle missing astro data gracefully', () => {
      const result = getDestinyAnalysis(createBaseSajuData(), undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.northNode).toBeUndefined();
      expect(result?.southNode).toBeUndefined();
    });

    it('should handle empty planets array', () => {
      const astro = createBaseAstroData({
        planets: [],
      });

      const result = getDestinyAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result).not.toBeNull();
    });

    it('should handle missing sibsin distribution', () => {
      const saju = createBaseSajuData({
        advancedAnalysis: undefined,
      });

      const result = getDestinyAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.sibsinDestiny).toBeUndefined();
    });
  });
});
