/**
 * Destiny Calendar Scoring Configuration Tests
 *
 * Tests for scoring system constants and helper functions
 */


import {
  CATEGORY_MAX_SCORES,
  DAEUN_SCORES,
  SEUN_SCORES,
  WOLUN_SCORES,
  ILJIN_SCORES,
  YONGSIN_SCORES,
  TRANSIT_SUN_SCORES,
  TRANSIT_MOON_SCORES,
  MAJOR_PLANETS_SCORES,
  LUNAR_PHASE_SCORES,
  SOLAR_RETURN_SCORES,
  CROSS_VERIFICATION_SCORES,
  GRADE_THRESHOLDS,
  normalizeToCategory,
  sumAndNormalize,
  calculateAdjustedScore,
} from "@/lib/destiny-map/calendar/scoring-config";

describe("CATEGORY_MAX_SCORES", () => {
  it("saju total equals 50", () => {
    const { daeun, seun, wolun, iljin, yongsin } = CATEGORY_MAX_SCORES.saju;
    expect(daeun + seun + wolun + iljin + yongsin).toBe(50);
    expect(CATEGORY_MAX_SCORES.saju.total).toBe(50);
  });

  it("astro total equals 50", () => {
    const { transitSun, transitMoon, majorPlanets, lunarPhase, solarReturn } = CATEGORY_MAX_SCORES.astro;
    expect(transitSun + transitMoon + majorPlanets + lunarPhase + solarReturn).toBe(50);
    expect(CATEGORY_MAX_SCORES.astro.total).toBe(50);
  });

  it("grand total equals 100", () => {
    expect(CATEGORY_MAX_SCORES.grandTotal).toBe(100);
  });

  it("cross bonus is 3", () => {
    expect(CATEGORY_MAX_SCORES.crossBonus).toBe(3);
  });
});

describe("DAEUN_SCORES", () => {
  it("has positive scores", () => {
    expect(DAEUN_SCORES.positive.inseong).toBeGreaterThan(0);
    expect(DAEUN_SCORES.positive.jaeseong).toBeGreaterThan(0);
    expect(DAEUN_SCORES.positive.bijeon).toBeGreaterThan(0);
  });

  it("has negative scores", () => {
    expect(DAEUN_SCORES.negative.chung).toBeLessThan(0);
    expect(DAEUN_SCORES.negative.gwansal).toBeLessThan(0);
  });

  it("has maxRaw defined", () => {
    expect(DAEUN_SCORES.maxRaw).toBe(0.5);
  });
});

describe("SEUN_SCORES", () => {
  it("has samjae special handling", () => {
    expect(SEUN_SCORES.samjae.base).toBeLessThan(0);
    expect(SEUN_SCORES.samjae.withChung).toBeLessThan(SEUN_SCORES.samjae.base);
    expect(SEUN_SCORES.samjae.withGwiin).toBeGreaterThan(0);
  });
});

describe("ILJIN_SCORES", () => {
  it("sipsin has both positive and negative values", () => {
    expect(ILJIN_SCORES.sipsin.jeongyin).toBeGreaterThan(0);
    expect(ILJIN_SCORES.sipsin.sanggwan).toBeLessThan(0);
    expect(ILJIN_SCORES.sipsin.pyeonwan).toBeLessThan(0);
  });

  it("branch has yukhap and chung", () => {
    expect(ILJIN_SCORES.branch.yukhap).toBeGreaterThan(0);
    expect(ILJIN_SCORES.branch.chung).toBeLessThan(0);
  });

  it("special has high value for cheoneulGwiin", () => {
    expect(ILJIN_SCORES.special.cheoneulGwiin).toBeGreaterThanOrEqual(0.3);
  });

  it("negative has gongmang and backho", () => {
    expect(ILJIN_SCORES.negative.gongmang).toBeLessThan(0);
    expect(ILJIN_SCORES.negative.backho).toBeLessThan(0);
  });
});

describe("TRANSIT_SUN_SCORES", () => {
  it("same element gives positive score", () => {
    expect(TRANSIT_SUN_SCORES.elementRelation.same).toBeGreaterThan(0);
  });

  it("controlledBy gives negative score", () => {
    expect(TRANSIT_SUN_SCORES.elementRelation.controlledBy).toBeLessThan(0);
  });
});

describe("MAJOR_PLANETS_SCORES", () => {
  it("jupiter has highest weight", () => {
    expect(MAJOR_PLANETS_SCORES.weights.jupiter).toBeGreaterThan(MAJOR_PLANETS_SCORES.weights.mercury);
    expect(MAJOR_PLANETS_SCORES.weights.jupiter).toBeGreaterThan(MAJOR_PLANETS_SCORES.weights.venus);
  });

  it("conjunction and trine are positive aspects", () => {
    expect(MAJOR_PLANETS_SCORES.aspects.conjunction).toBeGreaterThan(0);
    expect(MAJOR_PLANETS_SCORES.aspects.trine).toBeGreaterThan(0);
  });

  it("square and opposition are negative aspects", () => {
    expect(MAJOR_PLANETS_SCORES.aspects.square).toBeLessThan(0);
    expect(MAJOR_PLANETS_SCORES.aspects.opposition).toBeLessThan(0);
  });

  it("all retrograde values are negative", () => {
    expect(MAJOR_PLANETS_SCORES.retrograde.mercury).toBeLessThan(0);
    expect(MAJOR_PLANETS_SCORES.retrograde.venus).toBeLessThan(0);
    expect(MAJOR_PLANETS_SCORES.retrograde.mars).toBeLessThan(0);
  });

  it("mercury retrograde has highest penalty", () => {
    expect(Math.abs(MAJOR_PLANETS_SCORES.retrograde.mercury)).toBeGreaterThan(
      Math.abs(MAJOR_PLANETS_SCORES.retrograde.jupiter)
    );
  });
});

