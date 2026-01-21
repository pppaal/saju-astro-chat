/**
 * Saju Compatibility Integration Tests
 * End-to-end tests for complete saju compatibility workflow
 */
import { describe, it, expect } from 'vitest';
import {
  performComprehensiveSajuAnalysis,
  performExtendedSajuAnalysis,
} from '@/lib/compatibility/saju/comprehensive';
import { analyzeTenGods } from '@/lib/compatibility/saju/ten-gods';
import { analyzeShinsals } from '@/lib/compatibility/saju/shinsals';
import { analyzeHap, analyzeConflicts } from '@/lib/compatibility/saju/harmonies-conflicts';
import { analyzeYongsinCompatibility } from '@/lib/compatibility/saju/yongsin';
import { analyzeDaeunCompatibility, analyzeSeunCompatibility } from '@/lib/compatibility/saju/daeun-seun';
import { analyzeGongmang } from '@/lib/compatibility/saju/gongmang';
import { analyzeGanHap } from '@/lib/compatibility/saju/ganhap';
import { analyzeGyeokguk } from '@/lib/compatibility/saju/gyeokguk';
import { analyzeTwelveStates } from '@/lib/compatibility/saju/twelve-states';
import type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility';

function createRealWorldProfile(
  scenario: 'wood-strong' | 'fire-weak' | 'earth-balanced' | 'metal-strong' | 'water-weak'
): SajuProfile {
  const profiles = {
    'wood-strong': {
      pillars: {
        year: { stem: '甲', branch: '寅' },
        month: { stem: '甲', branch: '卯' },
        day: { stem: '甲', branch: '寅' },
        time: { stem: '乙', branch: '卯' },
      },
      dayMaster: { name: '甲', element: 'wood' },
      elements: { wood: 5, fire: 1, earth: 1, metal: 1, water: 2 },
    },
    'fire-weak': {
      pillars: {
        year: { stem: '壬', branch: '子' },
        month: { stem: '癸', branch: '亥' },
        day: { stem: '丙', branch: '午' },
        time: { stem: '壬', branch: '子' },
      },
      dayMaster: { name: '丙', element: 'fire' },
      elements: { wood: 1, fire: 2, earth: 1, metal: 1, water: 5 },
    },
    'earth-balanced': {
      pillars: {
        year: { stem: '甲', branch: '寅' },
        month: { stem: '丙', branch: '巳' },
        day: { stem: '戊', branch: '辰' },
        time: { stem: '庚', branch: '申' },
      },
      dayMaster: { name: '戊', element: 'earth' },
      elements: { wood: 2, fire: 2, earth: 2, metal: 2, water: 2 },
    },
    'metal-strong': {
      pillars: {
        year: { stem: '庚', branch: '申' },
        month: { stem: '辛', branch: '酉' },
        day: { stem: '庚', branch: '申' },
        time: { stem: '辛', branch: '酉' },
      },
      dayMaster: { name: '庚', element: 'metal' },
      elements: { wood: 1, fire: 1, earth: 2, metal: 5, water: 1 },
    },
    'water-weak': {
      pillars: {
        year: { stem: '戊', branch: '辰' },
        month: { stem: '己', branch: '未' },
        day: { stem: '壬', branch: '子' },
        time: { stem: '戊', branch: '戌' },
      },
      dayMaster: { name: '壬', element: 'water' },
      elements: { wood: 1, fire: 1, earth: 5, metal: 1, water: 2 },
    },
  };

  return profiles[scenario] as SajuProfile;
}

