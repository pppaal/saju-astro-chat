// tests/lib/past-life/analyzer-validation.test.ts
// Validation and Data Quality Tests for Past Life Analyzer

import { describe, it, expect } from 'vitest';
import { analyzePastLife } from '@/lib/past-life/analyzer';

// ============================================================
// Constants
// ============================================================

const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;
const DAY_MASTER_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const SINSAL_TYPES = ['원진', '공망', '겁살'] as const;
const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const EXPECTED_TRAITS_COUNT = 5;
const EXPECTED_TALENTS_MIN = 3;
const MIN_TEXT_LENGTH = 2; // Some traits/talents are short (e.g., "리더십", "직관")
const MAX_TEXT_LENGTH = 2000; // Updated to accommodate expanded narrative text
const MIN_DESCRIPTION_LENGTH = 10;

// ============================================================
// Helper Functions
// ============================================================

type SajuData = {
  advancedAnalysis?: {
    geokguk?: { name?: string; type?: string };
    sinsal?: { unluckyList?: Array<{ name?: string; shinsal?: string } | string> };
  };
  dayMaster?: { name?: string; heavenlyStem?: string };
  pillars?: { day?: { heavenlyStem?: string } };
  fourPillars?: { day?: { heavenlyStem?: string } };
};

type AstroData = {
  planets?: Array<{ name?: string | null; house?: number }>;
};

const createSaju = (options: {
  geokguk?: string;
  dayMaster?: string;
  sinsal?: Array<{ name?: string }>;
}): SajuData => ({
  advancedAnalysis: {
    geokguk: options.geokguk ? { name: options.geokguk } : undefined,
    sinsal: options.sinsal ? { unluckyList: options.sinsal } : undefined,
  },
  dayMaster: options.dayMaster ? { name: options.dayMaster } : undefined,
});

const createAstro = (planets: Array<{ name: string; house: number }>): AstroData => ({
  planets,
});

const analyzeKorean = (saju?: SajuData | null, astro?: AstroData | null) =>
  analyzePastLife(saju || null, astro || null, true);

const analyzeEnglish = (saju?: SajuData | null, astro?: AstroData | null) =>
  analyzePastLife(saju || null, astro || null, false);

// ============================================================
// Validation Helpers
// ============================================================

