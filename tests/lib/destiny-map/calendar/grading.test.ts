// tests/lib/destiny-map/calendar/grading.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateGrade,
  getGradeKeys,
  getGradeRecommendations,
  filterWarningsByGrade,
  GradeInput,
  GradeResult,
} from '@/lib/destiny-map/calendar/grading';

// 테스트용 헬퍼 함수
function createGradeInput(overrides: Partial<GradeInput> = {}): GradeInput {
  return {
    score: 50,
    isBirthdaySpecial: false,
    crossVerified: false,
    sajuPositive: false,
    astroPositive: false,
    totalStrengthCount: 0,
    sajuBadCount: 0,
    hasChung: false,
    hasXing: false,
    hasNoMajorRetrograde: true,
    retrogradeCount: 0,
    totalBadCount: 0,
    ...overrides,
  };
}

describe('grading', () => {
  describe('calculateGrade', () => {
    describe('structure validation', () => {
      it('should return GradeResult with all required fields', () => {
        const input = createGradeInput();
        const result = calculateGrade(input);

        expect(result).toHaveProperty('grade');
        expect(result).toHaveProperty('adjustedScore');
        expect(result).toHaveProperty('gradeBonus');
      });
    });

    describe('grade levels', () => {
      it('should return grade 0 for score >= 72 without chung/xing', () => {
        const input = createGradeInput({ score: 75, hasChung: false, hasXing: false });
        const result = calculateGrade(input);

        expect(result.grade).toBe(0);
      });

      it('should not return grade 0 if hasChung is true even with high score', () => {
        const input = createGradeInput({ score: 80, hasChung: true });
        const result = calculateGrade(input);

        expect(result.grade).not.toBe(0);
      });

      it('should not return grade 0 if hasXing is true even with high score', () => {
        const input = createGradeInput({ score: 80, hasXing: true });
        const result = calculateGrade(input);

        expect(result.grade).not.toBe(0);
      });

      it('should return grade 1 for score 65-71', () => {
        const input = createGradeInput({ score: 68 });
        const result = calculateGrade(input);

        expect(result.grade).toBe(1);
      });

      it('should return grade 2 for score 45-64', () => {
        const input = createGradeInput({ score: 55 });
        const result = calculateGrade(input);

        expect(result.grade).toBe(2);
      });

      it('should return grade 3 for score 30-44', () => {
        const input = createGradeInput({ score: 35 });
        const result = calculateGrade(input);

        expect(result.grade).toBe(3);
      });

      it('should return grade 4 for score < 30', () => {
        const input = createGradeInput({ score: 20 });
        const result = calculateGrade(input);

        expect(result.grade).toBe(4);
      });
    });

    describe('bonus conditions', () => {
      it('should add bonus for birthday special', () => {
        const withBonus = createGradeInput({ score: 50, isBirthdaySpecial: true });
        const without = createGradeInput({ score: 50, isBirthdaySpecial: false });

        const resultWith = calculateGrade(withBonus);
        const resultWithout = calculateGrade(without);

        expect(resultWith.adjustedScore).toBeGreaterThan(resultWithout.adjustedScore);
      });

      it('should add bonus for cross verification', () => {
        const withBonus = createGradeInput({
          score: 50,
          crossVerified: true,
          sajuPositive: true,
          astroPositive: true,
        });
        const without = createGradeInput({ score: 50 });

        const resultWith = calculateGrade(withBonus);
        const resultWithout = calculateGrade(without);

        expect(resultWith.adjustedScore).toBeGreaterThan(resultWithout.adjustedScore);
      });

      it('should add bonus for high strength count with no bad saju', () => {
        const withBonus = createGradeInput({
          score: 50,
          totalStrengthCount: 5,
          sajuBadCount: 0,
        });
        const without = createGradeInput({ score: 50, totalStrengthCount: 2 });

        const resultWith = calculateGrade(withBonus);
        const resultWithout = calculateGrade(without);

        expect(resultWith.adjustedScore).toBeGreaterThan(resultWithout.adjustedScore);
      });
    });

    describe('penalty conditions', () => {
      it('should apply penalty for hasChung and hasXing together', () => {
        const withPenalty = createGradeInput({ score: 50, hasChung: true, hasXing: true });
        const without = createGradeInput({ score: 50 });

        const resultWith = calculateGrade(withPenalty);
        const resultWithout = calculateGrade(without);

        expect(resultWith.adjustedScore).toBeLessThan(resultWithout.adjustedScore);
        expect(resultWith.gradeBonus).toBeLessThanOrEqual(-4);
      });

      it('should apply smaller penalty for hasChung only', () => {
        const chungOnly = createGradeInput({ score: 50, hasChung: true });
        const both = createGradeInput({ score: 50, hasChung: true, hasXing: true });

        const resultChung = calculateGrade(chungOnly);
        const resultBoth = calculateGrade(both);

        expect(resultChung.adjustedScore).toBeGreaterThan(resultBoth.adjustedScore);
      });

      it('should apply penalty for multiple bad factors', () => {
        const withPenalty = createGradeInput({ score: 50, totalBadCount: 3 });
        const without = createGradeInput({ score: 50, totalBadCount: 0 });

        const resultWith = calculateGrade(withPenalty);
        const resultWithout = calculateGrade(without);

        expect(resultWith.adjustedScore).toBeLessThan(resultWithout.adjustedScore);
      });

      it('should apply penalty for multiple retrogrades', () => {
        const withPenalty = createGradeInput({
          score: 50,
          hasNoMajorRetrograde: false,
          retrogradeCount: 3,
        });
        const without = createGradeInput({ score: 50, retrogradeCount: 0 });

        const resultWith = calculateGrade(withPenalty);
        const resultWithout = calculateGrade(without);

        expect(resultWith.adjustedScore).toBeLessThan(resultWithout.adjustedScore);
      });
    });

    describe('bonus/penalty limits', () => {
      it('should limit bonus to maximum +4', () => {
        const input = createGradeInput({
          score: 50,
          isBirthdaySpecial: true,
          crossVerified: true,
          sajuPositive: true,
          astroPositive: true,
          totalStrengthCount: 10,
          sajuBadCount: 0,
        });

        const result = calculateGrade(input);

        expect(result.gradeBonus).toBeLessThanOrEqual(4);
      });

      it('should limit penalty to minimum -6', () => {
        const input = createGradeInput({
          score: 50,
          hasChung: true,
          hasXing: true,
          totalBadCount: 5,
          hasNoMajorRetrograde: false,
          retrogradeCount: 3,
        });

        const result = calculateGrade(input);

        expect(result.gradeBonus).toBeGreaterThanOrEqual(-6);
      });
    });

    describe('grade boundaries', () => {
      it('should correctly handle boundary at 72', () => {
        const below = createGradeInput({ score: 71 });
        const at = createGradeInput({ score: 72 });

        const resultBelow = calculateGrade(below);
        const resultAt = calculateGrade(at);

        expect(resultBelow.grade).toBe(1);
        expect(resultAt.grade).toBe(0);
      });

      it('should correctly handle boundary at 65', () => {
        const below = createGradeInput({ score: 64 });
        const at = createGradeInput({ score: 65 });

        const resultBelow = calculateGrade(below);
        const resultAt = calculateGrade(at);

        expect(resultBelow.grade).toBe(2);
        expect(resultAt.grade).toBe(1);
      });

      it('should correctly handle boundary at 45', () => {
        const below = createGradeInput({ score: 44 });
        const at = createGradeInput({ score: 45 });

        const resultBelow = calculateGrade(below);
        const resultAt = calculateGrade(at);

        expect(resultBelow.grade).toBe(3);
        expect(resultAt.grade).toBe(2);
      });

      it('should correctly handle boundary at 30', () => {
        const below = createGradeInput({ score: 29 });
        const at = createGradeInput({ score: 30 });

        const resultBelow = calculateGrade(below);
        const resultAt = calculateGrade(at);

        expect(resultBelow.grade).toBe(4);
        expect(resultAt.grade).toBe(3);
      });
    });
  });

  describe('getGradeKeys', () => {
    it('should return correct keys for grade 0', () => {
      const result = getGradeKeys(0);

      expect(result.titleKey).toBe('calendar.bestDay');
      expect(result.descKey).toBe('calendar.bestDayDesc');
    });

    it('should return correct keys for grade 1', () => {
      const result = getGradeKeys(1);

      expect(result.titleKey).toBe('calendar.goodDay');
      expect(result.descKey).toBe('calendar.goodDayDesc');
    });

    it('should return correct keys for grade 2', () => {
      const result = getGradeKeys(2);

      expect(result.titleKey).toBe('calendar.normalDay');
      expect(result.descKey).toBe('calendar.normalDayDesc');
    });

    it('should return correct keys for grade 3', () => {
      const result = getGradeKeys(3);

      expect(result.titleKey).toBe('calendar.badDay');
      expect(result.descKey).toBe('calendar.badDayDesc');
    });

    it('should return correct keys for grade 4', () => {
      const result = getGradeKeys(4);

      expect(result.titleKey).toBe('calendar.worstDay');
      expect(result.descKey).toBe('calendar.worstDayDesc');
    });
  });

  describe('getGradeRecommendations', () => {
    it('should return recommendations for grade 0', () => {
      const result = getGradeRecommendations(0);

      expect(result).toContain('majorDecision');
      expect(result).toContain('wedding');
      expect(result).toContain('contract');
      expect(result).toContain('bigDecision');
    });

    it('should return recommendations for grade 1', () => {
      const result = getGradeRecommendations(1);

      expect(result).toContain('majorDecision');
      expect(result).toContain('contract');
    });

    it('should return empty array for grade 2', () => {
      const result = getGradeRecommendations(2);

      expect(result).toEqual([]);
    });

    it('should return rest/meditation for grade 3', () => {
      const result = getGradeRecommendations(3);

      expect(result).toContain('rest');
      expect(result).toContain('meditation');
    });

    it('should return rest/meditation/avoid for grade 4', () => {
      const result = getGradeRecommendations(4);

      expect(result).toContain('rest');
      expect(result).toContain('meditation');
      expect(result).toContain('avoidBigDecisions');
    });
  });

  describe('filterWarningsByGrade', () => {
    const allWarnings = [
      'extremeCaution',
      'confusion',
      'conflict',
      'accident',
      'injury',
      'betrayal',
      'caution',
      'health',
    ];

    it('should remove all warnings for grade 0', () => {
      const result = filterWarningsByGrade(0, allWarnings);

      expect(result).toEqual([]);
    });

    it('should remove all warnings for grade 1', () => {
      const result = filterWarningsByGrade(1, allWarnings);

      expect(result).toEqual([]);
    });

    it('should filter severe warnings for grade 2', () => {
      const result = filterWarningsByGrade(2, allWarnings);

      expect(result).not.toContain('extremeCaution');
      expect(result).not.toContain('confusion');
      expect(result).not.toContain('conflict');
      expect(result).not.toContain('accident');
      expect(result).not.toContain('injury');
      expect(result).not.toContain('betrayal');
    });

    it('should keep non-severe warnings for grade 2', () => {
      const result = filterWarningsByGrade(2, ['caution', 'health']);

      expect(result).toContain('caution');
      expect(result).toContain('health');
    });

    it('should add default caution for grade 3 with no warnings', () => {
      const result = filterWarningsByGrade(3, []);

      expect(result).toContain('caution');
    });

    it('should keep existing warnings for grade 3', () => {
      const warnings = ['conflict', 'health'];
      const result = filterWarningsByGrade(3, warnings);

      expect(result).toContain('conflict');
      expect(result).toContain('health');
    });

    it('should add base warnings for grade 4', () => {
      const result = filterWarningsByGrade(4, []);

      expect(result).toContain('extremeCaution');
      expect(result).toContain('health');
    });

    it('should combine warnings for grade 4', () => {
      const result = filterWarningsByGrade(4, ['conflict']);

      expect(result).toContain('extremeCaution');
      expect(result).toContain('health');
      expect(result).toContain('conflict');
    });

    it('should deduplicate warnings for grade 4', () => {
      const result = filterWarningsByGrade(4, ['health', 'extremeCaution']);

      // Should not have duplicates
      const uniqueResult = [...new Set(result)];
      expect(result.length).toBe(uniqueResult.length);
    });
  });

  describe('edge cases', () => {
    it('should handle score of 0', () => {
      const input = createGradeInput({ score: 0 });
      const result = calculateGrade(input);

      expect(result.grade).toBe(4);
    });

    it('should handle score of 100', () => {
      const input = createGradeInput({ score: 100 });
      const result = calculateGrade(input);

      expect(result.grade).toBe(0);
    });

    it('should handle negative adjusted score', () => {
      const input = createGradeInput({
        score: 5,
        hasChung: true,
        hasXing: true,
        totalBadCount: 5,
      });
      const result = calculateGrade(input);

      expect(result.grade).toBe(4);
    });
  });
});
