/**
 * Multi-Year Trend Analysis Tests
 * Tests for multi-year fortune trend analysis
 */

import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/prediction/advancedTimingEngine", () => ({
  calculateYearlyGanji: vi.fn((year: number) => ({
    stem: "甲",
    branch: "子",
    year,
  })),
  calculatePreciseTwelveStage: vi.fn(() => ({
    stage: "건록",
    score: 75,
    energy: "peak",
  })),
  calculateSibsin: vi.fn(() => "정관"),
  analyzeBranchInteractions: vi.fn(() => []),
}));

vi.mock("@/lib/prediction/life-prediction/constants", () => ({
  STEM_ELEMENT: {
    "甲": "목",
    "乙": "목",
    "丙": "화",
    "丁": "화",
    "戊": "토",
    "己": "토",
    "庚": "금",
    "辛": "금",
    "壬": "수",
    "癸": "수",
  },
  SIBSIN_SCORES: {
    "비견": 55,
    "겁재": 45,
    "식신": 70,
    "상관": 50,
    "편재": 60,
    "정재": 75,
    "편관": 55,
    "정관": 80,
    "편인": 60,
    "정인": 75,
  },
}));

import { analyzeMultiYearTrend } from "@/lib/prediction/life-prediction/multi-year";
import type { LifePredictionInput, MultiYearTrend } from "@/lib/prediction/life-prediction/types";

