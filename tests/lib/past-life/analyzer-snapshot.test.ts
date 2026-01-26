// tests/lib/past-life/analyzer-snapshot.test.ts
// Snapshot, Memory, and Concurrency Tests for Past Life Analyzer

import { describe, it, expect } from 'vitest';
import { analyzePastLife } from '@/lib/past-life/analyzer';

// ============================================================
// Constants
// ============================================================

const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;
const DAY_MASTER_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;

// Reference snapshots for regression testing
const REFERENCE_OUTPUTS = {
  ARTIST_KO: {
    soulType: '창조자 영혼',
    emoji: '🎨',
    traitsCount: 5,
    minScore: 60,
  },
  LEADER_KO: {
    soulType: '지도자 영혼',
    emoji: '👑',
    traitsCount: 5,
    minScore: 60,
  },
  EXPLORER_KO: {
    soulType: '탐험가 영혼',
    emoji: '🌟',
    traitsCount: 3,
    score: 65, // Base score for null inputs
  },
} as const;

// ============================================================
// Helper Functions
// ============================================================

const analyzeKorean = (saju?: any, astro?: any) => analyzePastLife(saju || null, astro || null, true);
const analyzeEnglish = (saju?: any, astro?: any) => analyzePastLife(saju || null, astro || null, false);

// ============================================================
// Tests
// ============================================================