describe('saju-compatibility-integration', () => {
  describe('real-world compatibility scenarios', () => {
    it('should analyze wood-strong and water-weak compatibility', () => {
      const p1 = createRealWorldProfile('wood-strong');
      const p2 = createRealWorldProfile('water-weak');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.grade).toBeDefined();
      expect(result.summary).toBeDefined();

      // Water generates wood - should have some positive aspects
      expect(result.detailedInsights.length).toBeGreaterThan(0);
    });

    it('should analyze fire-weak and wood-strong compatibility', () => {
      const p1 = createRealWorldProfile('fire-weak');
      const p2 = createRealWorldProfile('wood-strong');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      // Wood generates fire - good for weak fire
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.detailedInsights).toBeDefined();
    });

    it('should analyze metal-strong and metal-strong compatibility', () => {
      const p1 = createRealWorldProfile('metal-strong');
      const p2 = createRealWorldProfile('metal-strong');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      // Same element - should have understanding
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
    });

    it('should analyze earth-balanced with all other elements', () => {
      const earthProfile = createRealWorldProfile('earth-balanced');
      const otherProfiles = [
        createRealWorldProfile('wood-strong'),
        createRealWorldProfile('fire-weak'),
        createRealWorldProfile('metal-strong'),
        createRealWorldProfile('water-weak'),
      ];

      otherProfiles.forEach(profile => {
        const result = performComprehensiveSajuAnalysis(earthProfile, profile);

        expect(result.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.overallScore).toBeLessThanOrEqual(100);
        expect(result.grade).toBeDefined();
      });
    });
  });

  describe('module integration verification', () => {
    it('should integrate ten gods analysis correctly', () => {
      const p1 = createRealWorldProfile('wood-strong');
      const p2 = createRealWorldProfile('fire-weak');

      const tenGods = analyzeTenGods(p1, p2);
      const comprehensive = performComprehensiveSajuAnalysis(p1, p2);

      expect(comprehensive.tenGods).toEqual(tenGods);
      expect(comprehensive.tenGods.interaction.balance).toBeDefined();
    });

    it('should integrate shinsals analysis correctly', () => {
      const p1 = createRealWorldProfile('metal-strong');
      const p2 = createRealWorldProfile('water-weak');

      const shinsals = analyzeShinsals(p1, p2);
      const comprehensive = performComprehensiveSajuAnalysis(p1, p2);

      expect(comprehensive.shinsals).toEqual(shinsals);
      expect(comprehensive.shinsals.overallImpact).toBeDefined();
    });

    it('should integrate harmonies and conflicts correctly', () => {
      const p1 = createRealWorldProfile('wood-strong');
      const p2 = createRealWorldProfile('earth-balanced');

      const harmonies = analyzeHap(p1, p2);
      const conflicts = analyzeConflicts(p1, p2);
      const comprehensive = performComprehensiveSajuAnalysis(p1, p2);

      expect(comprehensive.harmonies).toEqual(harmonies);
      expect(comprehensive.conflicts).toEqual(conflicts);
    });

    it('should integrate extended modules in extended analysis', () => {
      const p1 = createRealWorldProfile('fire-weak');
      const p2 = createRealWorldProfile('wood-strong');

      const yongsin = analyzeYongsinCompatibility(p1, p2);
      const daeun = analyzeDaeunCompatibility(p1, p2, 30, 30);
      const seun = analyzeSeunCompatibility(p1, p2, 2024);
      const gongmang = analyzeGongmang(p1, p2);
      const ganHap = analyzeGanHap(p1, p2);
      const gyeokguk = analyzeGyeokguk(p1, p2);
      const twelveStates = analyzeTwelveStates(p1, p2);

      const extended = performExtendedSajuAnalysis(p1, p2, 30, 30, 2024);

      expect(extended.yongsin).toEqual(yongsin);
      expect(extended.daeun).toEqual(daeun);
      expect(extended.seun).toEqual(seun);
      expect(extended.gongmang).toEqual(gongmang);
      expect(extended.ganHap).toEqual(ganHap);
      expect(extended.gyeokguk).toEqual(gyeokguk);
      expect(extended.twelveStates).toEqual(twelveStates);
    });
  });

  describe('score calculation validation', () => {
    it('should calculate consistent scores across multiple runs', () => {
      const p1 = createRealWorldProfile('wood-strong');
      const p2 = createRealWorldProfile('fire-weak');

      const result1 = performComprehensiveSajuAnalysis(p1, p2);
      const result2 = performComprehensiveSajuAnalysis(p1, p2);

      expect(result1.overallScore).toBe(result2.overallScore);
      expect(result1.grade).toBe(result2.grade);
    });

    it('should have different scores for different profiles', () => {
      const p1 = createRealWorldProfile('wood-strong');
      const p2Good = createRealWorldProfile('water-weak');
      const p2Bad = createRealWorldProfile('metal-strong');

      const resultGood = performComprehensiveSajuAnalysis(p1, p2Good);
      const resultBad = performComprehensiveSajuAnalysis(p1, p2Bad);

      // Scores should differ for different compatibility scenarios
      expect(resultGood.overallScore).not.toBe(resultBad.overallScore);
    });

    it('should respect score boundaries', () => {
      const scenarios = [
        ['wood-strong', 'water-weak'],
        ['fire-weak', 'wood-strong'],
        ['earth-balanced', 'metal-strong'],
        ['metal-strong', 'earth-balanced'],
        ['water-weak', 'earth-balanced'],
      ] as const;

      scenarios.forEach(([s1, s2]) => {
        const p1 = createRealWorldProfile(s1);
        const p2 = createRealWorldProfile(s2);

        const result = performComprehensiveSajuAnalysis(p1, p2);

        expect(result.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.overallScore).toBeLessThanOrEqual(100);
      });
    });

    it('should assign grades that match score ranges', () => {
      const p1 = createRealWorldProfile('earth-balanced');
      const p2 = createRealWorldProfile('fire-weak');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      const { overallScore, grade } = result;

      if (overallScore >= 95) expect(grade).toBe('S+');
      else if (overallScore >= 85) expect(grade).toBe('S');
      else if (overallScore >= 75) expect(grade).toBe('A');
      else if (overallScore >= 65) expect(grade).toBe('B');
      else if (overallScore >= 50) expect(grade).toBe('C');
      else if (overallScore >= 35) expect(grade).toBe('D');
      else expect(grade).toBe('F');
    });
  });

  describe('comprehensive workflow validation', () => {
    it('should provide complete analysis workflow', () => {
      const p1 = createRealWorldProfile('wood-strong');
      const p2 = createRealWorldProfile('fire-weak');

      // Step 1: Basic analysis
      const comprehensive = performComprehensiveSajuAnalysis(p1, p2);

      expect(comprehensive.tenGods).toBeDefined();
      expect(comprehensive.shinsals).toBeDefined();
      expect(comprehensive.harmonies).toBeDefined();
      expect(comprehensive.conflicts).toBeDefined();
      expect(comprehensive.overallScore).toBeDefined();
      expect(comprehensive.grade).toBeDefined();
      expect(comprehensive.summary).toBeDefined();
      expect(comprehensive.detailedInsights).toBeDefined();

      // Step 2: Extended analysis
      const extended = performExtendedSajuAnalysis(p1, p2, 35, 30, 2024);

      expect(extended.yongsin).toBeDefined();
      expect(extended.daeun).toBeDefined();
      expect(extended.seun).toBeDefined();
      expect(extended.gongmang).toBeDefined();
      expect(extended.ganHap).toBeDefined();
      expect(extended.gyeokguk).toBeDefined();
      expect(extended.twelveStates).toBeDefined();
    });

    it('should handle complete compatibility analysis for all element combinations', () => {
      const profiles = [
        createRealWorldProfile('wood-strong'),
        createRealWorldProfile('fire-weak'),
        createRealWorldProfile('earth-balanced'),
        createRealWorldProfile('metal-strong'),
        createRealWorldProfile('water-weak'),
      ];

      profiles.forEach((p1, i) => {
        profiles.forEach((p2, j) => {
          if (i !== j) {
            const result = performComprehensiveSajuAnalysis(p1, p2);

            expect(result.overallScore).toBeGreaterThanOrEqual(0);
            expect(result.overallScore).toBeLessThanOrEqual(100);
            expect(result.grade).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.detailedInsights.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it('should provide meaningful insights for all compatibility levels', () => {
      const p1 = createRealWorldProfile('wood-strong');
      const p2 = createRealWorldProfile('fire-weak');

      const comprehensive = performComprehensiveSajuAnalysis(p1, p2);
      const extended = performExtendedSajuAnalysis(p1, p2, 35, 30, 2024);

      // Comprehensive insights
      expect(comprehensive.detailedInsights.length).toBeGreaterThanOrEqual(3);
      comprehensive.detailedInsights.forEach(insight => {
        expect(insight.length).toBeGreaterThan(0);
      });

      // Extended insights
      expect(extended.detailedInsights.length).toBeGreaterThan(comprehensive.detailedInsights.length);
      extended.detailedInsights.forEach(insight => {
        expect(insight.length).toBeGreaterThan(0);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle profiles with extreme element imbalance', () => {
      const extremeProfile: SajuProfile = {
        pillars: {
          year: { stem: '甲', branch: '寅' },
          month: { stem: '甲', branch: '卯' },
          day: { stem: '甲', branch: '寅' },
          time: { stem: '甲', branch: '卯' },
        },
        dayMaster: { name: '甲', element: 'wood' },
        elements: { wood: 10, fire: 0, earth: 0, metal: 0, water: 0 },
      } as SajuProfile;

      const balanced = createRealWorldProfile('earth-balanced');

      const result = performComprehensiveSajuAnalysis(extremeProfile, balanced);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle profiles with all same branches', () => {
      const sameBranchProfile: SajuProfile = {
        pillars: {
          year: { stem: '甲', branch: '子' },
          month: { stem: '乙', branch: '子' },
          day: { stem: '丙', branch: '子' },
          time: { stem: '丁', branch: '子' },
        },
        dayMaster: { name: '甲', element: 'wood' },
        elements: { wood: 2, fire: 2, earth: 2, metal: 2, water: 2 },
      } as SajuProfile;

      const normal = createRealWorldProfile('earth-balanced');

      const result = performComprehensiveSajuAnalysis(sameBranchProfile, normal);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle different age ranges in extended analysis', () => {
      const p1 = createRealWorldProfile('wood-strong');
      const p2 = createRealWorldProfile('fire-weak');

      const ageRanges = [
        [10, 15],
        [25, 30],
        [40, 45],
        [60, 65],
        [80, 85],
      ];

      ageRanges.forEach(([age1, age2]) => {
        const result = performExtendedSajuAnalysis(p1, p2, age1, age2, 2024);

        expect(result.daeun.person1CurrentDaeun.startAge).toBeDefined();
        expect(result.daeun.person2CurrentDaeun.startAge).toBeDefined();
      });
    });

    it('should handle different years in seun analysis', () => {
      const p1 = createRealWorldProfile('metal-strong');
      const p2 = createRealWorldProfile('water-weak');

      const years = [2020, 2021, 2022, 2023, 2024, 2025];

      years.forEach(year => {
        const result = performExtendedSajuAnalysis(p1, p2, 30, 30, year);

        expect(result.seun.year).toBe(year);
        expect(result.seun.yearStem).toBeDefined();
        expect(result.seun.yearBranch).toBeDefined();
      });
    });
  });

  describe('performance and consistency', () => {
    it('should complete analysis in reasonable time', () => {
      const p1 = createRealWorldProfile('wood-strong');
      const p2 = createRealWorldProfile('fire-weak');

      const start = Date.now();
      performExtendedSajuAnalysis(p1, p2, 35, 30, 2024);
      const duration = Date.now() - start;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should maintain consistency across multiple analyses', () => {
      const p1 = createRealWorldProfile('earth-balanced');
      const p2 = createRealWorldProfile('metal-strong');

      const results = Array.from({ length: 5 }, () =>
        performComprehensiveSajuAnalysis(p1, p2)
      );

      // All results should be identical
      results.forEach(result => {
        expect(result.overallScore).toBe(results[0].overallScore);
        expect(result.grade).toBe(results[0].grade);
      });
    });
  });
});
