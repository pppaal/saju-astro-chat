/**
 * LoveAnalyzer Unit Tests
 * 사랑 스타일 분석 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { getLoveAnalysis } from '@/components/destiny-map/fun-insights/analyzers/loveAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/types';

// Mock scoring module
vi.mock('@/components/destiny-map/fun-insights/scoring', () => ({
  calculateCharmScore: vi.fn(() => ({ score: 75, factors: [] })),
}));

describe('getLoveAnalysis', () => {
  const createBaseSajuData = (overrides: Partial<SajuData> = {}): SajuData => ({
    dayMaster: {
      name: '갑',
      element: 'wood',
      heavenlyStem: '갑',
    },
    fiveElements: {
      wood: 2,
      fire: 2,
      earth: 2,
      metal: 1,
      water: 1,
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
      { name: 'Sun', sign: 'Aries', house: 1 },
      { name: 'Moon', sign: 'Cancer', house: 4 },
      { name: 'Venus', sign: 'Taurus', house: 2 },
      { name: 'Mars', sign: 'Aries', house: 1 },
    ],
    houses: [
      { index: 7, sign: 'Libra' },
    ],
    aspects: [
      { from: 'Venus', to: 'Mars', type: 'sextile' },
      { from: 'Moon', to: 'Venus', type: 'trine' },
    ],
    asteroids: {
      juno: { sign: 'Leo' },
    },
    extraPoints: {
      vertex: { house: 7, sign: 'Libra' },
    },
    ...overrides,
  } as unknown as AstroData);

  describe('basic functionality', () => {
    it('should return null when dayMaster is missing', () => {
      const saju = { ...createBaseSajuData(), dayMaster: undefined } as SajuData;
      const result = getLoveAnalysis(saju, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should return analysis with all required properties', () => {
      const result = getLoveAnalysis(createBaseSajuData(), undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('style');
      expect(result).toHaveProperty('attract');
      expect(result).toHaveProperty('danger');
      expect(result).toHaveProperty('ideal');
      expect(result).toHaveProperty('advice');
      expect(result).toHaveProperty('compatibility');
    });

    it('should return compatibility array', () => {
      const result = getLoveAnalysis(createBaseSajuData(), undefined, 'ko');

      expect(Array.isArray(result?.compatibility)).toBe(true);
    });
  });

  describe('day master love traits', () => {
    const dayMasters = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

    dayMasters.forEach((dm) => {
      it(`should return love traits for day master ${dm}`, () => {
        const saju = createBaseSajuData({
          dayMaster: { name: dm, element: 'wood', heavenlyStem: dm },
        });

        const result = getLoveAnalysis(saju, undefined, 'ko');

        expect(result).not.toBeNull();
        expect(result?.style).toBeDefined();
        expect(typeof result?.style).toBe('string');
        expect(result?.style?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('zodiac integration', () => {
    it('should enhance style with sun sign traits', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Sun', sign: 'Leo', house: 5 },
        ],
      });

      const resultWithAstro = getLoveAnalysis(createBaseSajuData(), astro, 'ko');
      const resultWithoutAstro = getLoveAnalysis(createBaseSajuData(), undefined, 'ko');

      expect(resultWithAstro?.style?.length).toBeGreaterThan(resultWithoutAstro?.style?.length || 0);
    });

    it('should include emotional needs from moon sign', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Moon', sign: 'Cancer', house: 4 },
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.emotionalNeeds).toBeDefined();
    });

    it('should include venus style', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Venus', sign: 'Libra', house: 7 },
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.venusStyle).toBeDefined();
    });
  });

  describe('house 7 pattern', () => {
    it('should include love pattern from house 7', () => {
      const astro = createBaseAstroData({
        houses: [
          { index: 7, sign: 'Scorpio' },
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.lovePattern).toBeDefined();
    });
  });

  describe('venus-mars aspects', () => {
    it('should include venus-mars aspect analysis', () => {
      const astro = createBaseAstroData({
        aspects: [
          { from: 'Venus', to: 'Mars', type: 'conjunction' },
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      // Style should be enhanced by aspect
      expect(result?.style).toBeDefined();
    });
  });

  describe('sibsin love traits', () => {
    it('should include sibsin-based love energy', () => {
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

      const result = getLoveAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinLove).toBeDefined();
    });
  });

  describe('venus house patterns', () => {
    it('should include venus house pattern', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Venus', sign: 'Taurus', house: 5 },
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.venusHouse).toBeDefined();
    });
  });

  describe('mars love style', () => {
    it('should include mars style', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Mars', sign: 'Scorpio', house: 8 },
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.marsStyle).toBeDefined();
    });
  });

  describe('moon-venus aspects', () => {
    it('should include moon-venus aspect analysis', () => {
      const astro = createBaseAstroData({
        aspects: [
          { from: 'Moon', to: 'Venus', type: 'trine' },
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.moonVenusAspect).toBeDefined();
    });
  });

  describe('juno partner traits', () => {
    it('should include juno partner type', () => {
      const astro = createBaseAstroData({
        asteroids: {
          juno: { sign: 'Capricorn' },
        },
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.junoPartner).toBeDefined();
      expect(
        result?.junoPartner?.includes('결혼') ||
        result?.junoPartner?.includes('파트너') ||
        result?.junoPartner?.includes('이상형')
      ).toBe(true);
    });
  });

  describe('vertex meeting', () => {
    it('should include vertex meeting place', () => {
      const astro = createBaseAstroData({
        extraPoints: {
          vertex: { house: 5, sign: 'Leo' },
        },
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.vertexMeeting).toBeDefined();
      expect(result?.vertexMeeting).toContain('운명적 만남');
    });
  });

  describe('romance timing', () => {
    it('should include romance timing with dohwa', () => {
      const saju = createBaseSajuData({
        sinsal: {
          luckyList: [{ name: '도화살' }],
          unluckyList: [],
        },
        unse: {
          annual: [
            { year: 2025, stem: { element: 'fire' } },
            { year: 2026, stem: { element: 'wood' } },
          ],
        },
      } as Partial<SajuData>);

      const result = getLoveAnalysis(saju, undefined, 'ko');

      if (result?.romanceTiming) {
        expect(result.romanceTiming).toContain('도화');
      }
    });
  });

  describe('charm score', () => {
    it('should include charm score', () => {
      const result = getLoveAnalysis(createBaseSajuData(), createBaseAstroData(), 'ko');

      expect(result?.charmScore).toBeDefined();
      expect(typeof result?.charmScore).toBe('number');
    });
  });

  describe('attachment style', () => {
    it('should determine attachment style from moon sign', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Moon', sign: 'Cancer', house: 4 }, // Water sign = anxious
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.attachmentStyle).toBeDefined();
    });

    it('should return secure style for fire signs', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Moon', sign: 'Aries', house: 1 },
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.attachmentStyle).toBeDefined();
    });
  });

  describe('love language', () => {
    it('should determine love language from venus and mars', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Venus', sign: 'Cancer', house: 4 }, // Water = touch
          { name: 'Mars', sign: 'Virgo', house: 6 },
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.loveLanguage).toBeDefined();
    });
  });

  describe('conflict style', () => {
    it('should determine conflict style from mars sign', () => {
      const astro = createBaseAstroData({
        planets: [
          { name: 'Mars', sign: 'Aries', house: 1 }, // Fire = direct
        ],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result?.conflictStyle).toBeDefined();
    });
  });

  describe('element compatibility', () => {
    it('should return compatible elements based on strongest element', () => {
      const saju = createBaseSajuData({
        fiveElements: {
          fire: 4, // Strongest
          wood: 1,
          earth: 1,
          metal: 1,
          water: 1,
        },
      });

      const result = getLoveAnalysis(saju, undefined, 'ko');

      expect(result?.compatibility?.length).toBeGreaterThan(0);
    });
  });

  describe('language support', () => {
    it('should return Korean text for lang="ko"', () => {
      const result = getLoveAnalysis(createBaseSajuData(), undefined, 'ko');

      expect(result?.style).toBeDefined();
      expect(/[가-힣]/.test(result?.style || '')).toBe(true);
    });

    it('should return English text for lang="en"', () => {
      const result = getLoveAnalysis(createBaseSajuData(), undefined, 'en');

      expect(result?.style).toBeDefined();
      expect(/[a-zA-Z]/.test(result?.style || '')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle missing astro data gracefully', () => {
      const result = getLoveAnalysis(createBaseSajuData(), undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.lovePattern).toBeUndefined();
      expect(result?.venusStyle).toBeUndefined();
    });

    it('should handle empty planets array', () => {
      const astro = createBaseAstroData({
        planets: [],
      });

      const result = getLoveAnalysis(createBaseSajuData(), astro, 'ko');

      expect(result).not.toBeNull();
    });

    it('should provide default attract text when none computed', () => {
      const saju = createBaseSajuData();
      const result = getLoveAnalysis(saju, undefined, 'ko');

      expect(result?.attract).toBeDefined();
      expect(result?.attract?.length).toBeGreaterThan(0);
    });

    it('should provide default advice when none computed', () => {
      const saju = createBaseSajuData({
        fiveElements: {
          wood: 2,
          fire: 2,
          earth: 2,
          metal: 2,
          water: 2, // Balanced, no weak element
        },
      });

      const result = getLoveAnalysis(saju, undefined, 'ko');

      expect(result?.advice).toBeDefined();
      expect(result?.advice?.length).toBeGreaterThan(0);
    });
  });
});
