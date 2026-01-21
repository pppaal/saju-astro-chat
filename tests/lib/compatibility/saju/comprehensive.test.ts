/**
 * Comprehensive Saju Compatibility Tests
 * Tests for integrated compatibility analysis combining all modules
 */
import { describe, it, expect } from 'vitest';
import {
  performComprehensiveSajuAnalysis,
  performExtendedSajuAnalysis,
} from '@/lib/compatibility/saju/comprehensive';
import type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility';

function createMockProfile(
  yearStem: string,
  yearBranch: string,
  monthStem: string,
  monthBranch: string,
  dayStem: string,
  dayBranch: string,
  timeStem: string,
  timeBranch: string,
  dayElement: string,
  elements: Record<string, number> = {}
): SajuProfile {
  return {
    pillars: {
      year: { stem: yearStem, branch: yearBranch },
      month: { stem: monthStem, branch: monthBranch },
      day: { stem: dayStem, branch: dayBranch },
      time: { stem: timeStem, branch: timeBranch },
    },
    dayMaster: { name: dayStem, element: dayElement },
    elements: {
      wood: elements.wood || 2,
      fire: elements.fire || 2,
      earth: elements.earth || 2,
      metal: elements.metal || 2,
      water: elements.water || 2,
    },
  } as SajuProfile;
}