describe("LUNAR_PHASE_SCORES", () => {
  it("full moon has highest positive score", () => {
    expect(LUNAR_PHASE_SCORES.fullMoon).toBeGreaterThan(LUNAR_PHASE_SCORES.newMoon);
  });

  it("quarters have negative scores", () => {
    expect(LUNAR_PHASE_SCORES.firstQuarter).toBeLessThan(0);
    expect(LUNAR_PHASE_SCORES.lastQuarter).toBeLessThan(0);
  });
});

describe("SOLAR_RETURN_SCORES", () => {
  it("exact birthday has highest score", () => {
    expect(SOLAR_RETURN_SCORES.exactBirthday).toBeGreaterThan(SOLAR_RETURN_SCORES.nearBirthday1);
    expect(SOLAR_RETURN_SCORES.nearBirthday1).toBeGreaterThan(SOLAR_RETURN_SCORES.nearBirthday3);
  });
});

describe("CROSS_VERIFICATION_SCORES", () => {
  it("both positive gives bonus", () => {
    expect(CROSS_VERIFICATION_SCORES.bothPositive).toBeGreaterThan(0);
  });

  it("both negative gives penalty", () => {
    expect(CROSS_VERIFICATION_SCORES.bothNegative).toBeLessThan(0);
  });

  it("thresholds are properly defined", () => {
    expect(CROSS_VERIFICATION_SCORES.positiveThreshold).toBeGreaterThan(
      CROSS_VERIFICATION_SCORES.negativeThreshold
    );
  });
});

describe("GRADE_THRESHOLDS", () => {
  it("grade0 is highest threshold", () => {
    expect(GRADE_THRESHOLDS.grade0).toBeGreaterThan(GRADE_THRESHOLDS.grade1);
  });

  it("thresholds are in descending order", () => {
    expect(GRADE_THRESHOLDS.grade0).toBeGreaterThan(GRADE_THRESHOLDS.grade1);
    expect(GRADE_THRESHOLDS.grade1).toBeGreaterThan(GRADE_THRESHOLDS.grade2);
    expect(GRADE_THRESHOLDS.grade2).toBeGreaterThan(GRADE_THRESHOLDS.grade3);
  });

  it("grade0 is 72", () => {
    expect(GRADE_THRESHOLDS.grade0).toBe(72);
  });
});

describe("normalizeToCategory", () => {
  it("returns mid-point for zero raw score", () => {
    const result = normalizeToCategory(0, 0.5, 10);
    expect(result).toBe(5); // 50% of categoryMax
  });

  it("returns max for max positive raw score", () => {
    const result = normalizeToCategory(0.5, 0.5, 10);
    expect(result).toBe(10);
  });

  it("returns 0 for max negative raw score", () => {
    const result = normalizeToCategory(-0.5, 0.5, 10);
    expect(result).toBe(0);
  });

  it("clamps values outside range", () => {
    const result1 = normalizeToCategory(1.0, 0.5, 10);
    expect(result1).toBe(10);

    const result2 = normalizeToCategory(-1.0, 0.5, 10);
    expect(result2).toBe(0);
  });

  it("handles different category max values", () => {
    const result = normalizeToCategory(0.25, 0.5, 20);
    expect(result).toBe(15); // 75% of 20
  });
});

describe("sumAndNormalize", () => {
  it("sums scores and normalizes", () => {
    const scores = [0.1, 0.2, 0.1];
    const result = sumAndNormalize(scores, 0.5, 10);
    expect(result).toBeGreaterThan(5); // Should be above midpoint
    expect(result).toBeLessThanOrEqual(10);
  });

  it("handles empty array", () => {
    const result = sumAndNormalize([], 0.5, 10);
    expect(result).toBe(5); // Midpoint
  });

  it("handles negative sum", () => {
    const scores = [-0.2, -0.1, 0.05];
    const result = sumAndNormalize(scores, 0.5, 10);
    expect(result).toBeLessThan(5); // Below midpoint
  });
});

describe("calculateAdjustedScore", () => {
  it("returns base score (45%) with no adjustments", () => {
    const result = calculateAdjustedScore(10, []);
    expect(result).toBe(4.5); // 45% of 10
  });

  it("increases score with positive adjustments", () => {
    const result = calculateAdjustedScore(10, [0.1, 0.1]);
    expect(result).toBeGreaterThan(4.5);
  });

  it("decreases score with negative adjustments", () => {
    const result = calculateAdjustedScore(10, [-0.1, -0.1]);
    expect(result).toBeLessThan(4.5);
  });

  it("clamps to 0 minimum", () => {
    const result = calculateAdjustedScore(10, [-1, -1, -1]);
    expect(result).toBe(0);
  });

  it("clamps to category maximum", () => {
    const result = calculateAdjustedScore(10, [1, 1, 1]);
    expect(result).toBe(10);
  });

  it("applies 2.2x amplification", () => {
    // totalAdj = 0.1, amplified = 0.22, adjScore = 2.2
    // baseScore = 4.5, final = 4.5 + 2.2 = 6.7
    const result = calculateAdjustedScore(10, [0.1]);
    expect(result).toBeCloseTo(6.7, 1);
  });

  it("handles mixed positive and negative adjustments", () => {
    const result = calculateAdjustedScore(10, [0.2, -0.1]);
    // totalAdj = 0.1, same as single 0.1 adjustment
    expect(result).toBeCloseTo(6.7, 1);
  });
});