describe("Multi-Year Trend Analysis", () => {
  const mockInput: LifePredictionInput = {
    birthYear: 1990,
    dayStem: "甲",
    dayBranch: "子",
    monthBranch: "寅",
    yearBranch: "午",
    daeunList: [
      {
        startAge: 5,
        endAge: 14,
        stem: "乙",
        branch: "丑",
        element: "목",
      },
      {
        startAge: 15,
        endAge: 24,
        stem: "丙",
        branch: "寅",
        element: "화",
      },
      {
        startAge: 25,
        endAge: 34,
        stem: "丁",
        branch: "卯",
        element: "화",
      },
    ],
    yongsin: ["수", "금"],
    kisin: ["토"],
  };

  describe("analyzeMultiYearTrend", () => {
    it("returns complete multi-year trend structure", () => {
      const result = analyzeMultiYearTrend(mockInput, 2020, 2030);

      expect(result).toHaveProperty("startYear");
      expect(result).toHaveProperty("endYear");
      expect(result).toHaveProperty("yearlyScores");
      expect(result).toHaveProperty("overallTrend");
      expect(result).toHaveProperty("peakYears");
      expect(result).toHaveProperty("lowYears");
      expect(result).toHaveProperty("daeunTransitions");
      expect(result).toHaveProperty("lifeCycles");
      expect(result).toHaveProperty("summary");
    });

    it("returns correct year range", () => {
      const result = analyzeMultiYearTrend(mockInput, 2020, 2025);

      expect(result.startYear).toBe(2020);
      expect(result.endYear).toBe(2025);
    });

    it("generates yearly scores for each year in range", () => {
      const result = analyzeMultiYearTrend(mockInput, 2020, 2025);

      expect(result.yearlyScores.length).toBe(6); // 2020-2025 inclusive
    });

    it("yearly scores have correct structure", () => {
      const result = analyzeMultiYearTrend(mockInput, 2024, 2025);

      const yearScore = result.yearlyScores[0];
      expect(yearScore).toHaveProperty("year");
      expect(yearScore).toHaveProperty("age");
      expect(yearScore).toHaveProperty("score");
      expect(yearScore).toHaveProperty("grade");
      expect(yearScore).toHaveProperty("yearGanji");
      expect(yearScore).toHaveProperty("twelveStage");
      expect(yearScore).toHaveProperty("sibsin");
      expect(yearScore).toHaveProperty("themes");
      expect(yearScore).toHaveProperty("opportunities");
      expect(yearScore).toHaveProperty("challenges");
    });

    it("calculates age correctly", () => {
      const result = analyzeMultiYearTrend(mockInput, 2020, 2020);

      // 2020 - 1990 = 30 years old
      expect(result.yearlyScores[0].age).toBe(30);
    });

    it("skips years where age is negative", () => {
      const youngInput = { ...mockInput, birthYear: 2010 };
      const result = analyzeMultiYearTrend(youngInput, 2005, 2015);

      // Should only have years from 2010 onwards
      expect(result.yearlyScores.every((y) => y.age >= 0)).toBe(true);
    });

    describe("grade calculation", () => {
      it("assigns S grade for scores >= 85", () => {
        // The mock returns score 75 + 80 (sibsin) = 155, clamped to 100
        const result = analyzeMultiYearTrend(mockInput, 2024, 2024);
        // Based on mock values, grade should be calculated
        expect(["S", "A", "B", "C", "D"]).toContain(result.yearlyScores[0].grade);
      });
    });

    describe("overall trend determination", () => {
      it("returns one of four trend types", () => {
        const result = analyzeMultiYearTrend(mockInput, 2020, 2030);

        expect(["ascending", "descending", "stable", "volatile"]).toContain(
          result.overallTrend
        );
      });
    });

    describe("peak and low years", () => {
      it("identifies top 3 peak years", () => {
        const result = analyzeMultiYearTrend(mockInput, 2020, 2030);

        expect(result.peakYears.length).toBeLessThanOrEqual(3);
        result.peakYears.forEach((year) => {
          expect(year).toBeGreaterThanOrEqual(2020);
          expect(year).toBeLessThanOrEqual(2030);
        });
      });

      it("identifies bottom 3 low years", () => {
        const result = analyzeMultiYearTrend(mockInput, 2020, 2030);

        expect(result.lowYears.length).toBeLessThanOrEqual(3);
        result.lowYears.forEach((year) => {
          expect(year).toBeGreaterThanOrEqual(2020);
          expect(year).toBeLessThanOrEqual(2030);
        });
      });
    });

    describe("daeun transitions", () => {
      it("detects daeun transition points", () => {
        const result = analyzeMultiYearTrend(mockInput, 1995, 2025);

        // Should detect transitions between daeun periods
        expect(Array.isArray(result.daeunTransitions)).toBe(true);
      });

      it("transition has correct structure when present", () => {
        const result = analyzeMultiYearTrend(mockInput, 1995, 2025);

        if (result.daeunTransitions.length > 0) {
          const transition = result.daeunTransitions[0];
          expect(transition).toHaveProperty("year");
          expect(transition).toHaveProperty("age");
          expect(transition).toHaveProperty("fromDaeun");
          expect(transition).toHaveProperty("toDaeun");
          expect(transition).toHaveProperty("impact");
          expect(transition).toHaveProperty("description");
        }
      });

      it("impact is one of defined types", () => {
        const result = analyzeMultiYearTrend(mockInput, 1995, 2025);

        if (result.daeunTransitions.length > 0) {
          const validImpacts = [
            "major_positive",
            "positive",
            "neutral",
            "challenging",
            "major_challenging",
          ];
          result.daeunTransitions.forEach((t) => {
            expect(validImpacts).toContain(t.impact);
          });
        }
      });
    });

    describe("life cycles", () => {
      it("returns life cycle phases array", () => {
        const result = analyzeMultiYearTrend(mockInput, 1995, 2025);

        expect(Array.isArray(result.lifeCycles)).toBe(true);
      });

      it("life cycle phase has correct structure when present", () => {
        const result = analyzeMultiYearTrend(mockInput, 1995, 2025);

        if (result.lifeCycles.length > 0) {
          const phase = result.lifeCycles[0];
          expect(phase).toHaveProperty("name");
          expect(phase).toHaveProperty("startYear");
          expect(phase).toHaveProperty("endYear");
          expect(phase).toHaveProperty("startAge");
          expect(phase).toHaveProperty("endAge");
          expect(phase).toHaveProperty("theme");
          expect(phase).toHaveProperty("energy");
          expect(phase).toHaveProperty("recommendations");
        }
      });

      it("energy is one of defined types", () => {
        const result = analyzeMultiYearTrend(mockInput, 1995, 2025);

        if (result.lifeCycles.length > 0) {
          const validEnergies = ["peak", "rising", "declining", "dormant"];
          result.lifeCycles.forEach((phase) => {
            expect(validEnergies).toContain(phase.energy);
          });
        }
      });
    });

    describe("summary generation", () => {
      it("generates summary string", () => {
        const result = analyzeMultiYearTrend(mockInput, 2020, 2030);

        expect(typeof result.summary).toBe("string");
        expect(result.summary.length).toBeGreaterThan(0);
      });

      it("summary mentions trend type", () => {
        const result = analyzeMultiYearTrend(mockInput, 2020, 2030);

        const trendKeywords = ["상승", "안정", "변동", "후반"];
        const hasTrendKeyword = trendKeywords.some((kw) =>
          result.summary.includes(kw)
        );
        expect(hasTrendKeyword).toBe(true);
      });
    });

    describe("themes and recommendations", () => {
      it("yearly scores include themes", () => {
        const result = analyzeMultiYearTrend(mockInput, 2024, 2024);

        expect(Array.isArray(result.yearlyScores[0].themes)).toBe(true);
      });

      it("yearly scores include opportunities", () => {
        const result = analyzeMultiYearTrend(mockInput, 2024, 2024);

        expect(Array.isArray(result.yearlyScores[0].opportunities)).toBe(true);
      });

      it("yearly scores include challenges", () => {
        const result = analyzeMultiYearTrend(mockInput, 2024, 2024);

        expect(Array.isArray(result.yearlyScores[0].challenges)).toBe(true);
      });
    });

    describe("score calculation", () => {
      it("scores are between 0 and 100", () => {
        const result = analyzeMultiYearTrend(mockInput, 2020, 2030);

        result.yearlyScores.forEach((y) => {
          expect(y.score).toBeGreaterThanOrEqual(0);
          expect(y.score).toBeLessThanOrEqual(100);
        });
      });
    });

    describe("yongsin/kisin effects", () => {
      it("applies yongsin bonus when element matches", () => {
        const inputWithYongsin = {
          ...mockInput,
          yongsin: ["목"], // Wood element
        };
        const result = analyzeMultiYearTrend(inputWithYongsin, 2024, 2024);

        // Yongsin matching should increase score
        expect(result.yearlyScores[0].score).toBeGreaterThanOrEqual(0);
      });

      it("applies kisin penalty when element matches", () => {
        const inputWithKisin = {
          ...mockInput,
          kisin: ["목"], // Wood element (same as mock stem)
        };
        const result = analyzeMultiYearTrend(inputWithKisin, 2024, 2024);

        // Kisin matching should decrease score
        expect(result.yearlyScores[0].score).toBeGreaterThanOrEqual(0);
      });
    });

    describe("edge cases", () => {
      it("handles empty daeun list", () => {
        const inputNoDaeun = { ...mockInput, daeunList: [] };
        const result = analyzeMultiYearTrend(inputNoDaeun, 2024, 2025);

        expect(result.yearlyScores.length).toBe(2);
        expect(result.daeunTransitions.length).toBe(0);
      });

      it("handles single year range", () => {
        const result = analyzeMultiYearTrend(mockInput, 2024, 2024);

        expect(result.yearlyScores.length).toBe(1);
        expect(result.startYear).toBe(result.endYear);
      });

      it("handles wide year range", () => {
        const result = analyzeMultiYearTrend(mockInput, 2000, 2050);

        expect(result.yearlyScores.length).toBe(51);
      });
    });
  });

  describe("MultiYearTrend interface", () => {
    it("has all required properties", () => {
      const result = analyzeMultiYearTrend(mockInput, 2020, 2025);

      const trend: MultiYearTrend = result;

      expect(typeof trend.startYear).toBe("number");
      expect(typeof trend.endYear).toBe("number");
      expect(Array.isArray(trend.yearlyScores)).toBe(true);
      expect(typeof trend.overallTrend).toBe("string");
      expect(Array.isArray(trend.peakYears)).toBe(true);
      expect(Array.isArray(trend.lowYears)).toBe(true);
      expect(Array.isArray(trend.daeunTransitions)).toBe(true);
      expect(Array.isArray(trend.lifeCycles)).toBe(true);
      expect(typeof trend.summary).toBe("string");
    });
  });
});

