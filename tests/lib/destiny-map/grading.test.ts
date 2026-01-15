/**
 * Destiny Calendar Grading Tests
 *
 * Tests for grade calculation and related functions
 */


import {
  calculateGrade,
  getGradeKeys,
  getGradeRecommendations,
  filterWarningsByGrade,
  type GradeInput,
  type GradeResult,
} from "@/lib/destiny-map/calendar/grading";

describe("calculateGrade", () => {
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

  describe("grade 0 (best day)", () => {
    it("returns grade 0 for high score without chung/xing", () => {
      const input: GradeInput = { ...baseInput, score: 75 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(0);
    });

    it("does not return grade 0 if hasChung is true", () => {
      const input: GradeInput = { ...baseInput, score: 75, hasChung: true };
      const result = calculateGrade(input);
      expect(result.grade).not.toBe(0);
    });

    it("does not return grade 0 if hasXing is true", () => {
      const input: GradeInput = { ...baseInput, score: 75, hasXing: true };
      const result = calculateGrade(input);
      expect(result.grade).not.toBe(0);
    });
  });

  describe("grade 1 (good day)", () => {
    it("returns grade 1 for score 65-71", () => {
      const input: GradeInput = { ...baseInput, score: 68 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(1);
    });

    it("returns grade 1 for score 65 exactly", () => {
      const input: GradeInput = { ...baseInput, score: 65 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(1);
    });
  });

  describe("grade 2 (normal day)", () => {
    it("returns grade 2 for score 45-64", () => {
      const input: GradeInput = { ...baseInput, score: 55 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(2);
    });

    it("returns grade 2 for score 45 exactly", () => {
      const input: GradeInput = { ...baseInput, score: 45 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(2);
    });

    it("returns grade 2 for score 64 exactly", () => {
      const input: GradeInput = { ...baseInput, score: 64 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(2);
    });
  });

  describe("grade 3 (bad day)", () => {
    it("returns grade 3 for score 30-44", () => {
      const input: GradeInput = { ...baseInput, score: 35 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(3);
    });

    it("returns grade 3 for score 30 exactly", () => {
      const input: GradeInput = { ...baseInput, score: 30 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(3);
    });
  });

  describe("grade 4 (worst day)", () => {
    it("returns grade 4 for score below 30", () => {
      const input: GradeInput = { ...baseInput, score: 25 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(4);
    });

    it("returns grade 4 for very low score", () => {
      const input: GradeInput = { ...baseInput, score: 10 };
      const result = calculateGrade(input);
      expect(result.grade).toBe(4);
    });
  });

  describe("bonus conditions", () => {
    it("adds +2 for birthday special", () => {
      const input: GradeInput = { ...baseInput, score: 50, isBirthdaySpecial: true };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBeGreaterThanOrEqual(2);
    });

    it("adds +2 for cross verified positive", () => {
      const input: GradeInput = {
        ...baseInput,
        score: 50,
        crossVerified: true,
        sajuPositive: true,
        astroPositive: true,
      };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBe(2);
    });

    it("adds +1 for high strength count with no bad saju", () => {
      const input: GradeInput = {
        ...baseInput,
        score: 50,
        totalStrengthCount: 5,
        sajuBadCount: 0,
      };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBe(1);
    });

    it("combines multiple bonuses", () => {
      const input: GradeInput = {
        ...baseInput,
        score: 50,
        isBirthdaySpecial: true,
        crossVerified: true,
        sajuPositive: true,
        astroPositive: true,
        totalStrengthCount: 5,
        sajuBadCount: 0,
      };
      const result = calculateGrade(input);
      // 2 + 2 + 1 = 5, but capped at 4
      expect(result.gradeBonus).toBe(4);
    });
  });

  describe("penalty conditions", () => {
    it("subtracts -4 for both chung and xing", () => {
      const input: GradeInput = { ...baseInput, score: 50, hasChung: true, hasXing: true };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBe(-4);
    });

    it("subtracts -2 for chung only", () => {
      const input: GradeInput = { ...baseInput, score: 50, hasChung: true };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBe(-2);
    });

    it("subtracts -2 for xing only", () => {
      const input: GradeInput = { ...baseInput, score: 50, hasXing: true };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBe(-2);
    });

    it("subtracts -3 for 3+ bad counts", () => {
      const input: GradeInput = { ...baseInput, score: 50, totalBadCount: 3 };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBe(-3);
    });

    it("subtracts -2 for multiple retrogrades without major", () => {
      const input: GradeInput = {
        ...baseInput,
        score: 50,
        hasNoMajorRetrograde: false,
        retrogradeCount: 2,
      };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBe(-2);
    });
  });

  describe("bonus/penalty limits", () => {
    it("caps bonus at +4", () => {
      const input: GradeInput = {
        ...baseInput,
        score: 50,
        isBirthdaySpecial: true,
        crossVerified: true,
        sajuPositive: true,
        astroPositive: true,
        totalStrengthCount: 10,
        sajuBadCount: 0,
      };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBeLessThanOrEqual(4);
    });

    it("caps penalty at -6", () => {
      const input: GradeInput = {
        ...baseInput,
        score: 50,
        hasChung: true,
        hasXing: true,
        totalBadCount: 5,
        hasNoMajorRetrograde: false,
        retrogradeCount: 3,
      };
      const result = calculateGrade(input);
      expect(result.gradeBonus).toBeGreaterThanOrEqual(-6);
    });
  });

  describe("adjusted score", () => {
    it("calculates adjusted score correctly", () => {
      const input: GradeInput = { ...baseInput, score: 50, isBirthdaySpecial: true };
      const result = calculateGrade(input);
      expect(result.adjustedScore).toBe(50 + result.gradeBonus);
    });
  });
});

describe("getGradeKeys", () => {
  it("returns bestDay keys for grade 0", () => {
    const keys = getGradeKeys(0);
    expect(keys.titleKey).toBe("calendar.bestDay");
    expect(keys.descKey).toBe("calendar.bestDayDesc");
  });

  it("returns goodDay keys for grade 1", () => {
    const keys = getGradeKeys(1);
    expect(keys.titleKey).toBe("calendar.goodDay");
    expect(keys.descKey).toBe("calendar.goodDayDesc");
  });

  it("returns normalDay keys for grade 2", () => {
    const keys = getGradeKeys(2);
    expect(keys.titleKey).toBe("calendar.normalDay");
    expect(keys.descKey).toBe("calendar.normalDayDesc");
  });

  it("returns badDay keys for grade 3", () => {
    const keys = getGradeKeys(3);
    expect(keys.titleKey).toBe("calendar.badDay");
    expect(keys.descKey).toBe("calendar.badDayDesc");
  });

  it("returns worstDay keys for grade 4", () => {
    const keys = getGradeKeys(4);
    expect(keys.titleKey).toBe("calendar.worstDay");
    expect(keys.descKey).toBe("calendar.worstDayDesc");
  });
});

describe("getGradeRecommendations", () => {
  it("returns major recommendations for grade 0", () => {
    const recs = getGradeRecommendations(0);
    expect(recs).toContain("majorDecision");
    expect(recs).toContain("wedding");
    expect(recs).toContain("contract");
    expect(recs).toContain("bigDecision");
  });

  it("returns fewer recommendations for grade 1", () => {
    const recs = getGradeRecommendations(1);
    expect(recs).toContain("majorDecision");
    expect(recs).toContain("contract");
    expect(recs).not.toContain("wedding");
  });

  it("returns empty array for grade 2", () => {
    const recs = getGradeRecommendations(2);
    expect(recs).toEqual([]);
  });

  it("returns rest recommendations for grade 3", () => {
    const recs = getGradeRecommendations(3);
    expect(recs).toContain("rest");
    expect(recs).toContain("meditation");
  });

  it("returns avoid recommendations for grade 4", () => {
    const recs = getGradeRecommendations(4);
    expect(recs).toContain("rest");
    expect(recs).toContain("meditation");
    expect(recs).toContain("avoidBigDecisions");
  });
});

describe("filterWarningsByGrade", () => {
  it("removes all warnings for grade 0", () => {
    const warnings = ["conflict", "accident", "caution"];
    const filtered = filterWarningsByGrade(0, warnings);
    expect(filtered).toEqual([]);
  });

  it("removes all warnings for grade 1", () => {
    const warnings = ["conflict", "accident", "caution"];
    const filtered = filterWarningsByGrade(1, warnings);
    expect(filtered).toEqual([]);
  });

  it("removes severe warnings for grade 2", () => {
    const warnings = ["extremeCaution", "conflict", "mild"];
    const filtered = filterWarningsByGrade(2, warnings);
    expect(filtered).not.toContain("extremeCaution");
    expect(filtered).not.toContain("conflict");
    expect(filtered).toContain("mild");
  });

  it("adds default caution for grade 3 with no warnings", () => {
    const filtered = filterWarningsByGrade(3, []);
    expect(filtered).toContain("caution");
  });

  it("keeps warnings for grade 3 with warnings", () => {
    const warnings = ["minor"];
    const filtered = filterWarningsByGrade(3, warnings);
    expect(filtered).toContain("minor");
  });

  it("adds base warnings for grade 4", () => {
    const warnings = ["custom"];
    const filtered = filterWarningsByGrade(4, warnings);
    expect(filtered).toContain("extremeCaution");
    expect(filtered).toContain("health");
    expect(filtered).toContain("custom");
  });

  it("deduplicates warnings for grade 4", () => {
    const warnings = ["extremeCaution", "custom"];
    const filtered = filterWarningsByGrade(4, warnings);
    const extremeCount = filtered.filter(w => w === "extremeCaution").length;
    expect(extremeCount).toBe(1);
  });
});
