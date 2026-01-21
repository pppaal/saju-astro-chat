/**
 * Tests specifically targeting uncovered lines in analyzer.ts
 * Lines 375, 380, 449, 502, 510
 */
import { describe, it, expect } from 'vitest';
import { analyzePastLife } from '@/lib/past-life/analyzer';

// Test Constants
const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const FULL_STEM_NAMES = ['갑목', '을목', '병화', '정화', '무토', '기토', '경금', '신금', '임수', '계수'] as const;
const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;

const SINSAL_TEST_CASES = [
  { name: '원진', area: 'Relationship Karma', healing: 'Try to forgive and understand' },
  { name: '원진살', area: 'Relationship Karma', healing: 'Try to forgive and understand' },
  {
    name: '공망',
    area: 'Emptiness Karma',
    healing: 'Practice spiritual cultivation to fill your inner self',
    description: 'Deep experience of loss from past lives remains. You may feel emptiness in certain areas.',
  },
  {
    name: '空亡',
    area: 'Emptiness Karma',
    healing: 'Practice spiritual cultivation to fill your inner self',
    description: 'Deep experience of loss from past lives remains. You may feel emptiness in certain areas.',
  },
  {
    name: '겁살',
    area: 'Challenge Karma',
    healing: 'Face and overcome your fears',
    description: 'Challenges not overcome in past lives return. Remember difficulties are growth opportunities.',
  },
  {
    name: '劫殺',
    area: 'Challenge Karma',
    healing: 'Face and overcome your fears',
    description: 'Challenges not overcome in past lives return. Remember difficulties are growth opportunities.',
  },
] as const;

// Type definitions
type SajuData = Record<string, unknown>;

interface KarmicDebt {
  area: string;
  description: string;
  healing: string;
}

// Helper Functions
function createSajuWithPillarsHeavenlyStem(stemName: string | null): SajuData {
  return {
    dayMaster: {},
    pillars: { day: { heavenlyStem: { name: stemName } } },
  };
}

function createSajuWithFourPillarsHeavenlyStem(stem: string): SajuData {
  return {
    dayMaster: {},
    pillars: {},
    fourPillars: { day: { heavenlyStem: stem } },
  };
}

function createSajuWithGeokguk(geokgukName: string): SajuData {
  return {
    advancedAnalysis: { geokguk: { name: geokgukName } },
  };
}

function createSajuWithSinsal(sinsalName: string): SajuData {
  return {
    advancedAnalysis: { sinsal: { unluckyList: [{ name: sinsalName }] } },
  };
}

// Validation helpers
function expectDayMaster(result: ReturnType<typeof analyzePastLife>, expectedStem: string) {
  expect(result.dayMaster).toBe(expectedStem);
}

function expectEraDefined(result: ReturnType<typeof analyzePastLife>) {
  expect(result.pastLife.era).toBeDefined();
}

function expectEraUndefined(result: ReturnType<typeof analyzePastLife>) {
  expect(result.pastLife.era).toBeUndefined();
}

function expectKarmicDebt(debt: KarmicDebt, area: string, description: string, healing: string) {
  expect(debt.area).toBe(area);
  expect(debt.description).toBe(description);
  expect(debt.healing).toBe(healing);
}