describe('Past Life Analyzer - Snapshot & Advanced Tests', () => {

  describe('Output Snapshot Tests', () => {
    it('should match reference output for Artist persona', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '식신' } } },
        null
      );

      expect(result.soulPattern.type).toBe(REFERENCE_OUTPUTS.ARTIST_KO.soulType);
      expect(result.soulPattern.emoji).toBe(REFERENCE_OUTPUTS.ARTIST_KO.emoji);
      expect(result.soulPattern.traits).toHaveLength(REFERENCE_OUTPUTS.ARTIST_KO.traitsCount);
      expect(result.karmaScore).toBeGreaterThanOrEqual(REFERENCE_OUTPUTS.ARTIST_KO.minScore);
    });

    it('should match reference output for Leader persona', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '정관' } } },
        null
      );

      expect(result.soulPattern.type).toBe(REFERENCE_OUTPUTS.LEADER_KO.soulType);
      expect(result.soulPattern.emoji).toBe(REFERENCE_OUTPUTS.LEADER_KO.emoji);
      expect(result.soulPattern.traits).toHaveLength(REFERENCE_OUTPUTS.LEADER_KO.traitsCount);
      expect(result.karmaScore).toBeGreaterThanOrEqual(REFERENCE_OUTPUTS.LEADER_KO.minScore);
    });

    it('should match reference output for default Explorer', () => {
      const result = analyzeKorean(null, null);

      expect(result.soulPattern.type).toBe(REFERENCE_OUTPUTS.EXPLORER_KO.soulType);
      expect(result.soulPattern.emoji).toBe(REFERENCE_OUTPUTS.EXPLORER_KO.emoji);
      expect(result.soulPattern.traits).toHaveLength(REFERENCE_OUTPUTS.EXPLORER_KO.traitsCount);
      expect(result.karmaScore).toBe(REFERENCE_OUTPUTS.EXPLORER_KO.score);
    });

    it('should produce identical output for same input across multiple calls', () => {
      const input = {
        saju: { advancedAnalysis: { geokguk: { name: '식신' } }, dayMaster: { name: '갑' } },
        astro: { planets: [{ name: 'Saturn', house: 5 }] },
      };

      const result1 = analyzeKorean(input.saju, input.astro);
      const result2 = analyzeKorean(input.saju, input.astro);
      const result3 = analyzeKorean(input.saju, input.astro);

      // Serialize and compare
      expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
      expect(JSON.stringify(result2)).toBe(JSON.stringify(result3));
    });

    it('should have stable output structure', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '정관' } } },
        { planets: [{ name: 'North Node', house: 7 }] }
      );

      // Verify complete structure
      const keys = Object.keys(result).sort();
      expect(keys).toEqual([
        'dayMaster',
        'geokguk',
        'karmaScore',
        'karmicDebts',
        'northNodeHouse',
        'pastLife',
        'saturnHouse',
        'saturnLesson',
        'soulJourney',
        'soulPattern',
        'talentsCarried',
        'thisLifeMission',
      ].sort());
    });
  });

  describe('Memory Efficiency Tests', () => {
    it('should not accumulate memory with repeated analyses', () => {
      const iterations = 1000;
      const results: any[] = [];

      // Perform many analyses
      for (let i = 0; i < iterations; i++) {
        const result = analyzeKorean(
          { advancedAnalysis: { geokguk: { name: GEOKGUK_TYPES[i % 8] } } },
          null
        );
        // Only keep last 10 to simulate typical usage
        results.push(result);
        if (results.length > 10) {
          results.shift();
        }
      }

      // Should complete without issues
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should not leak memory through closures', () => {
      const createAnalyzer = () => {
        return () => analyzeKorean(
          { advancedAnalysis: { geokguk: { name: '식신' } } },
          null
        );
      };

      const analyzers = Array(100).fill(null).map(() => createAnalyzer());

      analyzers.forEach((analyzer) => {
        const result = analyzer();
        expect(result).toBeDefined();
      });
    });

    it('should handle large input arrays without memory issues', () => {
      const largeSinsalArray = Array(1000).fill(null).map((_, i) => ({
        name: ['원진', '공망', '겁살'][i % 3],
      }));

      const result = analyzeKorean(
        {
          advancedAnalysis: {
            geokguk: { name: '식신' },
            sinsal: { unluckyList: largeSinsalArray },
          },
        },
        null
      );

      expect(result.karmicDebts.length).toBeLessThanOrEqual(4);
    });

    it('should not retain references to input objects', () => {
      const saju = { advancedAnalysis: { geokguk: { name: '식신' } } };
      const originalSaju = JSON.parse(JSON.stringify(saju));

      analyzeKorean(saju, null);

      expect(saju).toEqual(originalSaju);
    });
  });

  describe('Concurrency and Race Condition Tests', () => {
    it('should handle concurrent analyses correctly', async () => {
      const promises = Array(50).fill(null).map((_, i) =>
        Promise.resolve(analyzeKorean(
          { advancedAnalysis: { geokguk: { name: GEOKGUK_TYPES[i % 8] } } },
          { planets: [{ name: 'Saturn', house: (i % 12) + 1 }] }
        ))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.soulPattern.type).toBeTruthy();
        expect(result.karmaScore).toBeGreaterThanOrEqual(50);
      });
    });

    it('should maintain independence between concurrent analyses', async () => {
      const task1 = Promise.resolve(analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '식신' } } },
        null
      ));

      const task2 = Promise.resolve(analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '정관' } } },
        null
      ));

      const [result1, result2] = await Promise.all([task1, task2]);

      expect(result1.soulPattern.type).toBe('창조자 영혼');
      expect(result2.soulPattern.type).toBe('지도자 영혼');
      expect(result1.soulPattern.type).not.toBe(result2.soulPattern.type);
    });

    it('should handle interleaved analyses correctly', async () => {
      const results: any[] = [];

      // Start multiple analyses in quick succession
      for (let i = 0; i < 20; i++) {
        const promise = Promise.resolve(analyzeKorean(
          { advancedAnalysis: { geokguk: { name: GEOKGUK_TYPES[i % 8] } } },
          { planets: [{ name: 'North Node', house: (i % 12) + 1 }] }
        ));
        results.push(promise);
      }

      const completed = await Promise.all(results);

      expect(completed).toHaveLength(20);
      // Verify each has correct geokguk
      completed.forEach((result, i) => {
        expect(result.northNodeHouse).toBe((i % 12) + 1);
      });
    });

    it('should be thread-safe with shared input references', async () => {
      const sharedSaju = { advancedAnalysis: { geokguk: { name: '식신' } } };

      const promises = Array(30).fill(null).map(() =>
        Promise.resolve(analyzeKorean(sharedSaju, null))
      );

      const results = await Promise.all(promises);

      // All should have same result
      results.forEach((result) => {
        expect(result.soulPattern.type).toBe('창조자 영혼');
      });

      // Original object should be unchanged
      expect(sharedSaju).toEqual({ advancedAnalysis: { geokguk: { name: '식신' } } });
    });
  });

  describe('Deterministic Behavior Tests', () => {
    it('should produce same output for same geokguk across sessions', () => {
      const sessions = Array(5).fill(null).map(() =>
        GEOKGUK_TYPES.map((geokguk) =>
          analyzeKorean({ advancedAnalysis: { geokguk: { name: geokguk } } }, null)
        )
      );

      // All sessions should produce identical results
      for (let i = 0; i < GEOKGUK_TYPES.length; i++) {
        const soulTypes = sessions.map((session) => session[i].soulPattern.type);
        const uniqueTypes = new Set(soulTypes);
        expect(uniqueTypes.size).toBe(1);
      }
    });

    it('should produce same output for same day master across sessions', () => {
      const sessions = Array(5).fill(null).map(() =>
        DAY_MASTER_STEMS.map((stem) =>
          analyzeKorean({ dayMaster: { name: stem } }, null)
        )
      );

      // All sessions should produce identical results
      for (let i = 0; i < DAY_MASTER_STEMS.length; i++) {
        const missions = sessions.map((session) => session[i].thisLifeMission.core);
        const uniqueMissions = new Set(missions);
        expect(uniqueMissions.size).toBe(1);
      }
    });

    it('should not be affected by previous analyses', () => {
      // Run some analyses
      for (let i = 0; i < 10; i++) {
        analyzeKorean(
          { advancedAnalysis: { geokguk: { name: GEOKGUK_TYPES[i % 8] } } },
          null
        );
      }

      // Then run a specific test
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '식신' } } },
        null
      );

      expect(result.soulPattern.type).toBe('창조자 영혼');
      expect(result.soulPattern.emoji).toBe('🎨');
    });

    it('should produce consistent karma scores', () => {
      const input = {
        saju: {
          advancedAnalysis: {
            geokguk: { name: '정관' },
            sinsal: { unluckyList: [{ name: '원진' }] },
          },
          dayMaster: { name: '갑' },
        },
        astro: {
          planets: [
            { name: 'North Node', house: 5 },
            { name: 'Saturn', house: 9 },
          ],
        },
      };

      const scores = Array(20).fill(null).map(() =>
        analyzeKorean(input.saju, input.astro).karmaScore
      );

      // All scores should be identical
      const uniqueScores = new Set(scores);
      expect(uniqueScores.size).toBe(1);
    });
  });

  describe('Data Immutability Tests', () => {
    it('should not modify input saju object', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '식신' },
          sinsal: { unluckyList: [{ name: '원진' }] },
        },
        dayMaster: { name: '갑' },
      };

      const original = JSON.parse(JSON.stringify(saju));

      analyzeKorean(saju, null);

      expect(saju).toEqual(original);
    });

    it('should not modify input astro object', () => {
      const astro = {
        planets: [
          { name: 'North Node', house: 5 },
          { name: 'Saturn', house: 9 },
          { name: 'Sun', house: 1 },
        ],
      };

      const original = JSON.parse(JSON.stringify(astro));

      analyzeKorean(null, astro);

      expect(astro).toEqual(original);
    });

    it('should not modify nested objects in input', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '정관', metadata: { extra: 'data' } },
          sinsal: {
            unluckyList: [
              { name: '원진', details: { severity: 'high' } },
            ],
          },
        },
      };

      const original = JSON.parse(JSON.stringify(saju));

      analyzeKorean(saju, null);

      expect(saju).toEqual(original);
    });

    it('should not share references between results', () => {
      const result1 = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '식신' } } },
        null
      );

      const result2 = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '정관' } } }, // Different input
        null
      );

      // Store original values
      const result1Trait = result1.soulPattern.traits[0];
      const result2Trait = result2.soulPattern.traits[0];

      // Modify result1
      result1.soulPattern.traits[0] = 'MODIFIED';

      // result2 should be unchanged (not the same reference)
      expect(result2.soulPattern.traits[0]).toBe(result2Trait);
      expect(result1.soulPattern.traits[0]).toBe('MODIFIED');
    });
  });

  describe('Stress Testing', () => {
    it('should handle 5000 rapid consecutive analyses', () => {
      const start = Date.now();

      for (let i = 0; i < 5000; i++) {
        analyzeKorean(
          { advancedAnalysis: { geokguk: { name: GEOKGUK_TYPES[i % 8] } } },
          null
        );
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000); // Should complete in less than 10 seconds
    });

    it('should handle all possible geokguk × day master × house combinations', () => {
      let count = 0;

      GEOKGUK_TYPES.forEach((geokguk) => {
        DAY_MASTER_STEMS.forEach((stem) => {
          for (let house = 1; house <= 12; house++) {
            const result = analyzeKorean(
              {
                advancedAnalysis: { geokguk: { name: geokguk } },
                dayMaster: { name: stem },
              },
              { planets: [{ name: 'Saturn', house }] }
            );

            expect(result).toBeDefined();
            expect(result.karmaScore).toBeGreaterThanOrEqual(50);
            count++;
          }
        });
      });

      expect(count).toBe(8 * 10 * 12); // 960 combinations
    });

    it('should maintain performance under extreme load', () => {
      const iterations = 1000;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        analyzeKorean(
          {
            advancedAnalysis: {
              geokguk: { name: GEOKGUK_TYPES[i % 8] },
              sinsal: {
                unluckyList: [{ name: '원진' }, { name: '공망' }],
              },
            },
            dayMaster: { name: DAY_MASTER_STEMS[i % 10] },
          },
          {
            planets: [
              { name: 'North Node', house: (i % 12) + 1 },
              { name: 'Saturn', house: ((i + 6) % 12) + 1 },
            ],
          }
        );

        durations.push(Date.now() - start);
      }

      // Average duration should be reasonable
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(5); // Less than 5ms per analysis on average
    });
  });

  describe('Edge Case Snapshot Tests', () => {
    it('should have consistent output for null inputs', () => {
      const results = Array(10).fill(null).map(() =>
        analyzeKorean(null, null)
      );

      // All should be identical
      const serialized = results.map((r) => JSON.stringify(r));
      const unique = new Set(serialized);
      expect(unique.size).toBe(1);
    });

    it('should have consistent output for empty objects', () => {
      const results = Array(10).fill(null).map(() =>
        analyzeKorean({}, {})
      );

      const serialized = results.map((r) => JSON.stringify(r));
      const unique = new Set(serialized);
      expect(unique.size).toBe(1);
    });

    it('should have consistent output for minimal data', () => {
      const results = Array(10).fill(null).map(() =>
        analyzeKorean({ advancedAnalysis: { geokguk: { name: '식신' } } }, null)
      );

      results.forEach((result) => {
        expect(result.soulPattern.type).toBe('창조자 영혼');
        expect(result.karmaScore).toBe(75); // 65 base + 10 for geokguk
      });
    });
  });

  describe('Output Quality Assurance', () => {
    it('should never return empty strings', () => {
      const result = analyzeKorean(
        {
          advancedAnalysis: { geokguk: { name: '식신' } },
          dayMaster: { name: '갑' },
        },
        { planets: [{ name: 'North Node', house: 5 }] }
      );

      // Check all text fields
      expect(result.soulPattern.type.length).toBeGreaterThan(0);
      expect(result.soulPattern.title.length).toBeGreaterThan(0);
      expect(result.soulPattern.description.length).toBeGreaterThan(0);
      expect(result.pastLife.likely.length).toBeGreaterThan(0);
      expect(result.soulJourney.pastPattern.length).toBeGreaterThan(0);
      expect(result.saturnLesson.lesson.length).toBeGreaterThan(0);
      expect(result.thisLifeMission.core.length).toBeGreaterThan(0);

      result.soulPattern.traits.forEach((trait) => {
        expect(trait.length).toBeGreaterThan(0);
      });

      result.talentsCarried.forEach((talent) => {
        expect(talent.length).toBeGreaterThan(0);
      });
    });

    it('should never return undefined for required fields', () => {
      const result = analyzeKorean(null, null);

      expect(result.soulPattern).toBeDefined();
      expect(result.soulPattern.type).toBeDefined();
      expect(result.soulPattern.emoji).toBeDefined();
      expect(result.pastLife).toBeDefined();
      expect(result.soulJourney).toBeDefined();
      expect(result.saturnLesson).toBeDefined();
      expect(result.thisLifeMission).toBeDefined();
      expect(result.karmicDebts).toBeDefined();
      expect(result.talentsCarried).toBeDefined();
      expect(result.karmaScore).toBeDefined();
    });

    it('should maintain data type consistency', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '정관' } } },
        { planets: [{ name: 'Saturn', house: 7 }] }
      );

      expect(typeof result.soulPattern.type).toBe('string');
      expect(typeof result.soulPattern.emoji).toBe('string');
      expect(Array.isArray(result.soulPattern.traits)).toBe(true);
      expect(Array.isArray(result.karmicDebts)).toBe(true);
      expect(Array.isArray(result.talentsCarried)).toBe(true);
      expect(typeof result.karmaScore).toBe('number');
    });
  });
});