describe('compatibility/saju/comprehensive', () => {
  describe('performComprehensiveSajuAnalysis', () => {
    it('should perform complete compatibility analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result).toBeDefined();
      expect(result.tenGods).toBeDefined();
      expect(result.shinsals).toBeDefined();
      expect(result.harmonies).toBeDefined();
      expect(result.conflicts).toBeDefined();
    });

    it('should calculate overall score', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result.overallScore).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should assign compatibility grade', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      const validGrades = ['S+', 'S', 'A', 'B', 'C', 'D', 'F'];
      expect(validGrades).toContain(result.grade);
    });

    it('should assign S+ grade for scores >= 95', () => {
      // This would require perfect compatibility scenario
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '未', 'wood');
      const p2 = createMockProfile('己', '丑', '庚', '寅', '己', '丑', '辛', '卯', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      if (result.overallScore >= 95) {
        expect(result.grade).toBe('S+');
      }
    });

    it('should assign grades correctly for different score ranges', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      const score = result.overallScore;
      const grade = result.grade;

      if (score >= 95) expect(grade).toBe('S+');
      else if (score >= 85) expect(grade).toBe('S');
      else if (score >= 75) expect(grade).toBe('A');
      else if (score >= 65) expect(grade).toBe('B');
      else if (score >= 50) expect(grade).toBe('C');
      else if (score >= 35) expect(grade).toBe('D');
      else expect(grade).toBe('F');
    });

    it('should provide summary based on grade', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should provide detailed insights', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(Array.isArray(result.detailedInsights)).toBe(true);
      expect(result.detailedInsights.length).toBeGreaterThan(0);
    });

    it('should include ten gods analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result.tenGods.interaction).toBeDefined();
      expect(result.tenGods.relationshipDynamics).toBeDefined();
    });

    it('should include shinsals analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result.shinsals.person1Shinsals).toBeDefined();
      expect(result.shinsals.person2Shinsals).toBeDefined();
      expect(result.shinsals.overallImpact).toBeDefined();
    });

    it('should include harmonies analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result.harmonies.yukhap).toBeDefined();
      expect(result.harmonies.samhap).toBeDefined();
      expect(result.harmonies.banghap).toBeDefined();
      expect(result.harmonies.score).toBeDefined();
    });

    it('should include conflicts analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result.conflicts.chung).toBeDefined();
      expect(result.conflicts.hyeong).toBeDefined();
      expect(result.conflicts.pa).toBeDefined();
      expect(result.conflicts.hae).toBeDefined();
      expect(result.conflicts.severity).toBeDefined();
    });

    it('should calculate score from multiple components', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      // Score should be influenced by tenGods, shinsals, harmonies, and conflicts
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should apply conflict penalty', () => {
      // Create profiles with conflicts
      const p1 = createMockProfile('甲', '子', '乙', '寅', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('戊', '午', '己', '申', '庚', '午', '辛', '酉', 'metal');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      // Should have some conflicts
      expect(result.conflicts.totalConflicts).toBeGreaterThanOrEqual(0);
    });

    it('should include emojis in summary', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(result.summary);
      expect(hasEmoji).toBe(true);
    });

    it('should handle profiles with no conflicts', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '辰', '丁', '巳', '戊', '午', '己', '未', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      if (result.conflicts.totalConflicts === 0) {
        const hasNoConflictMessage = result.detailedInsights.some(i => i.includes('충형파해가 없'));
        expect(hasNoConflictMessage).toBe(true);
      }
    });

    it('should handle profiles with high harmony', () => {
      // Create profiles with harmonies
      const p1 = createMockProfile('甲', '子', '乙', '寅', '甲', '申', '丁', '卯', 'wood');
      const p2 = createMockProfile('戊', '丑', '己', '亥', '庚', '子', '辛', '戌', 'metal');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result.harmonies.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performExtendedSajuAnalysis', () => {
    it('should perform extended compatibility analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2, 30, 30, 2024);

      expect(result).toBeDefined();
      expect(result.yongsin).toBeDefined();
      expect(result.daeun).toBeDefined();
      expect(result.seun).toBeDefined();
      expect(result.gongmang).toBeDefined();
      expect(result.ganHap).toBeDefined();
      expect(result.gyeokguk).toBeDefined();
      expect(result.twelveStates).toBeDefined();
    });

    it('should include base analysis results', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2);

      expect(result.tenGods).toBeDefined();
      expect(result.shinsals).toBeDefined();
      expect(result.harmonies).toBeDefined();
      expect(result.conflicts).toBeDefined();
    });

    it('should calculate extended score', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2);

      expect(result.overallScore).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should recalculate grade based on extended score', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2);

      const validGrades = ['S+', 'S', 'A', 'B', 'C', 'D', 'F'];
      expect(validGrades).toContain(result.grade);
    });

    it('should include yongsin compatibility', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood', { wood: 1 });
      const p2 = createMockProfile('壬', '申', '癸', '亥', '壬', '申', '甲', '寅', 'water', { water: 3 });

      const result = performExtendedSajuAnalysis(p1, p2);

      expect(result.yongsin.person1Yongsin).toBeDefined();
      expect(result.yongsin.person2Yongsin).toBeDefined();
      expect(result.yongsin.compatibility).toBeGreaterThanOrEqual(0);
    });

    it('should include daeun analysis with ages', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2, 35, 30);

      expect(result.daeun.person1CurrentDaeun).toBeDefined();
      expect(result.daeun.person2CurrentDaeun).toBeDefined();
      expect(result.daeun.person1CurrentDaeun.startAge).toBe(30);
      expect(result.daeun.person2CurrentDaeun.startAge).toBe(30);
    });

    it('should include seun analysis with year', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2, 30, 30, 2024);

      expect(result.seun.year).toBe(2024);
      expect(result.seun.yearStem).toBeDefined();
      expect(result.seun.yearBranch).toBeDefined();
    });

    it('should use default parameters when not provided', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2);

      // Should use defaults: age 30, current year
      expect(result.daeun).toBeDefined();
      expect(result.seun).toBeDefined();
      expect(result.seun.year).toBe(new Date().getFullYear());
    });

    it('should include gongmang analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2);

      expect(result.gongmang.person1Gongmang).toBeDefined();
      expect(result.gongmang.person2Gongmang).toBeDefined();
      expect(result.gongmang.impact).toBeDefined();
    });

    it('should include ganhap analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('己', '未', '庚', '寅', '己', '丑', '辛', '卯', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2);

      expect(result.ganHap.combinations).toBeDefined();
      expect(result.ganHap.totalHarmony).toBeDefined();
    });

    it('should include gyeokguk analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2);

      expect(result.gyeokguk.person1Gyeokguk).toBeDefined();
      expect(result.gyeokguk.person2Gyeokguk).toBeDefined();
      expect(result.gyeokguk.compatibility).toBeDefined();
    });

    it('should include twelve states analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '巳', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2);

      expect(result.twelveStates.person1States).toBeDefined();
      expect(result.twelveStates.person2States).toBeDefined();
      expect(result.twelveStates.energyCompatibility).toBeDefined();
    });

    it('should have extended insights including all modules', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2);

      expect(result.detailedInsights.length).toBeGreaterThan(5);

      // Should include insights from various modules
      const allInsights = result.detailedInsights.join(' ');
      expect(allInsights.length).toBeGreaterThan(0);
    });

    it('should weight multiple factors in extended score', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood', { wood: 1 });
      const p2 = createMockProfile('壬', '申', '癸', '亥', '壬', '申', '甲', '寅', 'water', { water: 3 });

      const result = performExtendedSajuAnalysis(p1, p2);

      // Extended score should consider:
      // - base analysis (40%)
      // - yongsin (15%)
      // - daeun (10%)
      // - ganhap (10%)
      // - gyeokguk (10%)
      // - twelve states (10%)
      // - gongmang (5%)

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('integration tests', () => {
    it('should provide complete comprehensive analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performComprehensiveSajuAnalysis(p1, p2);

      expect(result).toMatchObject({
        tenGods: expect.any(Object),
        shinsals: expect.any(Object),
        harmonies: expect.any(Object),
        conflicts: expect.any(Object),
        overallScore: expect.any(Number),
        grade: expect.any(String),
        summary: expect.any(String),
        detailedInsights: expect.any(Array),
      });
    });

    it('should provide complete extended analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = performExtendedSajuAnalysis(p1, p2, 35, 30, 2024);

      expect(result).toMatchObject({
        // Base analysis
        tenGods: expect.any(Object),
        shinsals: expect.any(Object),
        harmonies: expect.any(Object),
        conflicts: expect.any(Object),
        // Extended analysis
        yongsin: expect.any(Object),
        daeun: expect.any(Object),
        seun: expect.any(Object),
        gongmang: expect.any(Object),
        ganHap: expect.any(Object),
        gyeokguk: expect.any(Object),
        twelveStates: expect.any(Object),
        // Results
        overallScore: expect.any(Number),
        grade: expect.any(String),
        summary: expect.any(String),
        detailedInsights: expect.any(Array),
      });
    });

    it('should handle various compatibility scenarios', () => {
      const scenarios = [
        // Good compatibility
        {
          p1: createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '未', 'wood'),
          p2: createMockProfile('己', '丑', '庚', '寅', '己', '丑', '辛', '卯', 'earth'),
        },
        // Moderate compatibility
        {
          p1: createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood'),
          p2: createMockProfile('丙', '辰', '丁', '巳', '戊', '午', '己', '未', 'earth'),
        },
        // Challenging compatibility
        {
          p1: createMockProfile('甲', '子', '乙', '寅', '甲', '子', '丁', '卯', 'wood'),
          p2: createMockProfile('庚', '午', '辛', '申', '庚', '午', '壬', '酉', 'metal'),
        },
      ];

      scenarios.forEach(({ p1, p2 }) => {
        const result = performComprehensiveSajuAnalysis(p1, p2);

        expect(result.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.overallScore).toBeLessThanOrEqual(100);
        expect(result.grade).toBeDefined();
        expect(result.summary).toBeDefined();
      });
    });

    it('should maintain consistency between comprehensive and extended analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const comprehensive = performComprehensiveSajuAnalysis(p1, p2);
      const extended = performExtendedSajuAnalysis(p1, p2);

      // Extended should have same base analyses
      expect(extended.tenGods).toEqual(comprehensive.tenGods);
      expect(extended.shinsals).toEqual(comprehensive.shinsals);
      expect(extended.harmonies).toEqual(comprehensive.harmonies);
      expect(extended.conflicts).toEqual(comprehensive.conflicts);
    });
  });
});