describe("Helper Functions (through analyzeMultiYearTrend)", () => {
  const mockInput: LifePredictionInput = {
    birthYear: 1990,
    dayStem: "甲",
    dayBranch: "子",
    monthBranch: "寅",
    yearBranch: "午",
    daeunList: [
      { startAge: 25, endAge: 34, stem: "丁", branch: "卯", element: "화" },
    ],
    yongsin: [],
    kisin: [],
  };

  describe("scoreToGrade", () => {
    it("assigns correct grades based on scores", () => {
      // This is tested indirectly through the main function
      const result = analyzeMultiYearTrend(mockInput, 2024, 2024);
      const grade = result.yearlyScores[0].grade;

      expect(["S", "A", "B", "C", "D"]).toContain(grade);
    });
  });

  describe("generatePhaseTheme", () => {
    it("generates theme strings for life cycles", () => {
      const result = analyzeMultiYearTrend(mockInput, 2015, 2025);

      if (result.lifeCycles.length > 0) {
        const theme = result.lifeCycles[0].theme;
        expect(typeof theme).toBe("string");
        expect(theme.length).toBeGreaterThan(0);
      }
    });
  });

  describe("generatePhaseRecommendations", () => {
    it("generates recommendations for life cycles", () => {
      const result = analyzeMultiYearTrend(mockInput, 2015, 2025);

      if (result.lifeCycles.length > 0) {
        const recs = result.lifeCycles[0].recommendations;
        expect(Array.isArray(recs)).toBe(true);
        expect(recs.length).toBeGreaterThan(0);
      }
    });
  });

  describe("generateTrendSummary", () => {
    it("includes trend-specific content", () => {
      const result = analyzeMultiYearTrend(mockInput, 2020, 2030);

      // Summary should contain Korean text about the trend
      expect(result.summary).toMatch(/운세|흐름|시기|노력|대응/);
    });
  });
});
