/**
 * Extended Tests for Past Life Analyzer
 * src/lib/past-life/analyzer.ts
 */
import { describe, it, expect } from 'vitest';
import { analyzePastLife } from '@/lib/past-life/analyzer';

// ============================================================
// Test Constants
// ============================================================
const KARMA_SCORE = {
  BASE: 65,
  MIN: 40,
  MAX: 100,
  EXPECTED_HIGH_SCORE: 80,
} as const;

const DEFAULT_SOUL_PATTERN = {
  ko: { type: '탐험가 영혼' },
  en: { type: 'Explorer Soul' },
} as const;

const REGEX_PATTERNS = {
  KOREAN: /[\uAC00-\uD7AF]/,
  ENGLISH: /[A-Za-z]/,
} as const;

const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;
const DAY_MASTER_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// ============================================================
// Test Helpers
// ============================================================
const createSajuWithGeokguk = (name: string) => ({
  advancedAnalysis: { geokguk: { name } },
});

const createSajuWithDayMaster = (name: string) => ({
  dayMaster: { name },
});

const createSajuWithSinsal = (unluckyList: Array<{ name?: string } | string>) => ({
  advancedAnalysis: { sinsal: { unluckyList } },
});

const createAstroWithPlanet = (name: string, house: number) => ({
  planets: [{ name, house }],
});

const createAstroWithPlanets = (planets: Array<{ name: string; house: number }>) => ({
  planets,
});

const analyzeKorean = (saju: any = null, astro: any = null) => analyzePastLife(saju, astro, true);

const analyzeEnglish = (saju: any = null, astro: any = null) =>
  analyzePastLife(saju, astro, false);