const expectValidText = (text: string, minLength = MIN_TEXT_LENGTH) => {
  expect(text).toBeTruthy();
  expect(typeof text).toBe('string');
  expect(text.length).toBeGreaterThanOrEqual(minLength);
  expect(text.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  expect(text.trim()).toBe(text); // No leading/trailing whitespace
};

const expectValidDescription = (text: string) => {
  expectValidText(text, MIN_DESCRIPTION_LENGTH);
};

const expectKoreanText = (text: string) => {
  expect(text).toMatch(/[\uAC00-\uD7AF]/); // Contains Korean characters
  expect(text).not.toMatch(/^[A-Za-z\s]+$/); // Not pure English
};

const expectEnglishText = (text: string) => {
  expect(text).toMatch(/[A-Za-z]/); // Contains English characters
  expect(text).not.toMatch(/^[\uAC00-\uD7AF\s]+$/); // Not pure Korean
};

const expectValidEmoji = (emoji: string) => {
  expect(emoji).toBeTruthy();
  expect(typeof emoji).toBe('string');
  expect(emoji.length).toBeGreaterThan(0);
  expect(emoji.length).toBeLessThanOrEqual(4); // Most emojis are 1-2 chars
};

const expectValidScore = (score: number) => {
  expect(typeof score).toBe('number');
  expect(score).toBeGreaterThanOrEqual(50);
  expect(score).toBeLessThanOrEqual(100);
  expect(Number.isInteger(score)).toBe(true);
};

const expectValidHouse = (house: number | undefined) => {
  if (house !== undefined) {
    expect(house).toBeGreaterThanOrEqual(1);
    expect(house).toBeLessThanOrEqual(12);
    expect(Number.isInteger(house)).toBe(true);
  }
};

// ============================================================
// Tests
// ============================================================

describe('Past Life Analyzer - Validation Tests', () => {

  describe('Text Quality Validation', () => {
    it('should return valid text for all soul pattern fields in Korean', () => {
      const result = analyzeKorean(createSaju({ geokguk: '식신' }));

      expectValidText(result.soulPattern.type);
      expectValidEmoji(result.soulPattern.emoji);
      expectValidText(result.soulPattern.title);
      expectValidDescription(result.soulPattern.description);
      expectKoreanText(result.soulPattern.type);
      expectKoreanText(result.soulPattern.title);
      expectKoreanText(result.soulPattern.description);
    });

    it('should return valid text for all soul pattern fields in English', () => {
      const result = analyzeEnglish(createSaju({ geokguk: '식신' }));

      expectValidText(result.soulPattern.type);
      expectValidEmoji(result.soulPattern.emoji);
      expectValidText(result.soulPattern.title);
      expectValidDescription(result.soulPattern.description);
      expectEnglishText(result.soulPattern.type);
      expectEnglishText(result.soulPattern.title);
      expectEnglishText(result.soulPattern.description);
    });

    it('should return valid text for past life fields', () => {
      const result = analyzeKorean(createSaju({ geokguk: '정관' }));

      expectValidDescription(result.pastLife.likely);
      expectValidText(result.pastLife.talents);
      expectValidText(result.pastLife.lessons);
      expectValidText(result.pastLife.era || '');
      expectKoreanText(result.pastLife.likely);
    });

    it('should return valid text for soul journey fields', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'North Node', house: 5 }]));

      expectValidDescription(result.soulJourney.pastPattern);
      expectValidText(result.soulJourney.releasePattern);
      expectValidText(result.soulJourney.currentDirection);
      expectValidText(result.soulJourney.lessonToLearn);
    });

    it('should return valid text for Saturn lesson fields', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'Saturn', house: 7 }]));

      expectValidText(result.saturnLesson.lesson);
      expectValidDescription(result.saturnLesson.challenge);
      expectValidDescription(result.saturnLesson.mastery);
    });

    it('should return valid text for mission fields', () => {
      const result = analyzeKorean(createSaju({ dayMaster: '갑' }));

      expectValidText(result.thisLifeMission.core);
      expectValidDescription(result.thisLifeMission.expression);
      expectValidDescription(result.thisLifeMission.fulfillment);
    });

    it('should not have placeholder text like "TODO" or "undefined"', () => {
      const result = analyzeKorean(
        createSaju({ geokguk: '식신', dayMaster: '갑' }),
        createAstro([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ])
      );

      const allText = JSON.stringify(result).toLowerCase();
      expect(allText).not.toContain('todo');
      expect(allText).not.toContain('undefined');
      expect(allText).not.toContain('null');
      expect(allText).not.toContain('fixme');
      expect(allText).not.toContain('xxx');
    });
  });

  describe('Array Validation', () => {
    it('should return exactly 5 traits for each soul pattern', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSaju({ geokguk }));

        expect(result.soulPattern.traits).toBeInstanceOf(Array);
        expect(result.soulPattern.traits.length).toBe(EXPECTED_TRAITS_COUNT);

        result.soulPattern.traits.forEach((trait) => {
          expectValidText(trait);
        });
      });
    });

    it('should return at least 3 talents for geokguk-based patterns', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSaju({ geokguk }));

        expect(result.talentsCarried).toBeInstanceOf(Array);
        expect(result.talentsCarried.length).toBeGreaterThanOrEqual(EXPECTED_TALENTS_MIN);

        result.talentsCarried.forEach((talent) => {
          expectValidText(talent);
        });
      });
    });

    it('should return valid karmic debt array', () => {
      const result = analyzeKorean(
        createSaju({
          sinsal: [{ name: '원진' }, { name: '공망' }],
        })
      );

      expect(result.karmicDebts).toBeInstanceOf(Array);
      expect(result.karmicDebts.length).toBeGreaterThan(0);
      expect(result.karmicDebts.length).toBeLessThanOrEqual(4);

      result.karmicDebts.forEach((debt) => {
        expectValidText(debt.area);
        expectValidDescription(debt.description);
      });
    });

    it('should not have duplicate traits', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSaju({ geokguk }));
        const uniqueTraits = new Set(result.soulPattern.traits);
        expect(uniqueTraits.size).toBe(result.soulPattern.traits.length);
      });
    });

    it('should not have duplicate talents', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSaju({ geokguk }));
        const uniqueTalents = new Set(result.talentsCarried);
        expect(uniqueTalents.size).toBe(result.talentsCarried.length);
      });
    });
  });

  describe('Karma Score Validation', () => {
    it('should return valid karma score for all inputs', () => {
      const result = analyzeKorean();
      expectValidScore(result.karmaScore);
    });

    it('should increase score with more data', () => {
      const baseResult = analyzeKorean();
      const withGeokguk = analyzeKorean(createSaju({ geokguk: '식신' }));
      const withBoth = analyzeKorean(
        createSaju({ geokguk: '식신', dayMaster: '갑' })
      );

      expect(withGeokguk.karmaScore).toBeGreaterThan(baseResult.karmaScore);
      expect(withBoth.karmaScore).toBeGreaterThan(withGeokguk.karmaScore);
    });

    it('should have consistent score for same input', () => {
      const saju = createSaju({ geokguk: '정관', dayMaster: '을' });
      const astro = createAstro([{ name: 'Saturn', house: 5 }]);

      const result1 = analyzeKorean(saju, astro);
      const result2 = analyzeKorean(saju, astro);
      const result3 = analyzeKorean(saju, astro);

      expect(result1.karmaScore).toBe(result2.karmaScore);
      expect(result2.karmaScore).toBe(result3.karmaScore);
    });

    it('should respect minimum score boundary', () => {
      const result = analyzeKorean(null, null);
      expectValidScore(result.karmaScore);
      expect(result.karmaScore).toBeGreaterThanOrEqual(50);
    });

    it('should respect maximum score boundary', () => {
      const result = analyzeKorean(
        createSaju({
          geokguk: '식신',
          dayMaster: '갑',
          sinsal: [{ name: '원진' }, { name: '공망' }, { name: '겁살' }],
        }),
        createAstro([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ])
      );

      expectValidScore(result.karmaScore);
      expect(result.karmaScore).toBeLessThanOrEqual(100);
    });
  });

  describe('House Number Validation', () => {
    it('should return valid North Node house numbers', () => {
      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeKorean(null, createAstro([{ name: 'North Node', house }]));
        expectValidHouse(result.northNodeHouse);
        expect(result.northNodeHouse).toBe(house);
      });
    });

    it('should return valid Saturn house numbers', () => {
      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeKorean(null, createAstro([{ name: 'Saturn', house }]));
        expectValidHouse(result.saturnHouse);
        expect(result.saturnHouse).toBe(house);
      });
    });

    it('should return undefined for invalid house numbers', () => {
      const result = analyzeKorean(
        null,
        createAstro([
          { name: 'North Node', house: 0 },
          { name: 'Saturn', house: 13 },
        ])
      );

      expect(result.northNodeHouse).toBeUndefined();
      expect(result.saturnHouse).toBeUndefined();
    });

    it('should return undefined when planets not found', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'Sun', house: 1 }]));

      expect(result.northNodeHouse).toBeUndefined();
      expect(result.saturnHouse).toBeUndefined();
    });
  });

  describe('Language Consistency', () => {
    it('should have consistent language across all Korean fields', () => {
      const result = analyzeKorean(
        createSaju({ geokguk: '식신', dayMaster: '갑', sinsal: [{ name: '원진' }] }),
        createAstro([
          { name: 'North Node', house: 5 },
          { name: 'Saturn', house: 9 },
        ])
      );

      // All major text fields should contain Korean
      expectKoreanText(result.soulPattern.type);
      expectKoreanText(result.soulPattern.title);
      expectKoreanText(result.soulPattern.description);
      expectKoreanText(result.pastLife.likely);
      expectKoreanText(result.soulJourney.pastPattern);
      expectKoreanText(result.saturnLesson.lesson);
      expectKoreanText(result.thisLifeMission.core);

      result.soulPattern.traits.forEach((trait) => expectKoreanText(trait));
      result.talentsCarried.forEach((talent) => expectKoreanText(talent));
      result.karmicDebts.forEach((debt) => expectKoreanText(debt.area));
    });

    it('should have consistent language across all English fields', () => {
      const result = analyzeEnglish(
        createSaju({ geokguk: '식신', dayMaster: '갑', sinsal: [{ name: '원진' }] }),
        createAstro([
          { name: 'North Node', house: 5 },
          { name: 'Saturn', house: 9 },
        ])
      );

      // All major text fields should contain English
      expectEnglishText(result.soulPattern.type);
      expectEnglishText(result.soulPattern.title);
      expectEnglishText(result.soulPattern.description);
      expectEnglishText(result.pastLife.likely);
      expectEnglishText(result.soulJourney.pastPattern);
      expectEnglishText(result.saturnLesson.lesson);
      expectEnglishText(result.thisLifeMission.core);

      result.soulPattern.traits.forEach((trait) => expectEnglishText(trait));
      result.talentsCarried.forEach((talent) => expectEnglishText(talent));
      result.karmicDebts.forEach((debt) => expectEnglishText(debt.area));
    });

    it('should never mix Korean and English in same field', () => {
      const koResult = analyzeKorean(createSaju({ geokguk: '정관' }));
      const enResult = analyzeEnglish(createSaju({ geokguk: '정관' }));

      // Korean result should not have significant English content
      const koText = koResult.soulPattern.description;
      const koEnglishWords = koText.match(/\b[A-Za-z]{3,}\b/g) || [];
      expect(koEnglishWords.length).toBeLessThan(3); // Allow a few English words

      // English result should not have Korean content
      const enText = enResult.soulPattern.description;
      const enKoreanChars = enText.match(/[\uAC00-\uD7AF]/g) || [];
      expect(enKoreanChars.length).toBe(0); // No Korean characters
    });
  });

  describe('Emoji Validation', () => {
    it('should return valid emoji for all geokguk types', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSaju({ geokguk }));
        expectValidEmoji(result.soulPattern.emoji);
      });
    });

    it('should return unique emojis for different geokguk types', () => {
      const emojis = GEOKGUK_TYPES.map((geokguk) => {
        const result = analyzeKorean(createSaju({ geokguk }));
        return result.soulPattern.emoji;
      });

      const uniqueEmojis = new Set(emojis);
      expect(uniqueEmojis.size).toBe(GEOKGUK_TYPES.length);
    });

    it('should use consistent emoji across languages', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const koResult = analyzeKorean(createSaju({ geokguk }));
        const enResult = analyzeEnglish(createSaju({ geokguk }));

        expect(koResult.soulPattern.emoji).toBe(enResult.soulPattern.emoji);
      });
    });
  });

  describe('Data Completeness', () => {
    it('should always return complete soul pattern structure', () => {
      const result = analyzeKorean();

      expect(result.soulPattern).toBeDefined();
      expect(result.soulPattern.type).toBeTruthy();
      expect(result.soulPattern.emoji).toBeTruthy();
      expect(result.soulPattern.title).toBeTruthy();
      expect(result.soulPattern.description).toBeTruthy();
      expect(result.soulPattern.traits).toBeInstanceOf(Array);
      const traitsCount = result.soulPattern.traits.length;
      expect(traitsCount).toBeGreaterThanOrEqual(3);
      expect(traitsCount).toBeLessThanOrEqual(5);
    });

    it('should always return complete past life structure', () => {
      const result = analyzeKorean();

      expect(result.pastLife).toBeDefined();
      expect(result.pastLife.likely).toBeTruthy();
      expect(result.pastLife.talents).toBeTruthy();
      expect(result.pastLife.lessons).toBeTruthy();
      // era is optional
    });

    it('should always return complete soul journey structure', () => {
      const result = analyzeKorean();

      expect(result.soulJourney).toBeDefined();
      expect(result.soulJourney.pastPattern).toBeTruthy();
      expect(result.soulJourney.releasePattern).toBeTruthy();
      expect(result.soulJourney.currentDirection).toBeTruthy();
      expect(result.soulJourney.lessonToLearn).toBeTruthy();
    });

    it('should always return complete Saturn lesson structure', () => {
      const result = analyzeKorean();

      expect(result.saturnLesson).toBeDefined();
      expect(result.saturnLesson.lesson).toBeTruthy();
      expect(result.saturnLesson.challenge).toBeTruthy();
      expect(result.saturnLesson.mastery).toBeTruthy();
    });

    it('should always return complete mission structure', () => {
      const result = analyzeKorean();

      expect(result.thisLifeMission).toBeDefined();
      expect(result.thisLifeMission.core).toBeTruthy();
      expect(result.thisLifeMission.expression).toBeTruthy();
      expect(result.thisLifeMission.fulfillment).toBeTruthy();
    });

    it('should always return arrays even if empty', () => {
      const result = analyzeKorean();

      expect(result.karmicDebts).toBeInstanceOf(Array);
      expect(result.talentsCarried).toBeInstanceOf(Array);
    });
  });

  describe('Cross-Field Consistency', () => {
    it('should have matching geokguk in result and metadata', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzeKorean(createSaju({ geokguk }));
        expect(result.geokguk).toBe(geokguk);
      });
    });

    it('should have matching day master in result and metadata', () => {
      DAY_MASTER_STEMS.forEach((stem) => {
        const result = analyzeKorean(createSaju({ dayMaster: stem }));
        expect(result.dayMaster).toBe(stem);
      });
    });

    it('should have soul pattern type matching geokguk', () => {
      const mappings: Record<string, string> = {
        '식신': '창조자 영혼',
        '상관': '변혁가 영혼',
        '정관': '지도자 영혼',
        '편관': '전사 영혼',
        '정재': '보존자 영혼',
        '편재': '모험가 영혼',
        '정인': '현자 영혼',
        '편인': '신비가 영혼',
      };

      Object.entries(mappings).forEach(([geokguk, expectedType]) => {
        const result = analyzeKorean(createSaju({ geokguk }));
        expect(result.soulPattern.type).toBe(expectedType);
      });
    });

    it('should have karmic debts count matching sinsal input', () => {
      const sinsalList = [{ name: '원진' }, { name: '공망' }];
      const result = analyzeKorean(createSaju({ sinsal: sinsalList }));

      expect(result.karmicDebts.length).toBeGreaterThan(0);
      expect(result.karmicDebts.length).toBeLessThanOrEqual(4);
    });
  });

  describe('Whitespace and Formatting', () => {
    it('should not have leading or trailing whitespace', () => {
      const result = analyzeKorean(
        createSaju({ geokguk: '식신', dayMaster: '갑' }),
        createAstro([{ name: 'North Node', house: 5 }])
      );

      expect(result.soulPattern.type.trim()).toBe(result.soulPattern.type);
      expect(result.soulPattern.title.trim()).toBe(result.soulPattern.title);
      expect(result.soulPattern.description.trim()).toBe(result.soulPattern.description);
      expect(result.pastLife.likely.trim()).toBe(result.pastLife.likely);

      result.soulPattern.traits.forEach((trait) => {
        expect(trait.trim()).toBe(trait);
      });
    });

    it('should not have multiple consecutive spaces', () => {
      const result = analyzeKorean(createSaju({ geokguk: '정관' }));

      expect(result.soulPattern.description).not.toMatch(/\s{2,}/);
      expect(result.pastLife.likely).not.toMatch(/\s{2,}/);
      expect(result.soulJourney.pastPattern).not.toMatch(/\s{2,}/);
    });

    it('should not have newline characters in single-line fields', () => {
      const result = analyzeKorean(createSaju({ geokguk: '식신' }));

      expect(result.soulPattern.type).not.toMatch(/\n/);
      expect(result.soulPattern.title).not.toMatch(/\n/);
      expect(result.saturnLesson.lesson).not.toMatch(/\n/);
      expect(result.thisLifeMission.core).not.toMatch(/\n/);
    });
  });

  describe('Performance Validation', () => {
    it('should complete single analysis quickly', () => {
      const start = Date.now();
      analyzeKorean(
        createSaju({ geokguk: '식신', dayMaster: '갑' }),
        createAstro([{ name: 'North Node', house: 5 }])
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle 1000 analyses in reasonable time', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        analyzeKorean(
          createSaju({ geokguk: GEOKGUK_TYPES[i % 8] }),
          createAstro([{ name: 'Saturn', house: (i % 12) + 1 }])
        );
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });
  });

  describe('Null Safety', () => {
    it('should handle all null inputs gracefully', () => {
      expect(() => analyzeKorean(null, null)).not.toThrow();
      expect(() => analyzeKorean(undefined as any, undefined as any)).not.toThrow();
    });

    it('should handle nested null values', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: null as any, sinsal: null as any } },
        { planets: null as any }
      );

      expect(result).toBeDefined();
      expect(result.soulPattern.type).toBeTruthy();
    });

    it('should not throw on any reasonable input combination', () => {
      const sajuVariations = [
        null,
        {},
        { advancedAnalysis: {} },
        { advancedAnalysis: { geokguk: {} } },
        { advancedAnalysis: { geokguk: { name: '' } } },
      ];

      const astroVariations = [
        null,
        {},
        { planets: [] },
        { planets: [{}] },
        { planets: [{ name: '', house: 0 }] },
      ];

      sajuVariations.forEach((saju) => {
        astroVariations.forEach((astro) => {
          expect(() => analyzeKorean(saju as any, astro as any)).not.toThrow();
        });
      });
    });
  });
});
