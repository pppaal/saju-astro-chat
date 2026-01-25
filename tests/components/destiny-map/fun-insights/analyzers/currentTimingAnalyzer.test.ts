/**
 * Current Timing Analyzer Tests
 * 현재 타이밍 분석기 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentTimingAnalysis } from '@/components/destiny-map/fun-insights/analyzers/currentTimingAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/fun-insights/types';

// Mock elementTraits
vi.mock('@/components/destiny-map/fun-insights/data', () => ({
  elementTraits: {
    wood: { ko: '목', en: 'Wood', emoji: '🌿' },
    fire: { ko: '화', en: 'Fire', emoji: '🔥' },
    earth: { ko: '토', en: 'Earth', emoji: '🏔️' },
    metal: { ko: '금', en: 'Metal', emoji: '⚔️' },
    water: { ko: '수', en: 'Water', emoji: '💧' },
  },
}));

describe('getCurrentTimingAnalysis', () => {
  beforeEach(() => {
    // Mock date to January 15, 2024
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createBasicSaju = (birthYear: number = 1990): SajuData => ({
    birthDate: `${birthYear}-05-15`,
    fiveElements: {
      wood: 30,
      fire: 25,
      earth: 20,
      metal: 15,
      water: 10,
    },
  } as unknown as SajuData);

  const createBasicAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', sign: 'capricorn' },
      { name: 'Moon', sign: 'aries' },
    ],
  } as unknown as AstroData);

  describe('today analysis', () => {
    it('should return today analysis with sun sign theme', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCurrentTimingAnalysis(saju, astro, 'ko');

      expect(result.today).not.toBeNull();
      expect(result.today?.title).toBe('오늘 흐름');
      expect(result.today?.subtitle).toContain('목표');
      expect(result.today?.emoji).toBe('🌅');
    });

    it('should return null today if no astro planets', () => {
      const saju = createBasicSaju();

      const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

      expect(result.today).toBeNull();
    });

    it('should include yongsin boost advice in Korean', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCurrentTimingAnalysis(saju, astro, 'ko');

      expect(result.today?.message).toContain('흐름 타는 법');
      expect(result.today?.message).toContain('수');
    });

    it('should return English today analysis', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCurrentTimingAnalysis(saju, astro, 'en');

      expect(result.today?.title).toBe("Today's Flow");
      expect(result.today?.subtitle).toContain('Goals');
    });

    describe('different sun signs', () => {
      const sunSigns = [
        { sign: 'aries', koTheme: '새로운 시작', enTheme: 'New beginnings' },
        { sign: 'taurus', koTheme: '안정과 풍요', enTheme: 'Stability' },
        { sign: 'gemini', koTheme: '소통과 학습', enTheme: 'Communication' },
        { sign: 'cancer', koTheme: '감정과 가족', enTheme: 'Emotions' },
        { sign: 'leo', koTheme: '자신감', enTheme: 'Confidence' },
        { sign: 'virgo', koTheme: '실용', enTheme: 'Practicality' },
        { sign: 'libra', koTheme: '관계와 조화', enTheme: 'Relationships' },
        { sign: 'scorpio', koTheme: '변화', enTheme: 'Transformation' },
        { sign: 'sagittarius', koTheme: '확장', enTheme: 'Expansion' },
        { sign: 'capricorn', koTheme: '목표', enTheme: 'Goals' },
        { sign: 'aquarius', koTheme: '혁신', enTheme: 'Innovation' },
        { sign: 'pisces', koTheme: '직관', enTheme: 'Intuition' },
      ];

      sunSigns.forEach(({ sign, koTheme }) => {
        it(`should handle ${sign} sun sign`, () => {
          const saju = createBasicSaju();
          const astro: AstroData = {
            planets: [{ name: 'Sun', sign }],
          } as unknown as AstroData;

          const result = getCurrentTimingAnalysis(saju, astro, 'ko');

          expect(result.today?.subtitle).toContain(koTheme);
        });
      });
    });
  });

  describe('thisMonth analysis', () => {
    it('should return this month analysis in Korean', () => {
      const saju = createBasicSaju();

      const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

      expect(result.thisMonth).not.toBeNull();
      expect(result.thisMonth?.title).toBe('이번 달 흐름');
      expect(result.thisMonth?.emoji).toBe('🌙');
    });

    it('should return this month analysis in English', () => {
      const saju = createBasicSaju();

      const result = getCurrentTimingAnalysis(saju, undefined, 'en');

      expect(result.thisMonth?.title).toBe("This Month's Flow");
    });

    it('should identify month energy (January = water)', () => {
      const saju = createBasicSaju();

      const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

      expect(result.thisMonth?.subtitle).toContain('휴식');
    });

    it('should indicate good match when month element matches yongsin', () => {
      // January is water, set water as weakest (yongsin)
      const saju: SajuData = {
        birthDate: '1990-05-15',
        fiveElements: {
          wood: 30,
          fire: 25,
          earth: 25,
          metal: 15,
          water: 5, // weakest = yongsin
        },
      } as unknown as SajuData;

      const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

      expect(result.thisMonth?.message).toContain('딱 맞는 달');
    });

    it('should indicate caution when month element clashes with yongsin', () => {
      // January is water, water克earth, so if yongsin is earth...
      // Actually: wood克earth, fire克metal, earth克water, metal克wood, water克fire
      // January = water克fire, so if yongsin is fire
      const saju: SajuData = {
        birthDate: '1990-05-15',
        fiveElements: {
          wood: 30,
          fire: 5, // weakest = yongsin (fire)
          earth: 25,
          metal: 20,
          water: 20,
        },
      } as unknown as SajuData;

      const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

      expect(result.thisMonth?.message).toContain('조심스러운');
    });

    describe('different months', () => {
      const monthTests = [
        { month: 0, element: 'water', koDesc: '휴식' }, // January
        { month: 1, element: 'wood', koDesc: '성장' },  // February
        { month: 2, element: 'wood', koDesc: '성장' },  // March
        { month: 3, element: 'earth', koDesc: '안정' }, // April
        { month: 4, element: 'fire', koDesc: '열정' },  // May
        { month: 5, element: 'fire', koDesc: '열정' },  // June
        { month: 6, element: 'earth', koDesc: '안정' }, // July
        { month: 7, element: 'metal', koDesc: '정리' }, // August
        { month: 8, element: 'metal', koDesc: '정리' }, // September
        { month: 9, element: 'earth', koDesc: '안정' }, // October
        { month: 10, element: 'water', koDesc: '휴식' }, // November
        { month: 11, element: 'water', koDesc: '휴식' }, // December
      ];

      monthTests.forEach(({ month, koDesc }) => {
        it(`should handle month ${month + 1} correctly`, () => {
          vi.setSystemTime(new Date(2024, month, 15));
          const saju = createBasicSaju();

          const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

          expect(result.thisMonth?.subtitle).toContain(koDesc);
        });
      });
    });
  });

  describe('currentStage analysis', () => {
    it('should return current stage analysis in Korean', () => {
      const saju = createBasicSaju(1990); // Age 34 in 2024

      const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

      expect(result.currentStage).not.toBeNull();
      expect(result.currentStage?.title).toBe('지금 인생 단계');
      expect(result.currentStage?.emoji).toBe('🦋');
    });

    it('should return current stage analysis in English', () => {
      const saju = createBasicSaju(1990);

      const result = getCurrentTimingAnalysis(saju, undefined, 'en');

      expect(result.currentStage?.title).toBe('Life Stage Now');
    });

    it('should calculate age correctly from birthDate', () => {
      const saju = createBasicSaju(1990); // Age 34 in 2024

      const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

      expect(result.currentStage?.message).toContain('34세');
    });

    describe('different life stages based on age', () => {
      // daeunProgress = age % 10 maps to stageDescriptions
      // 0: 씨앗을 심는 시기, 1: 기반을 다지는 시기, 2: 성장하는 시기, 3: 꽃을 피우는 시기
      // 4: 열매를 맺는 시기, 5: 수확하는 시기, 6: 정리하는 시기, 7: 지혜를 나누는 시기
      // 8: 재정비하는 시기, 9: 다음을 준비하는 시기
      const stageTests = [
        { birthYear: 2024, expectedStage: '씨앗을 심는 시기' },       // age 0, daeunProgress 0
        { birthYear: 2023, expectedStage: '기반을 다지는 시기' },     // age 1, daeunProgress 1
        { birthYear: 2022, expectedStage: '성장하는 시기' },          // age 2, daeunProgress 2
        { birthYear: 2021, expectedStage: '꽃을 피우는 시기' },       // age 3, daeunProgress 3
        { birthYear: 2020, expectedStage: '열매를 맺는 시기' },       // age 4, daeunProgress 4
        { birthYear: 2019, expectedStage: '수확하는 시기' },          // age 5, daeunProgress 5
        { birthYear: 2018, expectedStage: '정리하는 시기' },          // age 6, daeunProgress 6
        { birthYear: 2017, expectedStage: '지혜를 나누는 시기' },     // age 7, daeunProgress 7
        { birthYear: 2016, expectedStage: '재정비하는 시기' },        // age 8, daeunProgress 8
        { birthYear: 2015, expectedStage: '다음을 준비하는 시기' },   // age 9, daeunProgress 9
        { birthYear: 2014, expectedStage: '씨앗을 심는 시기' },       // age 10, daeunProgress 0
      ];

      stageTests.forEach(({ birthYear, expectedStage }) => {
        it(`should show "${expectedStage}" for birth year ${birthYear}`, () => {
          const saju = createBasicSaju(birthYear);

          const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

          expect(result.currentStage?.subtitle).toBe(expectedStage);
        });
      });
    });

    describe('stage phase yongsin advice', () => {
      it('should give early phase advice (0-2 years in daeun)', () => {
        // Age 30 = daeunProgress 0
        const saju = createBasicSaju(1994);

        const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

        // Early phase has specific advice
        expect(result.currentStage?.message).toContain('이 단계에서는');
      });

      it('should give mid phase advice (3-6 years in daeun)', () => {
        // Age 34 = daeunProgress 4
        const saju = createBasicSaju(1990);

        const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

        expect(result.currentStage?.message).toContain('이 단계에서는');
      });

      it('should give late phase advice (7-9 years in daeun)', () => {
        // Age 37 = daeunProgress 7
        const saju = createBasicSaju(1987);

        const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

        expect(result.currentStage?.message).toContain('이 단계에서는');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined saju', () => {
      const result = getCurrentTimingAnalysis(undefined, undefined, 'ko');

      expect(result.today).toBeNull();
      expect(result.thisMonth).toBeDefined();
      expect(result.currentStage).toBeDefined();
    });

    it('should handle missing birthDate (default to 1990)', () => {
      const saju: SajuData = {
        fiveElements: { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 },
      } as unknown as SajuData;

      const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

      expect(result.currentStage?.message).toContain('34세'); // 2024 - 1990
    });

    it('should handle empty planets array', () => {
      const saju = createBasicSaju();
      const astro: AstroData = { planets: [] } as unknown as AstroData;

      const result = getCurrentTimingAnalysis(saju, astro, 'ko');

      expect(result.today).toBeNull();
    });

    it('should handle planets without sun', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'Moon', sign: 'aries' }],
      } as unknown as AstroData;

      const result = getCurrentTimingAnalysis(saju, astro, 'ko');

      expect(result.today).toBeNull();
    });

    it('should handle unknown sun sign', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'Sun', sign: 'unknown' }],
      } as unknown as AstroData;

      const result = getCurrentTimingAnalysis(saju, astro, 'ko');

      expect(result.today).toBeNull();
    });

    it('should handle missing fiveElements', () => {
      const saju: SajuData = {
        birthDate: '1990-05-15',
      } as unknown as SajuData;

      const result = getCurrentTimingAnalysis(saju, undefined, 'ko');

      // Should still work, just without yongsin-specific advice
      expect(result.thisMonth).toBeDefined();
      expect(result.currentStage).toBeDefined();
    });
  });

  describe('return structure', () => {
    it('should return all three analysis sections', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCurrentTimingAnalysis(saju, astro, 'ko');

      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('thisMonth');
      expect(result).toHaveProperty('currentStage');
    });

    it('should have consistent structure for each section', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCurrentTimingAnalysis(saju, astro, 'ko');

      // today
      expect(result.today).toHaveProperty('title');
      expect(result.today).toHaveProperty('subtitle');
      expect(result.today).toHaveProperty('message');
      expect(result.today).toHaveProperty('emoji');

      // thisMonth
      expect(result.thisMonth).toHaveProperty('title');
      expect(result.thisMonth).toHaveProperty('subtitle');
      expect(result.thisMonth).toHaveProperty('message');
      expect(result.thisMonth).toHaveProperty('emoji');

      // currentStage
      expect(result.currentStage).toHaveProperty('title');
      expect(result.currentStage).toHaveProperty('subtitle');
      expect(result.currentStage).toHaveProperty('message');
      expect(result.currentStage).toHaveProperty('emoji');
    });
  });
});
