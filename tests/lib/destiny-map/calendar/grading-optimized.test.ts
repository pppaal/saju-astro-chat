/**
 * Grading Optimized Module Tests
 * Tests for optimized destiny calendar grading with memoization
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/cache/memoize", () => ({
  memoize: vi.fn((fn) => fn),
}));

vi.mock("@/lib/destiny-map/calendar/scoring-config", () => ({
  GRADE_THRESHOLDS: {
    grade0: 68,
    grade1: 62,
    grade2: 42,
    grade3: 28,
  },
}));

import {
  calculateGrade,
  getCategoryScore,
  getGradeTitleKey,
  getGradeDescKey,
  getGradeColor,
  getGradeBgColor,
  type GradeInput,
  type GradeResult,
} from "@/lib/destiny-map/calendar/grading-optimized";
import type { ImportanceGrade } from "@/lib/destiny-map/calendar/types";

describe("Grading Optimized Module", () => {
  describe("calculateGrade with number input", () => {
    it("returns grade 0 for score >= 68", () => {
      expect(calculateGrade(68)).toBe(0);
      expect(calculateGrade(75)).toBe(0);
      expect(calculateGrade(100)).toBe(0);
    });

    it("returns grade 1 for score >= 62 and < 68", () => {
      expect(calculateGrade(62)).toBe(1);
      expect(calculateGrade(65)).toBe(1);
      expect(calculateGrade(67)).toBe(1);
    });

    it("returns grade 2 for score >= 42 and < 62", () => {
      expect(calculateGrade(42)).toBe(2);
      expect(calculateGrade(50)).toBe(2);
      expect(calculateGrade(61)).toBe(2);
    });

    it("returns grade 3 for score >= 28 and < 42", () => {
      expect(calculateGrade(28)).toBe(3);
      expect(calculateGrade(35)).toBe(3);
      expect(calculateGrade(41)).toBe(3);
    });

    it("returns grade 4 for score < 28", () => {
      expect(calculateGrade(27)).toBe(4);
      expect(calculateGrade(15)).toBe(4);
      expect(calculateGrade(0)).toBe(4);
    });
  });

  describe("calculateGrade with GradeInput object", () => {
    const baseInput: GradeInput = {
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
    };

    it("returns GradeResult structure", () => {
      const result = calculateGrade(baseInput);

      expect(result).toHaveProperty("grade");
      expect(result).toHaveProperty("adjustedScore");
      expect(result).toHaveProperty("gradeBonus");
    });

    describe("bonus conditions", () => {
      it("adds +2 bonus for birthday special", () => {
        const result = calculateGrade({ ...baseInput, isBirthdaySpecial: true });

        expect(result.gradeBonus).toBe(2);
        expect(result.adjustedScore).toBe(52);
      });

      it("adds +2 bonus for cross verified with positive saju and astro", () => {
        const result = calculateGrade({
          ...baseInput,
          crossVerified: true,
          sajuPositive: true,
          astroPositive: true,
        });

        expect(result.gradeBonus).toBe(2);
        expect(result.adjustedScore).toBe(52);
      });

      it("adds +1 bonus for high strength count with no bad saju", () => {
        const result = calculateGrade({
          ...baseInput,
          totalStrengthCount: 5,
          sajuBadCount: 0,
        });

        expect(result.gradeBonus).toBe(1);
        expect(result.adjustedScore).toBe(51);
      });

      it("combines multiple bonuses", () => {
        const result = calculateGrade({
          ...baseInput,
          isBirthdaySpecial: true,
          crossVerified: true,
          sajuPositive: true,
          astroPositive: true,
          totalStrengthCount: 5,
          sajuBadCount: 0,
        });

        // Max bonus is capped at 4
        expect(result.gradeBonus).toBeLessThanOrEqual(4);
      });
    });

    describe("penalty conditions", () => {
      it("subtracts -4 for both chung and xing", () => {
        const result = calculateGrade({
          ...baseInput,
          hasChung: true,
          hasXing: true,
        });

        expect(result.gradeBonus).toBe(-4);
        expect(result.adjustedScore).toBe(46);
      });

      it("subtracts -2 for chung only", () => {
        const result = calculateGrade({
          ...baseInput,
          hasChung: true,
          hasXing: false,
        });

        expect(result.gradeBonus).toBe(-2);
        expect(result.adjustedScore).toBe(48);
      });

      it("subtracts -2 for xing only", () => {
        const result = calculateGrade({
          ...baseInput,
          hasChung: false,
          hasXing: true,
        });

        expect(result.gradeBonus).toBe(-2);
        expect(result.adjustedScore).toBe(48);
      });

      it("subtracts -3 for totalBadCount >= 3", () => {
        const result = calculateGrade({
          ...baseInput,
          totalBadCount: 3,
        });

        expect(result.gradeBonus).toBe(-3);
        expect(result.adjustedScore).toBe(47);
      });

      it("subtracts -1 for totalBadCount >= 2", () => {
        const result = calculateGrade({
          ...baseInput,
          totalBadCount: 2,
        });

        expect(result.gradeBonus).toBe(-1);
        expect(result.adjustedScore).toBe(49);
      });

      it("subtracts -2 for multiple retrogrades without major retrograde clear", () => {
        const result = calculateGrade({
          ...baseInput,
          hasNoMajorRetrograde: false,
          retrogradeCount: 2,
        });

        expect(result.gradeBonus).toBe(-2);
        expect(result.adjustedScore).toBe(48);
      });

      it("combines multiple penalties", () => {
        const result = calculateGrade({
          ...baseInput,
          hasChung: true,
          hasXing: true,
          totalBadCount: 3,
          hasNoMajorRetrograde: false,
          retrogradeCount: 2,
        });

        // Min penalty is capped at -6
        expect(result.gradeBonus).toBeGreaterThanOrEqual(-6);
      });
    });

    describe("grade determination", () => {
      it("returns grade 0 for high adjusted score without chung+xing", () => {
        const result = calculateGrade({
          ...baseInput,
          score: 70,
        });

        expect(result.grade).toBe(0);
      });

      it("does not return grade 0 if has both chung and xing", () => {
        const result = calculateGrade({
          ...baseInput,
          score: 80,
          hasChung: true,
          hasXing: true,
        });

        expect(result.grade).not.toBe(0);
      });

      it("returns grade 1 for adjusted score >= 62", () => {
        const result = calculateGrade({
          ...baseInput,
          score: 62,
        });

        expect(result.grade).toBe(1);
      });

      it("returns grade 2 for adjusted score >= 42", () => {
        const result = calculateGrade({
          ...baseInput,
          score: 42,
        });

        expect(result.grade).toBe(2);
      });

      it("returns grade 3 for adjusted score >= 28", () => {
        const result = calculateGrade({
          ...baseInput,
          score: 28,
        });

        expect(result.grade).toBe(3);
      });

      it("returns grade 4 for adjusted score < 28", () => {
        const result = calculateGrade({
          ...baseInput,
          score: 20,
        });

        expect(result.grade).toBe(4);
      });
    });

    describe("bonus/penalty limits", () => {
      it("caps bonus at +4", () => {
        const result = calculateGrade({
          ...baseInput,
          isBirthdaySpecial: true,
          crossVerified: true,
          sajuPositive: true,
          astroPositive: true,
          totalStrengthCount: 10,
          sajuBadCount: 0,
        });

        expect(result.gradeBonus).toBe(4);
      });

      it("caps penalty at -6", () => {
        const result = calculateGrade({
          ...baseInput,
          hasChung: true,
          hasXing: true,
          totalBadCount: 5,
          hasNoMajorRetrograde: false,
          retrogradeCount: 5,
        });

        expect(result.gradeBonus).toBe(-6);
      });
    });
  });

  describe("getCategoryScore", () => {
    it("returns grade 0 for score >= 68", () => {
      expect(getCategoryScore(70)).toBe(0);
    });

    it("returns grade 1 for score >= 62", () => {
      expect(getCategoryScore(65)).toBe(1);
    });

    it("returns grade 2 for score >= 42", () => {
      expect(getCategoryScore(50)).toBe(2);
    });

    it("returns grade 3 for score >= 28", () => {
      expect(getCategoryScore(35)).toBe(3);
    });

    it("returns grade 4 for score < 28", () => {
      expect(getCategoryScore(20)).toBe(4);
    });
  });

  describe("getGradeTitleKey", () => {
    it("returns best title for grade 0", () => {
      expect(getGradeTitleKey(0)).toBe("destiny.calendar.grade.best.title");
    });

    it("returns good title for grade 1", () => {
      expect(getGradeTitleKey(1)).toBe("destiny.calendar.grade.good.title");
    });

    it("returns normal title for grade 2", () => {
      expect(getGradeTitleKey(2)).toBe("destiny.calendar.grade.normal.title");
    });

    it("returns bad title for grade 3", () => {
      expect(getGradeTitleKey(3)).toBe("destiny.calendar.grade.bad.title");
    });

    it("returns worst title for grade 4", () => {
      expect(getGradeTitleKey(4)).toBe("destiny.calendar.grade.worst.title");
    });

    it("returns normal title for unknown grade", () => {
      expect(getGradeTitleKey(99 as ImportanceGrade)).toBe("destiny.calendar.grade.normal.title");
    });
  });

  describe("getGradeDescKey", () => {
    it("returns best desc for grade 0", () => {
      expect(getGradeDescKey(0)).toBe("destiny.calendar.grade.best.desc");
    });

    it("returns good desc for grade 1", () => {
      expect(getGradeDescKey(1)).toBe("destiny.calendar.grade.good.desc");
    });

    it("returns normal desc for grade 2", () => {
      expect(getGradeDescKey(2)).toBe("destiny.calendar.grade.normal.desc");
    });

    it("returns bad desc for grade 3", () => {
      expect(getGradeDescKey(3)).toBe("destiny.calendar.grade.bad.desc");
    });

    it("returns worst desc for grade 4", () => {
      expect(getGradeDescKey(4)).toBe("destiny.calendar.grade.worst.desc");
    });

    it("returns normal desc for unknown grade", () => {
      expect(getGradeDescKey(99 as ImportanceGrade)).toBe("destiny.calendar.grade.normal.desc");
    });
  });

  describe("getGradeColor", () => {
    it("returns yellow for grade 0", () => {
      expect(getGradeColor(0)).toBe("text-yellow-600 dark:text-yellow-400");
    });

    it("returns green for grade 1", () => {
      expect(getGradeColor(1)).toBe("text-green-600 dark:text-green-400");
    });

    it("returns blue for grade 2", () => {
      expect(getGradeColor(2)).toBe("text-blue-600 dark:text-blue-400");
    });

    it("returns orange for grade 3", () => {
      expect(getGradeColor(3)).toBe("text-orange-600 dark:text-orange-400");
    });

    it("returns red for grade 4", () => {
      expect(getGradeColor(4)).toBe("text-red-600 dark:text-red-400");
    });

    it("returns gray for unknown grade", () => {
      expect(getGradeColor(99 as ImportanceGrade)).toBe("text-gray-600 dark:text-gray-400");
    });
  });

  describe("getGradeBgColor", () => {
    it("returns yellow bg for grade 0", () => {
      expect(getGradeBgColor(0)).toBe("bg-yellow-50 dark:bg-yellow-900/20");
    });

    it("returns green bg for grade 1", () => {
      expect(getGradeBgColor(1)).toBe("bg-green-50 dark:bg-green-900/20");
    });

    it("returns blue bg for grade 2", () => {
      expect(getGradeBgColor(2)).toBe("bg-blue-50 dark:bg-blue-900/20");
    });

    it("returns orange bg for grade 3", () => {
      expect(getGradeBgColor(3)).toBe("bg-orange-50 dark:bg-orange-900/20");
    });

    it("returns red bg for grade 4", () => {
      expect(getGradeBgColor(4)).toBe("bg-red-50 dark:bg-red-900/20");
    });

    it("returns gray bg for unknown grade", () => {
      expect(getGradeBgColor(99 as ImportanceGrade)).toBe("bg-gray-50 dark:bg-gray-900/20");
    });
  });

  describe("Type interfaces", () => {
    it("GradeInput has correct shape", () => {
      const input: GradeInput = {
        score: 50,
        isBirthdaySpecial: true,
        crossVerified: true,
        sajuPositive: true,
        astroPositive: true,
        totalStrengthCount: 5,
        sajuBadCount: 0,
        hasChung: false,
        hasXing: false,
        hasNoMajorRetrograde: true,
        retrogradeCount: 0,
        totalBadCount: 0,
      };

      expect(input.score).toBe(50);
      expect(input.isBirthdaySpecial).toBe(true);
    });

    it("GradeResult has correct shape", () => {
      const result: GradeResult = {
        grade: 1,
        adjustedScore: 65,
        gradeBonus: 5,
      };

      expect(result.grade).toBe(1);
      expect(result.adjustedScore).toBe(65);
      expect(result.gradeBonus).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("handles zero score", () => {
      expect(calculateGrade(0)).toBe(4);
    });

    it("handles negative score", () => {
      expect(calculateGrade(-10)).toBe(4);
    });

    it("handles very high score", () => {
      expect(calculateGrade(100)).toBe(0);
    });

    it("handles boundary score 68", () => {
      expect(calculateGrade(68)).toBe(0);
      expect(calculateGrade(67)).toBe(1);
    });

    it("handles boundary score 62", () => {
      expect(calculateGrade(62)).toBe(1);
      expect(calculateGrade(61)).toBe(2);
    });

    it("handles boundary score 42", () => {
      expect(calculateGrade(42)).toBe(2);
      expect(calculateGrade(41)).toBe(3);
    });

    it("handles boundary score 28", () => {
      expect(calculateGrade(28)).toBe(3);
      expect(calculateGrade(27)).toBe(4);
    });
  });
});