describe('Past Life Analyzer - Uncovered Lines Coverage', () => {
  describe('Line 375 - pillars.day.heavenlyStem as object with name property', () => {
    it('should extract day master from pillars.day.heavenlyStem.name', () => {
      const result = analyzePastLife(createSajuWithPillarsHeavenlyStem('무'), null, true);
      expectDayMaster(result, '무');
      expect(result.thisLifeMission.core).toContain('든든한 터전');
    });

    it('should handle all 10 stems', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
        expectDayMaster(result, stem);
      });
    });

    it('should handle all full stem names', () => {
      FULL_STEM_NAMES.forEach((fullName, index) => {
        const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullName), null, true);
        expectDayMaster(result, HEAVENLY_STEMS[index]);
      });
    });

    it('should handle all stems in English mode', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, false);
        expectDayMaster(result, stem);
      });
    });

    it('should handle all full stem names in English mode', () => {
      FULL_STEM_NAMES.forEach((fullName, index) => {
        const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullName), null, false);
        expectDayMaster(result, HEAVENLY_STEMS[index]);
      });
    });

    it('should handle invalid or empty values', () => {
      const invalidValues = ['', null, 'xyz'];
      invalidValues.forEach((value) => {
        const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(value), null, true);
        expect(result.dayMaster).toBeUndefined();
      });
    });
  });

  describe('Line 380 - fourPillars.day.heavenlyStem coverage', () => {
    it('should extract from fourPillars as last fallback', () => {
      const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem('병'), null, true);
      expectDayMaster(result, '병');
    });

    it('should handle all 10 stems', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
        expectDayMaster(result, stem);
      });
    });

    it('should handle all full stem names', () => {
      FULL_STEM_NAMES.forEach((fullName, index) => {
        const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullName), null, true);
        expectDayMaster(result, HEAVENLY_STEMS[index]);
      });
    });

    it('should handle all stems in English mode', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, false);
        expectDayMaster(result, stem);
      });
    });

    it('should handle all full stem names in English mode', () => {
      FULL_STEM_NAMES.forEach((fullName, index) => {
        const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullName), null, false);
        expectDayMaster(result, HEAVENLY_STEMS[index]);
      });
    });

    it('should handle empty fourPillars.day.heavenlyStem', () => {
      const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(''), null, true);
      expect(result.dayMaster).toBeUndefined();
    });
  });

  describe('Line 449 - era undefined case coverage', () => {
    it('should return undefined era when no geokguk', () => {
      const koreanResult = analyzePastLife({}, null, true);
      expectEraUndefined(koreanResult);

      const englishResult = analyzePastLife({}, null, false);
      expectEraUndefined(englishResult);
    });

    it('should return defined era for all geokguk types in Korean', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
        expectEraDefined(result);
        expect(result.pastLife.era).toMatch(/[\uAC00-\uD7AF]/);
      });
    });

    it('should return defined era for all geokguk types in English', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);
        expectEraDefined(result);
        expect(result.pastLife.era).toMatch(/[A-Za-z]/);
      });
    });
  });

  describe('Lines 502 & 510 - English sinsal karmic debt descriptions', () => {
    it('should return exact English description for 공망 (Line 502)', () => {
      const result = analyzePastLife(createSajuWithSinsal('공망'), null, false);
      expectKarmicDebt(
        result.karmicDebts[0],
        'Emptiness Karma',
        'Deep experience of loss from past lives remains. You may feel emptiness in certain areas.',
        'Practice spiritual cultivation to fill your inner self'
      );
    });

    it('should return exact English description for 空亡 (Line 502)', () => {
      const result = analyzePastLife(createSajuWithSinsal('空亡'), null, false);
      expectKarmicDebt(
        result.karmicDebts[0],
        'Emptiness Karma',
        'Deep experience of loss from past lives remains. You may feel emptiness in certain areas.',
        'Practice spiritual cultivation to fill your inner self'
      );
    });

    it('should return exact English description for 겁살 (Line 510)', () => {
      const result = analyzePastLife(createSajuWithSinsal('겁살'), null, false);
      expectKarmicDebt(
        result.karmicDebts[0],
        'Challenge Karma',
        'Challenges not overcome in past lives return. Remember difficulties are growth opportunities.',
        'Face and overcome your fears'
      );
    });

    it('should return exact English description for 劫殺 (Line 510)', () => {
      const result = analyzePastLife(createSajuWithSinsal('劫殺'), null, false);
      expectKarmicDebt(
        result.karmicDebts[0],
        'Challenge Karma',
        'Challenges not overcome in past lives return. Remember difficulties are growth opportunities.',
        'Face and overcome your fears'
      );
    });

    it('should test all sinsal types', () => {
      SINSAL_TEST_CASES.forEach((testCase) => {
        const result = analyzePastLife(createSajuWithSinsal(testCase.name), null, false);
        expect(result.karmicDebts[0].area).toBe(testCase.area);
        expect(result.karmicDebts[0].healing).toBe(testCase.healing);

        if ('description' in testCase && testCase.description) {
          expect(result.karmicDebts[0].description).toBe(testCase.description);
        }
      });
    });
  });

  describe('Combined coverage tests', () => {
    it('should verify all critical lines together', () => {
      expectDayMaster(analyzePastLife(createSajuWithPillarsHeavenlyStem('신'), null, false), '신');
      expectDayMaster(analyzePastLife(createSajuWithFourPillarsHeavenlyStem('임'), null, true), '임');
      expectEraUndefined(analyzePastLife({}, null, true));
      expectEraDefined(analyzePastLife(createSajuWithGeokguk('식신'), null, true));

      const gongmang = analyzePastLife(createSajuWithSinsal('공망'), null, false);
      expect(gongmang.karmicDebts[0].description).toContain('Deep experience of loss');

      const geomsal = analyzePastLife(createSajuWithSinsal('겁살'), null, false);
      expect(geomsal.karmicDebts[0].description).toContain('Challenges not overcome');
    });

    it('should test fallback priority chain for day master extraction', () => {
      const priority1Result = analyzePastLife(
        {
          dayMaster: { name: '갑', heavenlyStem: '을' },
          pillars: { day: { heavenlyStem: { name: '병' } } },
          fourPillars: { day: { heavenlyStem: '정' } },
        },
        null,
        true
      );
      expect(priority1Result.dayMaster).toBe('갑');

      const priority2Result = analyzePastLife(
        {
          dayMaster: { name: '', heavenlyStem: '을' },
          pillars: { day: { heavenlyStem: { name: '병' } } },
          fourPillars: { day: { heavenlyStem: '정' } },
        },
        null,
        true
      );
      expect(priority2Result.dayMaster).toBe('을');

      const priority3Result = analyzePastLife(
        {
          dayMaster: {},
          pillars: { day: { heavenlyStem: '병' } },
          fourPillars: { day: { heavenlyStem: '정' } },
        },
        null,
        true
      );
      expect(priority3Result.dayMaster).toBe('병');

      const priority4Result = analyzePastLife(
        {
          dayMaster: {},
          pillars: { day: { heavenlyStem: { name: '무' } } },
          fourPillars: { day: { heavenlyStem: '정' } },
        },
        null,
        true
      );
      expect(priority4Result.dayMaster).toBe('무');

      const priority5Result = analyzePastLife(
        {
          dayMaster: {},
          pillars: {},
          fourPillars: { day: { heavenlyStem: '정' } },
        },
        null,
        true
      );
      expect(priority5Result.dayMaster).toBe('정');
    });
  });

  describe('Stress testing', () => {
    it('should handle 100 iterations across all critical lines', () => {
      for (let i = 0; i < 100; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];

        if (i % 4 === 0) {
          expectDayMaster(analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true), stem);
        } else if (i % 4 === 1) {
          expectDayMaster(analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true), stem);
        } else if (i % 4 === 2) {
          i % 8 < 4
            ? expectEraDefined(analyzePastLife(createSajuWithGeokguk(geokguk), null, true))
            : expectEraUndefined(analyzePastLife({}, null, true));
        } else {
          const sinsal = i % 8 < 4 ? '공망' : '겁살';
          const result = analyzePastLife(createSajuWithSinsal(sinsal), null, false);
          expect(result.karmicDebts.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle 200 iterations of all critical lines', () => {
      for (let i = 0; i < 200; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];

        if (i % 5 === 0) {
          const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          expect(result.dayMaster).toBe(stem);
        } else if (i % 5 === 1) {
          const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
          expect(result.dayMaster).toBe(stem);
        } else if (i % 5 === 2) {
          const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          expect(result.pastLife.era).toBeDefined();
        } else if (i % 5 === 3) {
          const result = analyzePastLife(createSajuWithSinsal('공망'), null, false);
          expect(result.karmicDebts[0].description).toContain('Deep experience of loss');
        } else {
          const result = analyzePastLife(createSajuWithSinsal('겁살'), null, false);
          expect(result.karmicDebts[0].description).toContain('Challenges not overcome');
        }
      }
    });

    it('should handle 300 iterations alternating between line 375 and 380', () => {
      for (let i = 0; i < 300; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        if (i % 2 === 0) {
          const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          expect(result.dayMaster).toBe(stem);
        } else {
          const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
          expect(result.dayMaster).toBe(stem);
        }
      }
    });

    it('should handle 400 iterations for era field', () => {
      for (let i = 0; i < 400; i++) {
        if (i % 3 === 0) {
          const geokguk = GEOKGUK_TYPES[i % 8];
          const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          expect(result.pastLife.era).toBeDefined();
          expect(result.pastLife.era).toMatch(/[\uAC00-\uD7AF]/);
        } else if (i % 3 === 1) {
          const geokguk = GEOKGUK_TYPES[i % 8];
          const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);
          expect(result.pastLife.era).toBeDefined();
          expect(result.pastLife.era).toMatch(/[A-Za-z]/);
        } else {
          const result = analyzePastLife({}, null, i % 2 === 0);
          expect(result.pastLife.era).toBeUndefined();
        }
      }
    });

    it('should handle 500 combined iterations', () => {
      for (let i = 0; i < 500; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const fullStem = FULL_STEM_NAMES[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];
        const sinsal = i % 2 === 0 ? '공망' : '겁살';

        if (i % 6 === 0) {
          const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          expect(result.dayMaster).toBe(stem);
        } else if (i % 6 === 1) {
          const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullStem), null, true);
          expect(result.dayMaster).toBe(stem);
        } else if (i % 6 === 2) {
          const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
          expect(result.dayMaster).toBe(stem);
        } else if (i % 6 === 3) {
          const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullStem), null, true);
          expect(result.dayMaster).toBe(stem);
        } else if (i % 6 === 4) {
          if (i % 12 < 6) {
            const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
            expect(result.pastLife.era).toBeDefined();
          } else {
            const result = analyzePastLife({}, null, true);
            expect(result.pastLife.era).toBeUndefined();
          }
        } else {
          const result = analyzePastLife(createSajuWithSinsal(sinsal), null, false);
          if (sinsal === '공망') {
            expect(result.karmicDebts[0].description).toContain('Deep experience of loss');
          } else {
            expect(result.karmicDebts[0].description).toContain('Challenges not overcome');
          }
        }
      }
    });

    it('should handle 1000 iterations with alternating patterns', () => {
      let successCount = 0;

      for (let i = 0; i < 1000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];

        if (i % 2 === 0) {
          const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          if (result.dayMaster === stem) successCount++;
        } else {
          const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
          if (result.dayMaster === stem) successCount++;
        }
      }

      expect(successCount).toBe(1000);
    });

    it('should handle 2000 iterations of mixed scenarios', () => {
      const counts = { line375: 0, line380: 0, line449: 0, line502: 0, line510: 0 };

      for (let i = 0; i < 2000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];

        if (i % 7 === 0) {
          const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          if (result.dayMaster === stem) counts.line375++;
        } else if (i % 7 === 1) {
          const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, false);
          if (result.dayMaster === stem) counts.line380++;
        } else if (i % 7 === 2) {
          const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          if (result.pastLife.era) counts.line449++;
        } else if (i % 7 === 3) {
          const result = analyzePastLife({}, null, false);
          if (!result.pastLife.era) counts.line449++;
        } else if (i % 7 === 4) {
          const result = analyzePastLife(createSajuWithSinsal('공망'), null, false);
          if (result.karmicDebts[0].description.includes('Deep experience')) counts.line502++;
        } else if (i % 7 === 5) {
          const result = analyzePastLife(createSajuWithSinsal('겁살'), null, false);
          if (result.karmicDebts[0].description.includes('Challenges not')) counts.line510++;
        } else {
          const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(FULL_STEM_NAMES[i % 10]), null, true);
          if (result.dayMaster === stem) counts.line375++;
        }
      }

      expect(counts.line375).toBeGreaterThan(0);
      expect(counts.line380).toBeGreaterThan(0);
      expect(counts.line449).toBeGreaterThan(0);
      expect(counts.line502).toBeGreaterThan(0);
      expect(counts.line510).toBeGreaterThan(0);
    });

    it('should handle 3000 iterations with detailed tracking', () => {
      const results = { success: 0, total: 3000 };

      for (let i = 0; i < results.total; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];
        const sinsal = i % 2 === 0 ? '공망' : '겁살';

        if (i % 8 === 0) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          if (r.dayMaster === stem) results.success++;
        } else if (i % 8 === 1) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, false);
          if (r.dayMaster === stem) results.success++;
        } else if (i % 8 === 2) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          if (r.pastLife.era) results.success++;
        } else if (i % 8 === 3) {
          const r = analyzePastLife(createSajuWithSinsal(sinsal), null, false);
          if (r.karmicDebts.length > 0) results.success++;
        } else if (i % 8 === 4) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(FULL_STEM_NAMES[i % 10]), null, true);
          if (r.dayMaster) results.success++;
        } else if (i % 8 === 5) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(FULL_STEM_NAMES[i % 10]), null, false);
          if (r.dayMaster) results.success++;
        } else if (i % 8 === 6) {
          const r = analyzePastLife({}, null, true);
          if (r.pastLife.era === undefined) results.success++;
        } else {
          const r = analyzePastLife(
            {
              pillars: { day: { heavenlyStem: { name: stem } } },
              advancedAnalysis: {
                geokguk: { name: geokguk },
                sinsal: { unluckyList: [{ name: sinsal }] },
              },
            },
            null,
            false
          );
          if (r.dayMaster && r.pastLife.era && r.karmicDebts.length > 0) results.success++;
        }
      }

      expect(results.success).toBe(results.total);
    });

    it('should handle 4000 iterations with performance consistency', () => {
      let totalSuccess = 0;

      for (let i = 0; i < 4000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const path = i % 2 === 0 ? 'pillars' : 'fourPillars';

        const saju =
          path === 'pillars'
            ? createSajuWithPillarsHeavenlyStem(stem)
            : createSajuWithFourPillarsHeavenlyStem(stem);

        const result = analyzePastLife(saju, null, i % 3 === 0);

        if (result.dayMaster === stem) {
          totalSuccess++;
        }
      }

      expect(totalSuccess).toBe(4000);
    });

    it('should handle 5000 iterations with comprehensive validation', () => {
      const stats = {
        line375: 0,
        line380: 0,
        line449Defined: 0,
        line449Undefined: 0,
        line502: 0,
        line510: 0,
      };

      for (let i = 0; i < 5000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const fullStem = FULL_STEM_NAMES[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];

        if (i % 10 === 0) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          if (r.dayMaster === stem) stats.line375++;
        } else if (i % 10 === 1) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullStem), null, false);
          if (r.dayMaster === stem) stats.line375++;
        } else if (i % 10 === 2) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
          if (r.dayMaster === stem) stats.line380++;
        } else if (i % 10 === 3) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullStem), null, false);
          if (r.dayMaster === stem) stats.line380++;
        } else if (i % 10 === 4) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          if (r.pastLife.era) stats.line449Defined++;
        } else if (i % 10 === 5) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);
          if (r.pastLife.era) stats.line449Defined++;
        } else if (i % 10 === 6) {
          const r = analyzePastLife({}, null, i % 2 === 0);
          if (!r.pastLife.era) stats.line449Undefined++;
        } else if (i % 10 === 7) {
          const r = analyzePastLife(createSajuWithSinsal('공망'), null, false);
          if (r.karmicDebts[0].description.includes('Deep experience')) stats.line502++;
        } else if (i % 10 === 8) {
          const r = analyzePastLife(createSajuWithSinsal('겁살'), null, false);
          if (r.karmicDebts[0].description.includes('Challenges not')) stats.line510++;
        } else {
          const r = analyzePastLife(createSajuWithSinsal('空亡'), null, false);
          if (r.karmicDebts[0].description.includes('Deep experience')) stats.line502++;
        }
      }

      expect(stats.line375).toBeGreaterThan(900);
      expect(stats.line380).toBeGreaterThan(900);
      expect(stats.line449Defined).toBeGreaterThan(900);
      expect(stats.line449Undefined).toBeGreaterThan(450);
      expect(stats.line502).toBeGreaterThan(900);
      expect(stats.line510).toBeGreaterThan(450);
    });
  });

  describe('Integration scenarios', () => {
    it('should test combinations of stems with geokguk and sinsal', () => {
      const sampleStems = [HEAVENLY_STEMS[0], HEAVENLY_STEMS[4], HEAVENLY_STEMS[9]];
      const sampleGeokguk = [GEOKGUK_TYPES[0], GEOKGUK_TYPES[3]];

      sampleStems.forEach((stem) => {
        sampleGeokguk.forEach((geokguk) => {
          const combo1 = analyzePastLife(
            {
              pillars: { day: { heavenlyStem: { name: stem } } },
              advancedAnalysis: {
                geokguk: { name: geokguk },
                sinsal: { unluckyList: [{ name: '공망' }] },
              },
            },
            null,
            false
          );
          expectDayMaster(combo1, stem);
          expectEraDefined(combo1);
          expect(combo1.karmicDebts[0].description).toContain('Deep experience of loss');
        });
      });
    });

    it('should test all lines together with every stem and geokguk combination', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          const combo1 = analyzePastLife(
            {
              pillars: { day: { heavenlyStem: { name: stem } } },
              advancedAnalysis: {
                geokguk: { name: geokguk },
                sinsal: { unluckyList: [{ name: '공망' }] },
              },
            },
            null,
            false
          );
          expect(combo1.dayMaster).toBe(stem);
          expect(combo1.pastLife.era).toBeDefined();
          expect(combo1.karmicDebts[0].description).toContain('Deep experience of loss');

          const combo2 = analyzePastLife(
            {
              fourPillars: { day: { heavenlyStem: stem } },
              advancedAnalysis: {
                geokguk: { name: geokguk },
                sinsal: { unluckyList: [{ name: '겁살' }] },
              },
            },
            null,
            false
          );
          expect(combo2.dayMaster).toBe(stem);
          expect(combo2.pastLife.era).toBeDefined();
          expect(combo2.karmicDebts[0].description).toContain('Challenges not overcome');
        });
      });
    });

    it('should test with mixed sinsal types and all stems', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        const result = analyzePastLife(
          {
            pillars: { day: { heavenlyStem: { name: stem } } },
            advancedAnalysis: {
              sinsal: {
                unluckyList: [{ name: '공망' }, { name: '겁살' }, { name: '원진' }],
              },
            },
          },
          null,
          false
        );

        expect(result.dayMaster).toBe(stem);
        expect(result.karmicDebts.length).toBeLessThanOrEqual(3);

        const hasGongmang = result.karmicDebts.some((d: KarmicDebt) => d.description.includes('Deep experience of loss'));
        const hasGeomsal = result.karmicDebts.some((d: KarmicDebt) => d.description.includes('Challenges not overcome'));

        expect(hasGongmang || hasGeomsal).toBe(true);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed data structures', () => {
      const malformedLine375 = [
        { dayMaster: {}, pillars: { day: { heavenlyStem: {} } } },
        { dayMaster: {}, pillars: { day: { heavenlyStem: { name: undefined } } } },
        { dayMaster: {}, pillars: { day: { heavenlyStem: { name: '' } } } },
        { dayMaster: {}, pillars: { day: { heavenlyStem: { name: null } } } },
      ];

      const malformedLine380 = [
        { fourPillars: { day: {} } },
        { fourPillars: { day: { heavenlyStem: undefined } } },
        { fourPillars: { day: { heavenlyStem: null } } },
        { fourPillars: { day: { heavenlyStem: '' } } },
      ];

      const malformedLine449 = [
        {},
        { advancedAnalysis: {} },
        { advancedAnalysis: { geokguk: {} } },
        { advancedAnalysis: { geokguk: { name: '' } } },
        { advancedAnalysis: { geokguk: { name: null } } },
      ];

      [...malformedLine375, ...malformedLine380].forEach((saju) => {
        expect(analyzePastLife(saju, null, true).dayMaster).toBeUndefined();
      });

      malformedLine449.forEach((saju) => {
        expectEraUndefined(analyzePastLife(saju, null, true));
      });
    });

    it('should handle multiple sinsal in unluckyList', () => {
      const result = analyzePastLife(
        {
          advancedAnalysis: {
            sinsal: {
              unluckyList: [{ name: '공망' }, { name: '겁살' }, { name: '원진' }, { name: '空亡' }],
            },
          },
        },
        null,
        false
      );

      expect(result.karmicDebts.length).toBeLessThanOrEqual(3);
      result.karmicDebts.forEach((debt: KarmicDebt) => {
        expect(debt.description).toMatch(/[A-Za-z]/);
      });
    });

    it('should handle empty objects and arrays', () => {
      const emptyStructures = [
        {},
        { dayMaster: {} },
        { pillars: {} },
        { fourPillars: {} },
        { advancedAnalysis: {} },
        { advancedAnalysis: { sinsal: {} } },
        { advancedAnalysis: { sinsal: { unluckyList: [] } } },
      ];

      emptyStructures.forEach((saju) => {
        const result = analyzePastLife(saju, null, true);
        expect(result).toBeDefined();
        expect(result.dayMaster).toBeUndefined();
      });
    });
  });

  describe('Field validation', () => {
    it('should validate all result fields for line 375 extractions', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);

        expect(result.dayMaster).toBe(stem);
        expect(result.soulPattern).toBeDefined();
        expect(result.pastLife).toBeDefined();
        expect(result.soulJourney).toBeDefined();
        expect(result.karmicDebts).toBeDefined();
        expect(result.saturnLesson).toBeDefined();
        expect(result.talentsCarried).toBeDefined();
        expect(result.thisLifeMission).toBeDefined();
        expect(typeof result.karmaScore).toBe('number');
      });
    });

    it('should validate all result fields for line 380 extractions', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, false);

        expect(result.dayMaster).toBe(stem);
        expect(result.soulPattern).toBeDefined();
        expect(result.pastLife).toBeDefined();
        expect(result.soulJourney).toBeDefined();
        expect(result.karmicDebts).toBeDefined();
        expect(result.saturnLesson).toBeDefined();
        expect(result.talentsCarried).toBeDefined();
        expect(result.thisLifeMission).toBeDefined();
        expect(typeof result.karmaScore).toBe('number');
      });
    });

    it('should validate all karmic debt fields for lines 502 and 510', () => {
      const sinsals = ['공망', '空亡', '겁살', '劫殺'];

      sinsals.forEach((sinsal) => {
        const result = analyzePastLife(createSajuWithSinsal(sinsal), null, false);

        expect(result.karmicDebts.length).toBeGreaterThan(0);
        result.karmicDebts.forEach((debt: KarmicDebt) => {
          expect(debt.area).toBeTruthy();
          expect(typeof debt.area).toBe('string');
          expect(debt.description).toBeTruthy();
          expect(typeof debt.description).toBe('string');
          expect(debt.healing).toBeTruthy();
          expect(typeof debt.healing).toBe('string');
        });
      });
    });
  });

  describe('Final exhaustive verification', () => {
    it('should verify every uncovered line with maximum variations', () => {
      const verification = {
        line375: { tested: 0, passed: 0 },
        line380: { tested: 0, passed: 0 },
        line449: { tested: 0, passed: 0 },
        line502: { tested: 0, passed: 0 },
        line510: { tested: 0, passed: 0 },
      };

      HEAVENLY_STEMS.forEach((stem, idx) => {
        [true, false].forEach((isKo) => {
          [stem, FULL_STEM_NAMES[idx]].forEach((variant) => {
            verification.line375.tested++;
            const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(variant), null, isKo);
            if (result.dayMaster === stem) verification.line375.passed++;
          });
        });
      });

      HEAVENLY_STEMS.forEach((stem, idx) => {
        [true, false].forEach((isKo) => {
          [stem, FULL_STEM_NAMES[idx]].forEach((variant) => {
            verification.line380.tested++;
            const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(variant), null, isKo);
            if (result.dayMaster === stem) verification.line380.passed++;
          });
        });
      });

      GEOKGUK_TYPES.forEach((geokguk) => {
        [true, false].forEach((isKo) => {
          verification.line449.tested++;
          const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, isKo);
          if (result.pastLife.era) verification.line449.passed++;
        });
      });

      [true, false].forEach((isKo) => {
        verification.line449.tested++;
        const result = analyzePastLife({}, null, isKo);
        if (!result.pastLife.era) verification.line449.passed++;
      });

      ['공망', '空亡'].forEach((sinsal) => {
        verification.line502.tested++;
        const result = analyzePastLife(createSajuWithSinsal(sinsal), null, false);
        if (result.karmicDebts[0].description.includes('Deep experience of loss')) {
          verification.line502.passed++;
        }
      });

      ['겁살', '劫殺'].forEach((sinsal) => {
        verification.line510.tested++;
        const result = analyzePastLife(createSajuWithSinsal(sinsal), null, false);
        if (result.karmicDebts[0].description.includes('Challenges not overcome')) {
          verification.line510.passed++;
        }
      });

      expect(verification.line375.passed).toBe(verification.line375.tested);
      expect(verification.line380.passed).toBe(verification.line380.tested);
      expect(verification.line449.passed).toBe(verification.line449.tested);
      expect(verification.line502.passed).toBe(verification.line502.tested);
      expect(verification.line510.passed).toBe(verification.line510.tested);

      expect(verification.line375.tested).toBe(40);
      expect(verification.line380.tested).toBe(40);
      expect(verification.line449.tested).toBe(18);
      expect(verification.line502.tested).toBe(2);
      expect(verification.line510.tested).toBe(2);
    });

    it('should perform complete integration test with all lines', () => {
      let integrationTests = 0;

      HEAVENLY_STEMS.forEach((stem) => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          ['공망', '겁살'].forEach((sinsal) => {
            [true, false].forEach((isKo) => {
              integrationTests++;

              const result = analyzePastLife(
                {
                  pillars: { day: { heavenlyStem: { name: stem } } },
                  advancedAnalysis: {
                    geokguk: { name: geokguk },
                    sinsal: { unluckyList: [{ name: sinsal }] },
                  },
                },
                null,
                isKo
              );

              expect(result.dayMaster).toBe(stem);
              expect(result.pastLife.era).toBeDefined();
              expect(result.karmicDebts.length).toBeGreaterThan(0);
            });
          });
        });
      });

      expect(integrationTests).toBe(320);
    });
  });

  describe('Additional high-volume testing', () => {
    it('should handle 6000 iterations with varied patterns', () => {
      for (let i = 0; i < 6000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];

        if (i % 11 === 0) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          expect(r.dayMaster).toBe(stem);
        } else if (i % 11 === 1) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, false);
          expect(r.dayMaster).toBe(stem);
        } else if (i % 11 === 2) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          expect(r.pastLife.era).toBeDefined();
        } else if (i % 11 === 3) {
          const r = analyzePastLife({}, null, false);
          expect(r.pastLife.era).toBeUndefined();
        } else if (i % 11 === 4) {
          const r = analyzePastLife(createSajuWithSinsal('공망'), null, false);
          expect(r.karmicDebts[0].area).toBe('Emptiness Karma');
        } else if (i % 11 === 5) {
          const r = analyzePastLife(createSajuWithSinsal('겁살'), null, false);
          expect(r.karmicDebts[0].area).toBe('Challenge Karma');
        } else if (i % 11 === 6) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(FULL_STEM_NAMES[i % 10]), null, true);
          expect(r.dayMaster).toBe(stem);
        } else if (i % 11 === 7) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(FULL_STEM_NAMES[i % 10]), null, false);
          expect(r.dayMaster).toBe(stem);
        } else if (i % 11 === 8) {
          const r = analyzePastLife(createSajuWithSinsal('空亡'), null, false);
          expect(r.karmicDebts[0].description).toContain('Deep experience');
        } else if (i % 11 === 9) {
          const r = analyzePastLife(createSajuWithSinsal('劫殺'), null, false);
          expect(r.karmicDebts[0].description).toContain('Challenges not');
        } else {
          const r = analyzePastLife(
            {
              pillars: { day: { heavenlyStem: { name: stem } } },
              advancedAnalysis: { geokguk: { name: geokguk } },
            },
            null,
            i % 2 === 0
          );
          expect(r.dayMaster).toBe(stem);
          expect(r.pastLife.era).toBeDefined();
        }
      }
    });

    it('should handle 7000 iterations with rotation', () => {
      let success = 0;

      for (let i = 0; i < 7000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];

        if (i % 3 === 0) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, i % 5 === 0);
          if (r.dayMaster === stem) success++;
        } else if (i % 3 === 1) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, i % 7 === 0);
          if (r.dayMaster === stem) success++;
        } else {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(FULL_STEM_NAMES[i % 10]), null, true);
          if (r.dayMaster) success++;
        }
      }

      expect(success).toBe(7000);
    });

    it('should handle 8000 iterations with combined scenarios', () => {
      for (let i = 0; i < 8000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const fullStem = FULL_STEM_NAMES[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];
        const sinsal = i % 4 === 0 ? '공망' : i % 4 === 1 ? '겁살' : i % 4 === 2 ? '空亡' : '劫殺';

        if (i % 13 === 0) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          expect(r.dayMaster).toBe(stem);
        } else if (i % 13 === 1) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullStem), null, false);
          expect(r.dayMaster).toBe(stem);
        } else if (i % 13 === 2) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
          expect(r.dayMaster).toBe(stem);
        } else if (i % 13 === 3) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullStem), null, false);
          expect(r.dayMaster).toBe(stem);
        } else if (i % 13 === 4) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          expect(r.pastLife.era).toBeDefined();
        } else if (i % 13 === 5) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);
          expect(r.pastLife.era).toBeDefined();
        } else if (i % 13 === 6) {
          const r = analyzePastLife({}, null, i % 2 === 0);
          expect(r.pastLife.era).toBeUndefined();
        } else if (i % 13 === 7) {
          const r = analyzePastLife(createSajuWithSinsal(sinsal), null, false);
          expect(r.karmicDebts.length).toBeGreaterThan(0);
        } else {
          const r = analyzePastLife(
            {
              pillars: { day: { heavenlyStem: { name: stem } } },
              advancedAnalysis: {
                geokguk: { name: geokguk },
                sinsal: { unluckyList: [{ name: sinsal }] },
              },
            },
            null,
            i % 3 === 0
          );
          expect(r.dayMaster).toBe(stem);
          expect(r.pastLife.era).toBeDefined();
          expect(r.karmicDebts.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle 9000 iterations with all variations', () => {
      const stats = {
        line375: 0,
        line380: 0,
        line449: 0,
        line502: 0,
        line510: 0,
      };

      for (let i = 0; i < 9000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const fullStem = FULL_STEM_NAMES[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];

        if (i % 15 === 0) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          if (r.dayMaster === stem) stats.line375++;
        } else if (i % 15 === 1) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullStem), null, true);
          if (r.dayMaster === stem) stats.line375++;
        } else if (i % 15 === 2) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, false);
          if (r.dayMaster === stem) stats.line375++;
        } else if (i % 15 === 3) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullStem), null, false);
          if (r.dayMaster === stem) stats.line375++;
        } else if (i % 15 === 4) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
          if (r.dayMaster === stem) stats.line380++;
        } else if (i % 15 === 5) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullStem), null, true);
          if (r.dayMaster === stem) stats.line380++;
        } else if (i % 15 === 6) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, false);
          if (r.dayMaster === stem) stats.line380++;
        } else if (i % 15 === 7) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullStem), null, false);
          if (r.dayMaster === stem) stats.line380++;
        } else if (i % 15 === 8) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          if (r.pastLife.era) stats.line449++;
        } else if (i % 15 === 9) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);
          if (r.pastLife.era) stats.line449++;
        } else if (i % 15 === 10) {
          const r = analyzePastLife({}, null, i % 2 === 0);
          if (!r.pastLife.era) stats.line449++;
        } else if (i % 15 === 11) {
          const r = analyzePastLife(createSajuWithSinsal('공망'), null, false);
          if (r.karmicDebts[0].description.includes('Deep experience')) stats.line502++;
        } else if (i % 15 === 12) {
          const r = analyzePastLife(createSajuWithSinsal('空亡'), null, false);
          if (r.karmicDebts[0].description.includes('Deep experience')) stats.line502++;
        } else if (i % 15 === 13) {
          const r = analyzePastLife(createSajuWithSinsal('겁살'), null, false);
          if (r.karmicDebts[0].description.includes('Challenges not')) stats.line510++;
        } else {
          const r = analyzePastLife(createSajuWithSinsal('劫殺'), null, false);
          if (r.karmicDebts[0].description.includes('Challenges not')) stats.line510++;
        }
      }

      expect(stats.line375).toBeGreaterThan(2300);
      expect(stats.line380).toBeGreaterThan(2300);
      expect(stats.line449).toBeGreaterThan(1700);
      expect(stats.line502).toBeGreaterThan(1100);
      expect(stats.line510).toBeGreaterThan(1100);
    });

    it('should handle 10000 iterations with maximum coverage', () => {
      let totalProcessed = 0;

      for (let i = 0; i < 10000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const path = i % 2 === 0 ? 'pillars' : 'fourPillars';
        const lang = i % 3 === 0;

        const saju =
          path === 'pillars'
            ? createSajuWithPillarsHeavenlyStem(stem)
            : createSajuWithFourPillarsHeavenlyStem(stem);

        const r = analyzePastLife(saju, null, lang);

        if (r.dayMaster === stem) {
          totalProcessed++;
        }
      }

      expect(totalProcessed).toBe(10000);
    });
  });

  describe('Sinsal variations exhaustive testing', () => {
    it('should test all sinsal variations 100 times each', () => {
      const sinsals = ['공망', '空亡', '겁살', '劫殺', '원진', '원진살'];

      sinsals.forEach((sinsal) => {
        for (let i = 0; i < 100; i++) {
          const r = analyzePastLife(createSajuWithSinsal(sinsal), null, false);
          expect(r.karmicDebts.length).toBeGreaterThan(0);
          expect(r.karmicDebts[0].area).toBeTruthy();
          expect(r.karmicDebts[0].description).toBeTruthy();
          expect(r.karmicDebts[0].healing).toBeTruthy();
        }
      });
    });

    it('should test sinsal with stem combinations', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        ['공망', '겁살'].forEach((sinsal) => {
          const r = analyzePastLife(
            {
              pillars: { day: { heavenlyStem: { name: stem } } },
              advancedAnalysis: {
                sinsal: { unluckyList: [{ name: sinsal }] },
              },
            },
            null,
            false
          );

          expect(r.dayMaster).toBe(stem);
          expect(r.karmicDebts.length).toBeGreaterThan(0);
        });
      });
    });

    it('should test all sinsal with all geokguk', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        ['공망', '空亡', '겁살', '劫殺'].forEach((sinsal) => {
          const r = analyzePastLife(
            {
              advancedAnalysis: {
                geokguk: { name: geokguk },
                sinsal: { unluckyList: [{ name: sinsal }] },
              },
            },
            null,
            false
          );

          expect(r.pastLife.era).toBeDefined();
          expect(r.karmicDebts.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Geokguk comprehensive testing', () => {
    it('should test each geokguk 200 times', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        for (let i = 0; i < 200; i++) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, i % 2 === 0);
          expect(r.pastLife.era).toBeDefined();
          expect(r.soulPattern.type).toBeTruthy();
          expect(r.soulPattern.emoji).toBeTruthy();
        }
      });
    });

    it('should test geokguk with all stems', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        HEAVENLY_STEMS.forEach((stem) => {
          const r = analyzePastLife(
            {
              pillars: { day: { heavenlyStem: { name: stem } } },
              advancedAnalysis: { geokguk: { name: geokguk } },
            },
            null,
            true
          );

          expect(r.dayMaster).toBe(stem);
          expect(r.pastLife.era).toBeDefined();
        });
      });
    });
  });

  describe('Stem extraction patterns', () => {
    it('should test line 375 with 500 iterations per stem', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        for (let i = 0; i < 500; i++) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, i % 2 === 0);
          expect(r.dayMaster).toBe(stem);
        }
      });
    });

    it('should test line 380 with 500 iterations per stem', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        for (let i = 0; i < 500; i++) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, i % 2 === 0);
          expect(r.dayMaster).toBe(stem);
        }
      });
    });

    it('should test full stem names with 300 iterations', () => {
      FULL_STEM_NAMES.forEach((fullName, idx) => {
        for (let i = 0; i < 300; i++) {
          if (i % 2 === 0) {
            const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullName), null, i % 3 === 0);
            expect(r.dayMaster).toBe(HEAVENLY_STEMS[idx]);
          } else {
            const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullName), null, i % 3 === 0);
            expect(r.dayMaster).toBe(HEAVENLY_STEMS[idx]);
          }
        }
      });
    });
  });

  describe('Era field extensive testing', () => {
    it('should test line 449 with 600 iterations', () => {
      for (let i = 0; i < 600; i++) {
        if (i % 4 === 0) {
          const r = analyzePastLife(createSajuWithGeokguk(GEOKGUK_TYPES[i % 8]), null, true);
          expect(r.pastLife.era).toBeDefined();
          expect(r.pastLife.era).toMatch(/[\uAC00-\uD7AF]/);
        } else if (i % 4 === 1) {
          const r = analyzePastLife(createSajuWithGeokguk(GEOKGUK_TYPES[i % 8]), null, false);
          expect(r.pastLife.era).toBeDefined();
          expect(r.pastLife.era).toMatch(/[A-Za-z]/);
        } else if (i % 4 === 2) {
          const r = analyzePastLife({}, null, true);
          expect(r.pastLife.era).toBeUndefined();
        } else {
          const r = analyzePastLife({}, null, false);
          expect(r.pastLife.era).toBeUndefined();
        }
      }
    });

    it('should verify era for each geokguk 100 times', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        for (let i = 0; i < 100; i++) {
          const korean = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          const english = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);

          expect(korean.pastLife.era).toBeDefined();
          expect(english.pastLife.era).toBeDefined();
          expect(korean.pastLife.era).not.toBe(english.pastLife.era);
        }
      });
    });
  });

  describe('Language consistency validation', () => {
    it('should validate Korean output 1000 times', () => {
      for (let i = 0; i < 1000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];

        const r = analyzePastLife(
          {
            pillars: { day: { heavenlyStem: { name: stem } } },
            advancedAnalysis: { geokguk: { name: geokguk } },
          },
          null,
          true
        );

        expect(r.soulPattern.type).toMatch(/[\uAC00-\uD7AF]/);
        expect(r.thisLifeMission.core).toMatch(/[\uAC00-\uD7AF]/);
        expect(r.pastLife.era).toMatch(/[\uAC00-\uD7AF]/);
      }
    });

    it('should validate English output 1000 times', () => {
      for (let i = 0; i < 1000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];

        const r = analyzePastLife(
          {
            pillars: { day: { heavenlyStem: { name: stem } } },
            advancedAnalysis: { geokguk: { name: geokguk } },
          },
          null,
          false
        );

        expect(r.soulPattern.type).toMatch(/[A-Za-z]/);
        expect(r.thisLifeMission.core).toMatch(/[A-Za-z]/);
        expect(r.pastLife.era).toMatch(/[A-Za-z]/);
      }
    });
  });

  describe('Combined scenario matrix', () => {
    it('should test all combinations of stems and geokguk', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          const r1 = analyzePastLife(
            {
              pillars: { day: { heavenlyStem: { name: stem } } },
              advancedAnalysis: { geokguk: { name: geokguk } },
            },
            null,
            true
          );

          const r2 = analyzePastLife(
            {
              fourPillars: { day: { heavenlyStem: stem } },
              advancedAnalysis: { geokguk: { name: geokguk } },
            },
            null,
            false
          );

          expect(r1.dayMaster).toBe(stem);
          expect(r1.pastLife.era).toBeDefined();
          expect(r2.dayMaster).toBe(stem);
          expect(r2.pastLife.era).toBeDefined();
        });
      });
    });

    it('should test all combinations with sinsal', () => {
      const sinsals = ['공망', '겁살'];

      HEAVENLY_STEMS.forEach((stem) => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          sinsals.forEach((sinsal) => {
            const r = analyzePastLife(
              {
                pillars: { day: { heavenlyStem: { name: stem } } },
                advancedAnalysis: {
                  geokguk: { name: geokguk },
                  sinsal: { unluckyList: [{ name: sinsal }] },
                },
              },
              null,
              false
            );

            expect(r.dayMaster).toBe(stem);
            expect(r.pastLife.era).toBeDefined();
            expect(r.karmicDebts.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe('Final verification mega test', () => {
    it('should process 15000 mixed operations', () => {
      let count = {
        line375: 0,
        line380: 0,
        line449defined: 0,
        line449undefined: 0,
        line502: 0,
        line510: 0,
      };

      for (let i = 0; i < 15000; i++) {
        const stem = HEAVENLY_STEMS[i % 10];
        const fullStem = FULL_STEM_NAMES[i % 10];
        const geokguk = GEOKGUK_TYPES[i % 8];
        const sinsal = i % 2 === 0 ? '공망' : '겁살';

        if (i % 17 === 0) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
          if (r.dayMaster === stem) count.line375++;
        } else if (i % 17 === 1) {
          const r = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullStem), null, false);
          if (r.dayMaster === stem) count.line375++;
        } else if (i % 17 === 2) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
          if (r.dayMaster === stem) count.line380++;
        } else if (i % 17 === 3) {
          const r = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullStem), null, false);
          if (r.dayMaster === stem) count.line380++;
        } else if (i % 17 === 4) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
          if (r.pastLife.era) count.line449defined++;
        } else if (i % 17 === 5) {
          const r = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);
          if (r.pastLife.era) count.line449defined++;
        } else if (i % 17 === 6) {
          const r = analyzePastLife({}, null, i % 2 === 0);
          if (!r.pastLife.era) count.line449undefined++;
        } else if (i % 17 === 7) {
          const r = analyzePastLife(createSajuWithSinsal('공망'), null, false);
          if (r.karmicDebts[0] && r.karmicDebts[0].description.includes('Deep experience')) count.line502++;
        } else if (i % 17 === 8) {
          const r = analyzePastLife(createSajuWithSinsal('空亡'), null, false);
          if (r.karmicDebts[0] && r.karmicDebts[0].description.includes('Deep experience')) count.line502++;
        } else if (i % 17 === 9) {
          const r = analyzePastLife(createSajuWithSinsal('겁살'), null, false);
          if (r.karmicDebts[0] && r.karmicDebts[0].description.includes('Challenges not')) count.line510++;
        } else if (i % 17 === 10) {
          const r = analyzePastLife(createSajuWithSinsal('劫殺'), null, false);
          if (r.karmicDebts[0] && r.karmicDebts[0].description.includes('Challenges not')) count.line510++;
        } else {
          const r = analyzePastLife(
            {
              pillars: { day: { heavenlyStem: { name: stem } } },
              advancedAnalysis: {
                geokguk: { name: geokguk },
                sinsal: { unluckyList: [{ name: sinsal }] },
              },
            },
            null,
            i % 3 === 0
          );
          if (r.dayMaster === stem) count.line375++;
          if (r.pastLife.era) count.line449defined++;
          if (r.karmicDebts.length > 0) {
            if (sinsal === '공망' && r.karmicDebts[0].description.includes('Deep experience')) {
              count.line502++;
            } else if (sinsal === '겁살' && r.karmicDebts[0].description.includes('Challenges not')) {
              count.line510++;
            }
          }
        }
      }

      expect(count.line375).toBeGreaterThan(5500);
      expect(count.line380).toBeGreaterThan(1600);
      expect(count.line449defined).toBeGreaterThan(6000);
      expect(count.line449undefined).toBeGreaterThan(800);
      expect(count.line502).toBeGreaterThan(2500);
      expect(count.line510).toBeGreaterThan(2500);
    });
  });
});
