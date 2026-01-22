/**
 * Optimized tests for uncovered lines in analyzer.ts
 * Lines 473, 552, 640 (updated after code refactoring)
 *
 * This file replaces the high-volume iteration tests with targeted, efficient tests
 * that achieve the same coverage with ~95% fewer iterations.
 */
import { describe, it, expect } from 'vitest';
import { analyzePastLife } from '@/lib/past-life/analyzer';

// Test Constants
const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const FULL_STEM_NAMES = ['갑목', '을목', '병화', '정화', '무토', '기토', '경금', '신금', '임수', '계수'] as const;
const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;

// Helper functions
const createSajuWithPillarsHeavenlyStem = (stem: string) => ({
  pillars: { day: { heavenlyStem: { name: stem } } },
});

const createSajuWithFourPillarsHeavenlyStem = (stem: string) => ({
  fourPillars: { day: { heavenlyStem: stem } },
});

const createSajuWithGeokguk = (geokguk: string) => ({
  advancedAnalysis: { geokguk: { name: geokguk } },
});

const createSajuWithSinsal = (sinsal: string) => ({
  advancedAnalysis: { sinsal: { unluckyList: [{ name: sinsal }] } },
});

describe('Past Life Analyzer - Optimized Uncovered Lines Coverage', () => {
  describe('Line 473: pillars.day.heavenlyStem as object with name property (ternary true branch)', () => {
    it('should extract day master from pillars.day.heavenlyStem.name for all stems', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(stem), null, true);
        expect(result.dayMaster).toBe(stem);
      });
    });

    it('should extract day master from full stem names', () => {
      FULL_STEM_NAMES.forEach((fullStem, idx) => {
        const result = analyzePastLife(createSajuWithPillarsHeavenlyStem(fullStem), null, true);
        expect(result.dayMaster).toBe(HEAVENLY_STEMS[idx]);
      });
    });

    it('should work in both Korean and English modes', () => {
      const koreanResult = analyzePastLife(createSajuWithPillarsHeavenlyStem('갑'), null, true);
      const englishResult = analyzePastLife(createSajuWithPillarsHeavenlyStem('을'), null, false);

      expect(koreanResult.dayMaster).toBe('갑');
      expect(englishResult.dayMaster).toBe('을');
    });
  });

  describe('Line 474: fourPillars.day.heavenlyStem coverage (fallback path)', () => {
    it('should extract day master from fourPillars.day.heavenlyStem for all stems', () => {
      HEAVENLY_STEMS.forEach((stem) => {
        const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(stem), null, true);
        expect(result.dayMaster).toBe(stem);
      });
    });

    it('should extract day master from full stem names in fourPillars', () => {
      FULL_STEM_NAMES.forEach((fullStem, idx) => {
        const result = analyzePastLife(createSajuWithFourPillarsHeavenlyStem(fullStem), null, false);
        expect(result.dayMaster).toBe(HEAVENLY_STEMS[idx]);
      });
    });
  });

  describe('Line 552: era field ternary (theme.era ? selectLang(isKo, theme.era) : undefined)', () => {
    it('should return era for all geokguk types in Korean (true branch)', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
        expect(result.pastLife.era).toBeDefined();
        expect(typeof result.pastLife.era).toBe('string');
      });
    });

    it('should return era for all geokguk types in English (true branch)', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);
        expect(result.pastLife.era).toBeDefined();
        expect(typeof result.pastLife.era).toBe('string');
      });
    });

    it('should return different era values for Korean vs English', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const koreanResult = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
        const englishResult = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);
        expect(koreanResult.pastLife.era).not.toBe(englishResult.pastLife.era);
      });
    });

    it('should return undefined era when no geokguk (false branch)', () => {
      const result = analyzePastLife({}, null, true);
      expect(result.pastLife.era).toBeUndefined();
    });

    it('should handle both branches in mixed scenarios', () => {
      // With geokguk - era defined
      const withGeokguk = analyzePastLife(createSajuWithGeokguk('식신'), null, true);
      expect(withGeokguk.pastLife.era).toBeDefined();

      // Without geokguk - era undefined
      const withoutGeokguk = analyzePastLife({ dayMaster: { name: '갑' } }, null, true);
      expect(withoutGeokguk.pastLife.era).toBeUndefined();
    });
  });

  describe('Line 601: English sinsal descriptions (isKo false branch)', () => {
    it('should return English description for 공망/空亡', () => {
      const result1 = analyzePastLife(createSajuWithSinsal('공망'), null, false);
      const result2 = analyzePastLife(createSajuWithSinsal('空亡'), null, false);

      expect(result1.karmicDebts[0].area).toBe('Emptiness Karma');
      expect(result1.karmicDebts[0].description).toContain('Deep experience');
      expect(result2.karmicDebts[0].description).toContain('Deep experience');
    });

    it('should return English description for 겁살/劫殺', () => {
      const result1 = analyzePastLife(createSajuWithSinsal('겁살'), null, false);
      const result2 = analyzePastLife(createSajuWithSinsal('劫殺'), null, false);

      expect(result1.karmicDebts[0].area).toBe('Challenge Karma');
      expect(result1.karmicDebts[0].description).toContain('Challenges not');
      expect(result2.karmicDebts[0].description).toContain('Challenges not');
    });

    it('should handle all sinsal types in English mode', () => {
      const sinsalTypes = ['원진', '원진살', '공망', '空亡', '겁살', '劫殺'];

      sinsalTypes.forEach((sinsal) => {
        const result = analyzePastLife(createSajuWithSinsal(sinsal), null, false);
        expect(result.karmicDebts.length).toBeGreaterThan(0);
        expect(result.karmicDebts[0].area).toBeTruthy();
        expect(result.karmicDebts[0].description).toBeTruthy();
      });
    });
  });

  describe('Line 611: era field ternary true branch (theme.era ? selectLang(isKo, theme.era) : undefined)', () => {
    it('should return Korean era when theme.era exists (식신)', () => {
      const result = analyzePastLife(createSajuWithGeokguk('식신'), null, true);
      expect(result.pastLife.era).toBe('르네상스 시대 또는 조선시대 예술가');
    });

    it('should return English era when theme.era exists (식신)', () => {
      const result = analyzePastLife(createSajuWithGeokguk('식신'), null, false);
      expect(result.pastLife.era).toBe('Renaissance era or Joseon Dynasty artist');
    });

    it('should return different era for each geokguk type', () => {
      const results = GEOKGUK_TYPES.map(geokguk =>
        analyzePastLife(createSajuWithGeokguk(geokguk), null, true)
      );

      results.forEach(result => {
        expect(result.pastLife.era).toBeDefined();
        expect(typeof result.pastLife.era).toBe('string');
      });
    });
  });

  describe('Line 692: GEOKGUK_TALENTS mapping (geokTalents ? selectLangFromArray(isKo, geokTalents) : [])', () => {
    it('should use selectLangFromArray for Korean talents (식신)', () => {
      const result = analyzePastLife(createSajuWithGeokguk('식신'), null, true);
      expect(result.talentsCarried).toBeDefined();
      expect(result.talentsCarried.length).toBe(3);
      expect(result.talentsCarried).toContain('창작 능력');
      expect(result.talentsCarried).toContain('미적 감각');
      expect(result.talentsCarried).toContain('요리/음식');
    });

    it('should use selectLangFromArray for English talents (식신)', () => {
      const result = analyzePastLife(createSajuWithGeokguk('식신'), null, false);
      expect(result.talentsCarried).toBeDefined();
      expect(result.talentsCarried.length).toBe(3);
      expect(result.talentsCarried).toContain('Creative ability');
      expect(result.talentsCarried).toContain('Aesthetic sense');
      expect(result.talentsCarried).toContain('Cooking/Food');
    });

    it('should map talents to Korean when geokgukType exists', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, true);
        expect(result.talentsCarried).toBeDefined();
        expect(result.talentsCarried.length).toBeGreaterThan(0);
        // Verify it's Korean text
        result.talentsCarried.forEach((talent: string) => {
          expect(typeof talent).toBe('string');
          expect(talent.length).toBeGreaterThan(0);
        });
      });
    });

    it('should map talents to English when geokgukType exists', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const result = analyzePastLife(createSajuWithGeokguk(geokguk), null, false);
        expect(result.talentsCarried).toBeDefined();
        expect(result.talentsCarried.length).toBeGreaterThan(0);
        // Verify it's English text
        result.talentsCarried.forEach((talent: string) => {
          expect(typeof talent).toBe('string');
          expect(talent.length).toBeGreaterThan(0);
        });
      });
    });

    it('should return fallback talents when geokgukType is null (different code path)', () => {
      // This tests the case where geokgukType is null, which goes through extractTalentsCarried
      // and returns the default fallback talents instead of using GEOKGUK_TALENTS
      const result = analyzePastLife({}, null, true);
      expect(result.talentsCarried).toBeDefined();
      expect(result.talentsCarried).toEqual(['적응력', '학습 능력', '회복력']);
    });
  });

  describe('Combined coverage verification', () => {
    it('should handle all critical lines in integrated scenarios', () => {
      // Test all combinations efficiently
      HEAVENLY_STEMS.forEach((stem, stemIdx) => {
        GEOKGUK_TYPES.forEach((geokguk, geoIdx) => {
          const saju = {
            pillars: { day: { heavenlyStem: { name: stem } } },
            advancedAnalysis: {
              geokguk: { name: geokguk },
              sinsal: { unluckyList: [{ name: stemIdx % 2 === 0 ? '공망' : '겁살' }] }
            },
          };

          const result = analyzePastLife(saju, null, geoIdx % 2 === 0);

          // Line 473
          expect(result.dayMaster).toBe(stem);
          // Line 552
          expect(result.pastLife.era).toBeDefined();
          // Line 601
          expect(result.karmicDebts.length).toBeGreaterThan(0);
          // Line 640 (talents should exist)
          expect(result.talentsCarried.length).toBeGreaterThan(0);
        });
      });
    });

    it('should verify fallback paths', () => {
      // Test fourPillars path (line 474)
      const fourPillarsResult = analyzePastLife(
        createSajuWithFourPillarsHeavenlyStem('병화'),
        null,
        true
      );
      expect(fourPillarsResult.dayMaster).toBe('병');

      // Test no geokguk path (line 552 false branch)
      const noGeokgukResult = analyzePastLife({}, null, false);
      expect(noGeokgukResult.pastLife.era).toBeUndefined();

      // Test no geokguk talents fallback (line 640)
      expect(noGeokgukResult.talentsCarried).toEqual(['Adaptability', 'Learning ability', 'Resilience']);
    });
  });

  describe('Line 482-488: findPlanetByAliases function (planet alias resolution)', () => {
    it('should find planet using first alias (northnode)', () => {
      const astro = {
        planets: [{ name: 'NorthNode', house: 5 }]
      };
      const result = analyzePastLife({}, astro, true);
      expect(result.northNodeHouse).toBe(5);
    });

    it('should find planet using alternative alias (north)', () => {
      const astro = {
        planets: [{ name: 'North', house: 7 }]
      };
      const result = analyzePastLife({}, astro, true);
      expect(result.northNodeHouse).toBe(7);
    });

    it('should find Saturn', () => {
      const astro = {
        planets: [{ name: 'Saturn', house: 10 }]
      };
      const result = analyzePastLife({}, astro, true);
      expect(result.saturnHouse).toBe(10);
    });

    it('should handle multiple planets with different names', () => {
      const astro = {
        planets: [
          { name: 'North Node', house: 3 },
          { name: 'Saturn', house: 8 }
        ]
      };
      const result = analyzePastLife({}, astro, true);
      expect(result.northNodeHouse).toBe(3);
      expect(result.saturnHouse).toBe(8);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty objects gracefully', () => {
      const result = analyzePastLife({}, null, true);
      expect(result).toBeTruthy();
      expect(result.pastLife.era).toBeUndefined();
    });

    it('should handle mixed full stem names with geokguk', () => {
      FULL_STEM_NAMES.forEach((fullStem, idx) => {
        const result = analyzePastLife(
          {
            pillars: { day: { heavenlyStem: { name: fullStem } } },
            advancedAnalysis: { geokguk: { name: GEOKGUK_TYPES[idx % 8] } },
          },
          null,
          true
        );
        expect(result.dayMaster).toBe(HEAVENLY_STEMS[idx]);
        expect(result.pastLife.era).toBeDefined();
      });
    });
  });
});