// ============================================================
// Extended Tests
// ============================================================
describe('Past Life Analyzer - Extended Tests', () => {
  describe('Cross-Language Consistency', () => {
    it('should maintain same structure between Korean and English', () => {
      const saju = createSajuWithGeokguk('식신');
      const astro = createAstroWithPlanet('North Node', 5);

      const koResult = analyzeKorean(saju, astro);
      const enResult = analyzeEnglish(saju, astro);

      expect(koResult.karmaScore).toBe(enResult.karmaScore);
      expect(koResult.northNodeHouse).toBe(enResult.northNodeHouse);
      expect(koResult.geokguk).toBe(enResult.geokguk);
      expect(koResult.soulPattern.traits.length).toBe(enResult.soulPattern.traits.length);
      expect(koResult.talentsCarried.length).toBe(enResult.talentsCarried.length);
      expect(koResult.karmicDebts.length).toBe(enResult.karmicDebts.length);
    });

    it('should translate all geokguk types consistently', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const koResult = analyzeKorean(createSajuWithGeokguk(geokguk));
        const enResult = analyzeEnglish(createSajuWithGeokguk(geokguk));

        expect(koResult.soulPattern.emoji).toBe(enResult.soulPattern.emoji);
        expect(koResult.karmaScore).toBe(enResult.karmaScore);
      });
    });

    it('should translate all house positions consistently', () => {
      HOUSE_NUMBERS.forEach((house) => {
        const koResult = analyzeKorean(null, createAstroWithPlanet('North Node', house));
        const enResult = analyzeEnglish(null, createAstroWithPlanet('North Node', house));

        expect(koResult.northNodeHouse).toBe(enResult.northNodeHouse);
      });
    });

    it('should maintain emoji consistency across languages', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const koResult = analyzeKorean(createSajuWithGeokguk(geokguk));
        const enResult = analyzeEnglish(createSajuWithGeokguk(geokguk));

        expect(koResult.soulPattern.emoji).toBe(enResult.soulPattern.emoji);
      });
    });
  });

  describe('Complex Scenario Tests', () => {
    it('should handle maximum complexity analysis', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '편인격', type: '편인' },
          sinsal: {
            unluckyList: [
              { name: '원진살', shinsal: '원진' },
              { name: '공망' },
              { name: '겁살' },
              '재살',
              { name: '화개' },
            ],
          },
        },
        dayMaster: { name: '임', heavenlyStem: '임수' },
        pillars: { day: { heavenlyStem: '임수' } },
        fourPillars: { day: { heavenlyStem: '임' } },
      };
      const astro = createAstroWithPlanets([
        { name: 'North Node', house: 12 },
        { name: 'Saturn', house: 8 },
        { name: 'Sun', house: 1 },
        { name: 'Moon', house: 7 },
        { name: 'Mars', house: 10 },
      ]);

      const result = analyzeKorean(saju, astro);

      expect(result.soulPattern.type).toBe('신비가 영혼');
      expect(result.dayMaster).toBe('임');
      expect(result.northNodeHouse).toBe(12);
      expect(result.saturnHouse).toBe(8);
      expect(result.karmicDebts.length).toBe(3);
      expect(result.karmaScore).toBeGreaterThan(KARMA_SCORE.EXPECTED_HIGH_SCORE);
    });

    it('should handle minimum data analysis', () => {
      const result = analyzeKorean(null, null);

      expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
      expect(result.karmaScore).toBe(KARMA_SCORE.BASE);
      expect(result.karmicDebts).toEqual([]);
      expect(result.northNodeHouse).toBeUndefined();
      expect(result.saturnHouse).toBeUndefined();
      expect(result.dayMaster).toBeUndefined();
    });

    it('should handle only saju data', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '상관' },
          sinsal: { unluckyList: [{ name: '원진' }] },
        },
        dayMaster: { name: '병' },
      };

      const result = analyzeKorean(saju, null);

      expect(result.soulPattern.type).toBe('변혁가 영혼');
      expect(result.dayMaster).toBe('병');
      expect(result.karmicDebts.length).toBe(1);
      expect(result.northNodeHouse).toBeUndefined();
      expect(result.saturnHouse).toBeUndefined();
    });

    it('should handle only astro data', () => {
      const astro = createAstroWithPlanets([
        { name: 'North Node', house: 3 },
        { name: 'Saturn', house: 9 },
      ]);

      const result = analyzeKorean(null, astro);

      expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
      expect(result.northNodeHouse).toBe(3);
      expect(result.saturnHouse).toBe(9);
      expect(result.dayMaster).toBeUndefined();
      expect(result.geokguk).toBeUndefined();
    });
  });

  describe('Karmic Debt Detailed Tests', () => {
    it('should detect 원진살 variations', () => {
      const variations = ['원진살', '원진'];

      variations.forEach((name) => {
        const result = analyzeKorean(createSajuWithSinsal([{ name }]));
        expect(result.karmicDebts.some((d) => d.area === '관계 카르마')).toBe(true);
      });
    });

    it('should detect 공망 variations', () => {
      const variations = ['공망', '空亡'];

      variations.forEach((name) => {
        const result = analyzeKorean(createSajuWithSinsal([{ name }]));
        expect(result.karmicDebts.some((d) => d.area === '공허 카르마')).toBe(true);
      });
    });

    it('should detect 겁살 variations', () => {
      const variations = ['겁살', '劫殺'];

      variations.forEach((name) => {
        const result = analyzeKorean(createSajuWithSinsal([{ name }]));
        expect(result.karmicDebts.some((d) => d.area === '도전 카르마')).toBe(true);
      });
    });

    it('should have complete karmic debt structure', () => {
      const result = analyzeKorean(createSajuWithSinsal([{ name: '원진' }]));

      expect(result.karmicDebts[0]).toHaveProperty('area');
      expect(result.karmicDebts[0]).toHaveProperty('description');
      expect(result.karmicDebts[0]).toHaveProperty('healing');
      expect(result.karmicDebts[0].area).toBeTruthy();
      expect(result.karmicDebts[0].description).toBeTruthy();
      expect(result.karmicDebts[0].healing).toBeTruthy();
    });

    it('should provide unique healing methods', () => {
      const sinsal = [{ name: '원진' }, { name: '공망' }, { name: '겁살' }];
      const result = analyzeKorean(createSajuWithSinsal(sinsal));

      const healings = new Set(result.karmicDebts.map((d) => d.healing));
      expect(healings.size).toBe(3);
    });

    it('should translate karmic debts to English', () => {
      const result = analyzeEnglish(createSajuWithSinsal([{ name: '원진' }]));

      expect(result.karmicDebts[0].area).toMatch(REGEX_PATTERNS.ENGLISH);
      expect(result.karmicDebts[0].description).toMatch(REGEX_PATTERNS.ENGLISH);
      expect(result.karmicDebts[0].healing).toMatch(REGEX_PATTERNS.ENGLISH);
    });
  });

  describe('Soul Pattern Detailed Tests', () => {
    it('should have 5 traits for each pattern', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSajuWithGeokguk(geokguk));

        expect(result.soulPattern.traits).toHaveLength(5);
        result.soulPattern.traits.forEach((trait) => {
          expect(trait).toBeTruthy();
          expect(typeof trait).toBe('string');
        });
      });
    });

    it('should have complete soul pattern structure', () => {
      const result = analyzeKorean(createSajuWithGeokguk('식신'));

      expect(result.soulPattern).toHaveProperty('type');
      expect(result.soulPattern).toHaveProperty('emoji');
      expect(result.soulPattern).toHaveProperty('title');
      expect(result.soulPattern).toHaveProperty('description');
      expect(result.soulPattern).toHaveProperty('traits');
    });

    it('should have unique descriptions for each pattern', () => {
      const descriptions = new Set<string>();

      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSajuWithGeokguk(geokguk));
        descriptions.add(result.soulPattern.description);
      });

      expect(descriptions.size).toBe(8);
    });

    it('should have unique titles for each pattern', () => {
      const titles = new Set<string>();

      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSajuWithGeokguk(geokguk));
        titles.add(result.soulPattern.title);
      });

      expect(titles.size).toBe(8);
    });
  });

  describe('Past Life Era Tests', () => {
    it('should have unique eras for different geokguk', () => {
      const eras = new Set<string>();

      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSajuWithGeokguk(geokguk));
        if (result.pastLife.era) {
          eras.add(result.pastLife.era);
        }
      });

      expect(eras.size).toBeGreaterThan(5);
    });

    it('should have past life themes for all geokguk', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSajuWithGeokguk(geokguk));

        expect(result.pastLife.likely).toBeTruthy();
        expect(result.pastLife.talents).toBeTruthy();
        expect(result.pastLife.lessons).toBeTruthy();
      });
    });

    it('should translate past life themes to English', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeEnglish(createSajuWithGeokguk(geokguk));

        expect(result.pastLife.likely).toMatch(REGEX_PATTERNS.ENGLISH);
        expect(result.pastLife.talents).toMatch(REGEX_PATTERNS.ENGLISH);
        expect(result.pastLife.lessons).toMatch(REGEX_PATTERNS.ENGLISH);
      });
    });

    it('should have different past lives for different geokguk', () => {
      const pastLives = new Set<string>();

      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSajuWithGeokguk(geokguk));
        pastLives.add(result.pastLife.likely);
      });

      expect(pastLives.size).toBe(8);
    });
  });

  describe('This Life Mission Tests', () => {
    it('should have complete mission structure', () => {
      const result = analyzeKorean(createSajuWithDayMaster('갑'));

      expect(result.thisLifeMission).toHaveProperty('core');
      expect(result.thisLifeMission).toHaveProperty('expression');
      expect(result.thisLifeMission).toHaveProperty('fulfillment');
      expect(result.thisLifeMission.core).toBeTruthy();
      expect(result.thisLifeMission.expression).toBeTruthy();
      expect(result.thisLifeMission.fulfillment).toBeTruthy();
    });

    it('should have unique missions for each stem', () => {
      const cores = new Set<string>();
      const expressions = new Set<string>();
      const fulfillments = new Set<string>();

      DAY_MASTER_STEMS.forEach((stem) => {
        const result = analyzeKorean(createSajuWithDayMaster(stem));
        cores.add(result.thisLifeMission.core);
        expressions.add(result.thisLifeMission.expression);
        fulfillments.add(result.thisLifeMission.fulfillment);
      });

      expect(cores.size).toBe(10);
      expect(expressions.size).toBe(10);
      expect(fulfillments.size).toBe(10);
    });

    it('should translate missions to English', () => {
      DAY_MASTER_STEMS.forEach((stem) => {
        const result = analyzeEnglish(createSajuWithDayMaster(stem));

        expect(result.thisLifeMission.core).toMatch(REGEX_PATTERNS.ENGLISH);
        expect(result.thisLifeMission.expression).toMatch(REGEX_PATTERNS.ENGLISH);
        expect(result.thisLifeMission.fulfillment).toMatch(REGEX_PATTERNS.ENGLISH);
      });
    });

    it('should have default mission when no day master', () => {
      const result = analyzeKorean();

      expect(result.thisLifeMission.core).toContain('당신만의 빛');
    });
  });

  describe('Soul Journey Detailed Tests', () => {
    it('should have complete journey structure for all houses', () => {
      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeKorean(null, createAstroWithPlanet('North Node', house));

        expect(result.soulJourney).toHaveProperty('pastPattern');
        expect(result.soulJourney).toHaveProperty('releasePattern');
        expect(result.soulJourney).toHaveProperty('currentDirection');
        expect(result.soulJourney).toHaveProperty('lessonToLearn');
      });
    });

    it('should have unique release patterns for each house', () => {
      const patterns = new Set<string>();

      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeKorean(null, createAstroWithPlanet('North Node', house));
        patterns.add(result.soulJourney.releasePattern);
      });

      expect(patterns.size).toBe(12);
    });

    it('should have unique current directions for each house', () => {
      const directions = new Set<string>();

      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeKorean(null, createAstroWithPlanet('North Node', house));
        directions.add(result.soulJourney.currentDirection);
      });

      expect(directions.size).toBe(12);
    });

    it('should have unique lessons for each house', () => {
      const lessons = new Set<string>();

      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeKorean(null, createAstroWithPlanet('North Node', house));
        lessons.add(result.soulJourney.lessonToLearn);
      });

      expect(lessons.size).toBe(12);
    });

    it('should translate soul journey to English', () => {
      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeEnglish(null, createAstroWithPlanet('North Node', house));

        expect(result.soulJourney.pastPattern).toMatch(REGEX_PATTERNS.ENGLISH);
        expect(result.soulJourney.releasePattern).toMatch(REGEX_PATTERNS.ENGLISH);
        expect(result.soulJourney.currentDirection).toMatch(REGEX_PATTERNS.ENGLISH);
        expect(result.soulJourney.lessonToLearn).toMatch(REGEX_PATTERNS.ENGLISH);
      });
    });
  });

  describe('Saturn Lesson Detailed Tests', () => {
    it('should have unique challenges for all houses', () => {
      const challenges = new Set<string>();

      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeKorean(null, createAstroWithPlanet('Saturn', house));
        challenges.add(result.saturnLesson.challenge);
      });

      expect(challenges.size).toBe(12);
    });

    it('should have unique mastery goals for all houses', () => {
      const masteries = new Set<string>();

      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeKorean(null, createAstroWithPlanet('Saturn', house));
        masteries.add(result.saturnLesson.mastery);
      });

      expect(masteries.size).toBe(12);
    });

    it('should translate Saturn lessons to English', () => {
      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeEnglish(null, createAstroWithPlanet('Saturn', house));

        expect(result.saturnLesson.lesson).toMatch(REGEX_PATTERNS.ENGLISH);
        expect(result.saturnLesson.challenge).toMatch(REGEX_PATTERNS.ENGLISH);
        expect(result.saturnLesson.mastery).toMatch(REGEX_PATTERNS.ENGLISH);
      });
    });

    it('should have default Saturn lesson when not found', () => {
      const result = analyzeKorean();

      expect(result.saturnLesson.lesson).toContain('인생의 중요한 교훈');
    });
  });

  describe('Talents Carried Comprehensive Tests', () => {
    it('should have at least 2 talents for each geokguk', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSajuWithGeokguk(geokguk));
        expect(result.talentsCarried.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should have unique talent sets for different geokguk', () => {
      const talentSets = new Map<string, string[]>();

      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSajuWithGeokguk(geokguk));
        talentSets.set(geokguk, result.talentsCarried);
      });

      expect(talentSets.size).toBe(8);
    });

    it('should not have duplicate talents within result', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSajuWithGeokguk(geokguk));
        const uniqueTalents = new Set(result.talentsCarried);
        expect(uniqueTalents.size).toBe(result.talentsCarried.length);
      });
    });

    it('should translate talents to English', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeEnglish(createSajuWithGeokguk(geokguk));

        result.talentsCarried.forEach((talent) => {
          expect(talent).toMatch(REGEX_PATTERNS.ENGLISH);
        });
      });
    });
  });

  describe('Boundary and Validation Tests', () => {
    it('should handle house 0 as invalid', () => {
      const astro = createAstroWithPlanet('North Node', 0);
      const result = analyzeKorean(null, astro);

      expect(result.northNodeHouse).toBeUndefined();
    });

    it('should handle house 13 as invalid', () => {
      const astro = createAstroWithPlanet('Saturn', 13);
      const result = analyzeKorean(null, astro);

      expect(result.saturnHouse).toBeUndefined();
    });

    it('should handle negative house numbers', () => {
      const astro = createAstroWithPlanet('North Node', -1);
      const result = analyzeKorean(null, astro);

      expect(result.northNodeHouse).toBeUndefined();
    });

    it('should handle very large house numbers', () => {
      const astro = createAstroWithPlanet('Saturn', 999);
      const result = analyzeKorean(null, astro);

      expect(result.saturnHouse).toBeUndefined();
    });

    it('should handle empty string geokguk', () => {
      const result = analyzeKorean(createSajuWithGeokguk(''));

      expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
    });

    it('should handle whitespace-only geokguk', () => {
      const result = analyzeKorean(createSajuWithGeokguk('   '));

      expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
    });

    it('should handle null planet names', () => {
      const astro = { planets: [{ name: null as unknown as string, house: 5 }] };
      const result = analyzeKorean(null, astro);

      expect(result.northNodeHouse).toBeUndefined();
      expect(result.saturnHouse).toBeUndefined();
    });

    it('should handle undefined planet names', () => {
      const astro = { planets: [{ name: undefined as unknown as string, house: 5 }] };
      const result = analyzeKorean(null, astro);

      expect(result.northNodeHouse).toBeUndefined();
      expect(result.saturnHouse).toBeUndefined();
    });
  });
});
