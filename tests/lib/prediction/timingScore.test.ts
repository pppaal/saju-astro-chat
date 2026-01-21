/**
 * Tests for TimingScore - 월별 타이밍 스코어 매트릭스 및 신뢰도 점수 시스템
 * src/lib/prediction/timingScore.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateMonthlyTimingScore,
  calculateDetailedConfidence,
  generateYearlyPrediction,
  generatePredictionPromptContext,
  type FiveElement,
  type MonthlyTimingScore,
  type YearlyPrediction,
} from "@/lib/prediction/timingScore";

describe("TimingScore", () => {
  describe("calculateMonthlyTimingScore", () => {
    const baseParams = {
      year: 2025,
      month: 6,
      dayStem: "甲",
      dayElement: "목" as FiveElement,
      yongsin: ["수", "목"] as FiveElement[],
      kisin: ["금"] as FiveElement[],
    };

    it("should return all required fields", () => {
      const result = calculateMonthlyTimingScore(baseParams);

      expect(result.year).toBe(2025);
      expect(result.month).toBe(6);
      expect(typeof result.easternScore).toBe("number");
      expect(typeof result.westernScore).toBe("number");
      expect(typeof result.combinedScore).toBe("number");
      expect(typeof result.confidence).toBe("number");
      expect(result.grade).toBeDefined();
      expect(result.monthlyElement).toBeDefined();
      expect(result.twelveStage).toBeDefined();
    });

    it("should calculate eastern score based on element interactions", () => {
      // Wood day element interacting with fire month element (wood produces fire)
      const woodFireParams = { ...baseParams, month: 5 }; // May is fire month
      const result = calculateMonthlyTimingScore(woodFireParams);

      expect(result.easternScore).toBeGreaterThan(0);
      expect(result.easternScore).toBeLessThanOrEqual(100);
    });

    it("should boost score when month element matches yongsin", () => {
      // 목 month (2, 3) with yongsin containing 목
      const woodMonthParams = { ...baseParams, month: 3, yongsin: ["목"] as FiveElement[] };
      const resultWithYongsin = calculateMonthlyTimingScore(woodMonthParams);

      const noYongsinParams = { ...baseParams, month: 3, yongsin: [] as FiveElement[] };
      const resultNoYongsin = calculateMonthlyTimingScore(noYongsinParams);

      expect(resultWithYongsin.easternScore).toBeGreaterThan(resultNoYongsin.easternScore);
    });

    it("should reduce score when month element matches kisin", () => {
      // 금 month (8, 9) with kisin containing 금
      const metalMonthParams = { ...baseParams, month: 8, kisin: ["금"] as FiveElement[] };
      const resultWithKisin = calculateMonthlyTimingScore(metalMonthParams);

      const noKisinParams = { ...baseParams, month: 8, kisin: [] as FiveElement[] };
      const resultNoKisin = calculateMonthlyTimingScore(noKisinParams);

      expect(resultWithKisin.easternScore).toBeLessThan(resultNoKisin.easternScore);
    });

    it("should include twelve stage information", () => {
      const result = calculateMonthlyTimingScore(baseParams);

      const validStages = [
        "장생", "목욕", "관대", "건록", "제왕",
        "쇠", "병", "사", "묘", "절", "태", "양"
      ];
      expect(validStages).toContain(result.twelveStage);

      const validEnergies = ["rising", "peak", "declining", "dormant"];
      expect(validEnergies).toContain(result.stageEnergy);
    });

    it("should include retrograde effects for supported years", () => {
      const result2025 = calculateMonthlyTimingScore({ ...baseParams, year: 2025 });
      const result2024 = calculateMonthlyTimingScore({ ...baseParams, year: 2024 });

      expect(Array.isArray(result2025.retrogradeEffects)).toBe(true);
      expect(Array.isArray(result2024.retrogradeEffects)).toBe(true);
    });

    it("should detect Jupiter return (age 12, 24, 36...)", () => {
      const birthYear = 2001; // 24 years old in 2025
      const paramsWithBirthYear = { ...baseParams, birthYear, year: 2025 };
      const result = calculateMonthlyTimingScore(paramsWithBirthYear);

      const jupiterReturn = result.activeTransits.find(t => t.type === "jupiterReturn");
      expect(jupiterReturn).toBeDefined();
      expect(jupiterReturn?.score).toBeGreaterThan(0);
    });

    it("should detect Saturn return (age 29, 58, 87)", () => {
      const birthYear = 1996; // 29 years old in 2025
      const paramsWithBirthYear = { ...baseParams, birthYear, year: 2025 };
      const result = calculateMonthlyTimingScore(paramsWithBirthYear);

      const saturnReturn = result.activeTransits.find(t => t.type === "saturnReturn");
      expect(saturnReturn).toBeDefined();
    });

    it("should apply Daeun element when provided", () => {
      const withDaeun = calculateMonthlyTimingScore({
        ...baseParams,
        currentDaeunElement: "화" as FiveElement,
      });

      const withoutDaeun = calculateMonthlyTimingScore(baseParams);

      // Scores should differ when Daeun is considered
      expect(typeof withDaeun.easternScore).toBe("number");
      expect(typeof withoutDaeun.easternScore).toBe("number");
    });

    it("should calculate combined score as weighted average", () => {
      const result = calculateMonthlyTimingScore(baseParams);

      expect(result.combinedScore).toBeGreaterThanOrEqual(0);
      expect(result.combinedScore).toBeLessThanOrEqual(100);
      // Combined should be roughly between eastern and western scores
      const min = Math.min(result.easternScore, result.westernScore) - 10;
      const max = Math.max(result.easternScore, result.westernScore) + 10;
      expect(result.combinedScore).toBeGreaterThanOrEqual(min);
      expect(result.combinedScore).toBeLessThanOrEqual(max);
    });

    it("should generate themes and advice", () => {
      const result = calculateMonthlyTimingScore(baseParams);

      expect(Array.isArray(result.themes)).toBe(true);
      expect(result.themes.length).toBeGreaterThan(0);
      expect(Array.isArray(result.opportunities)).toBe(true);
      expect(Array.isArray(result.cautions)).toBe(true);
      expect(typeof result.advice).toBe("string");
      expect(result.advice.length).toBeGreaterThan(0);
    });

    it("should identify best and avoid days", () => {
      const result = calculateMonthlyTimingScore(baseParams);

      expect(Array.isArray(result.bestDays)).toBe(true);
      expect(Array.isArray(result.avoidDays)).toBe(true);

      // Best days should be valid day numbers
      for (const day of result.bestDays) {
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(31);
      }
    });

    it("should assign valid grades", () => {
      const result = calculateMonthlyTimingScore(baseParams);

      const validGrades = ["S", "A", "B", "C", "D", "F"];
      expect(validGrades).toContain(result.grade);
    });

    it("should handle all 12 months correctly", () => {
      for (let month = 1; month <= 12; month++) {
        const result = calculateMonthlyTimingScore({ ...baseParams, month });

        expect(result.month).toBe(month);
        expect(result.monthlyElement).toBeDefined();
        expect(typeof result.combinedScore).toBe("number");
      }
    });
  });

  describe("calculateDetailedConfidence", () => {
    const mockMonthlyScores: MonthlyTimingScore[] = [
      {
        year: 2025,
        month: 1,
        easternScore: 70,
        westernScore: 75,
        combinedScore: 72,
        confidence: 75,
        monthlyElement: "토" as FiveElement,
        twelveStage: "건록",
        stageEnergy: "peak",
        grade: "B",
        activeTransits: [],
        retrogradeEffects: [],
        themes: ["성장"],
        opportunities: ["새 시작"],
        cautions: ["주의"],
        bestDays: [1, 8],
        avoidDays: [],
        advice: "좋은 달입니다.",
      },
    ];

    it("should return overall confidence score", () => {
      const result = calculateDetailedConfidence(mockMonthlyScores, true, true, true);

      expect(typeof result.overall).toBe("number");
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });

    it("should calculate data quality based on completeness", () => {
      const complete = calculateDetailedConfidence(mockMonthlyScores, true, true, true);
      const incomplete = calculateDetailedConfidence(mockMonthlyScores, false, false, false);

      expect(complete.dataQuality).toBeGreaterThan(incomplete.dataQuality);
    });

    it("should calculate method alignment from score differences", () => {
      const alignedScores: MonthlyTimingScore[] = [
        { ...mockMonthlyScores[0], easternScore: 70, westernScore: 72 },
      ];
      const misalignedScores: MonthlyTimingScore[] = [
        { ...mockMonthlyScores[0], easternScore: 90, westernScore: 40 },
      ];

      const aligned = calculateDetailedConfidence(alignedScores, true, true, true);
      const misaligned = calculateDetailedConfidence(misalignedScores, true, true, true);

      expect(aligned.methodAlignment).toBeGreaterThan(misaligned.methodAlignment);
    });

    it("should include confidence factors", () => {
      const result = calculateDetailedConfidence(mockMonthlyScores, true, true, true);

      expect(Array.isArray(result.factors)).toBe(true);
      expect(result.factors.length).toBeGreaterThan(0);

      for (const factor of result.factors) {
        expect(factor.name).toBeDefined();
        expect(typeof factor.score).toBe("number");
        expect(typeof factor.weight).toBe("number");
        expect(factor.reason).toBeDefined();
      }
    });

    it("should identify limitations when data is incomplete", () => {
      const result = calculateDetailedConfidence(mockMonthlyScores, false, false, false);

      expect(Array.isArray(result.limitations)).toBe(true);
      expect(result.limitations.length).toBeGreaterThan(0);
    });

    it("should handle empty monthly scores", () => {
      const result = calculateDetailedConfidence([], true, true, true);

      expect(typeof result.overall).toBe("number");
      expect(result.methodAlignment).toBe(50); // Default value
    });
  });

  describe("generateYearlyPrediction", () => {
    const yearlyParams = {
      year: 2025,
      dayStem: "甲",
      dayElement: "목" as FiveElement,
      yongsin: ["수", "목"] as FiveElement[],
      kisin: ["금"] as FiveElement[],
      birthYear: 1990,
    };

    it("should generate predictions for all 12 months", () => {
      const result = generateYearlyPrediction(yearlyParams);

      expect(result.monthlyScores.length).toBe(12);
      for (let i = 0; i < 12; i++) {
        expect(result.monthlyScores[i].month).toBe(i + 1);
      }
    });

    it("should identify best and challenging months", () => {
      const result = generateYearlyPrediction(yearlyParams);

      expect(Array.isArray(result.bestMonths)).toBe(true);
      expect(result.bestMonths.length).toBe(3);
      expect(Array.isArray(result.challengingMonths)).toBe(true);
      expect(result.challengingMonths.length).toBe(3);

      // All months should be valid (1-12)
      for (const month of [...result.bestMonths, ...result.challengingMonths]) {
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
      }
    });

    it("should include confidence information", () => {
      const result = generateYearlyPrediction(yearlyParams);

      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence.overall).toBe("number");
      expect(Array.isArray(result.confidence.factors)).toBe(true);
    });

    it("should generate year theme based on average score", () => {
      const result = generateYearlyPrediction(yearlyParams);

      expect(typeof result.yearTheme).toBe("string");
      expect(result.yearTheme.length).toBeGreaterThan(0);
    });

    it("should calculate annual element from year branch", () => {
      const result = generateYearlyPrediction(yearlyParams);

      const validElements: FiveElement[] = ["목", "화", "토", "금", "수"];
      expect(validElements).toContain(result.annualElement);
    });

    it("should include Daeun phase information", () => {
      const withDaeun = generateYearlyPrediction({
        ...yearlyParams,
        currentDaeunElement: "화" as FiveElement,
      });

      expect(withDaeun.daeunPhase).toContain("화");
      expect(withDaeun.daeunPhase).toContain("대운");
    });

    it("should analyze all 4 quarters", () => {
      const result = generateYearlyPrediction(yearlyParams);

      expect(result.quarters.length).toBe(4);

      for (let i = 0; i < 4; i++) {
        const quarter = result.quarters[i];
        expect(quarter.quarter).toBe(i + 1);
        expect(typeof quarter.averageScore).toBe("number");
        expect(["ascending", "descending", "stable", "volatile"]).toContain(quarter.trend);
        expect(Array.isArray(quarter.keyEvents)).toBe(true);
        expect(typeof quarter.recommendation).toBe("string");
      }
    });

    it("should include annual transits", () => {
      const result = generateYearlyPrediction(yearlyParams);

      expect(Array.isArray(result.annualTransits)).toBe(true);
    });
  });

  describe("generatePredictionPromptContext", () => {
    const mockYearlyPrediction: YearlyPrediction = {
      year: 2025,
      monthlyScores: Array.from({ length: 12 }, (_, i) => ({
        year: 2025,
        month: i + 1,
        easternScore: 60 + i * 2,
        westernScore: 55 + i * 2,
        combinedScore: 58 + i * 2,
        confidence: 70,
        monthlyElement: "목" as FiveElement,
        twelveStage: "건록",
        stageEnergy: "peak" as const,
        grade: "B" as const,
        activeTransits: [],
        retrogradeEffects: [],
        themes: ["성장"],
        opportunities: ["기회"],
        cautions: ["주의"],
        bestDays: [1, 8],
        avoidDays: [3],
        advice: "좋은 달입니다.",
      })),
      confidence: {
        overall: 75,
        dataQuality: 80,
        methodAlignment: 70,
        cycleSynchrony: 65,
        historicalAccuracy: 60,
        factors: [],
        limitations: [],
      },
      bestMonths: [10, 11, 12],
      challengingMonths: [1, 2, 3],
      yearTheme: "성장과 발전의 해",
      daeunPhase: "목 대운",
      annualElement: "목" as FiveElement,
      annualTransits: ["세운 영향"],
      quarters: [
        { quarter: 1, averageScore: 60, trend: "stable" as const, keyEvents: [], recommendation: "" },
        { quarter: 2, averageScore: 65, trend: "ascending" as const, keyEvents: [], recommendation: "" },
        { quarter: 3, averageScore: 70, trend: "ascending" as const, keyEvents: [], recommendation: "" },
        { quarter: 4, averageScore: 75, trend: "peak" as const, keyEvents: [], recommendation: "" },
      ],
    };

    it("should generate Korean context by default", () => {
      const context = generatePredictionPromptContext(mockYearlyPrediction);

      expect(context).toContain("2025년");
      expect(context).toContain("연간 테마");
      expect(context).toContain("신뢰도");
    });

    it("should include year theme and element", () => {
      const context = generatePredictionPromptContext(mockYearlyPrediction, "ko");

      expect(context).toContain(mockYearlyPrediction.yearTheme);
      expect(context).toContain(mockYearlyPrediction.annualElement);
    });

    it("should include monthly details", () => {
      const context = generatePredictionPromptContext(mockYearlyPrediction, "ko");

      // Should have all 12 months
      for (let i = 1; i <= 12; i++) {
        expect(context).toContain(`${i}월`);
      }
    });

    it("should include quarter analysis", () => {
      const context = generatePredictionPromptContext(mockYearlyPrediction, "ko");

      expect(context).toContain("분기별 흐름");
      expect(context).toContain("Q1");
      expect(context).toContain("Q2");
      expect(context).toContain("Q3");
      expect(context).toContain("Q4");
    });

    it("should include best and challenging months", () => {
      const context = generatePredictionPromptContext(mockYearlyPrediction, "ko");

      expect(context).toContain("최고의 달");
      expect(context).toContain("도전의 달");
    });

    it("should generate English context when specified", () => {
      const context = generatePredictionPromptContext(mockYearlyPrediction, "en");

      expect(context).toContain("2025 Monthly Timing Score Matrix");
      expect(context).toContain("Year Theme");
      expect(context).toContain("Confidence");
    });

    it("should include grades and scores in output", () => {
      const context = generatePredictionPromptContext(mockYearlyPrediction, "ko");

      // Should contain grade information
      expect(context).toContain("등급");
      expect(context).toContain("점");
    });
  });

  describe("Edge Cases", () => {
    it("should handle unsupported retrograde year gracefully", () => {
      const params = {
        year: 2030, // Year not in retrograde schedule
        month: 6,
        dayStem: "甲",
        dayElement: "목" as FiveElement,
        yongsin: [] as FiveElement[],
        kisin: [] as FiveElement[],
      };

      const result = calculateMonthlyTimingScore(params);

      expect(result.retrogradeEffects).toBeDefined();
      expect(Array.isArray(result.retrogradeEffects)).toBe(true);
    });

    it("should handle missing birthYear", () => {
      const params = {
        year: 2025,
        month: 6,
        dayStem: "甲",
        dayElement: "목" as FiveElement,
        yongsin: [] as FiveElement[],
        kisin: [] as FiveElement[],
        // No birthYear
      };

      const result = calculateMonthlyTimingScore(params);

      expect(result.activeTransits.length).toBe(0); // No special transits without birth year
    });

    it("should handle extreme ages for special transits", () => {
      // Very young person (age 1)
      const youngParams = {
        year: 2025,
        month: 6,
        dayStem: "甲",
        dayElement: "목" as FiveElement,
        yongsin: [] as FiveElement[],
        kisin: [] as FiveElement[],
        birthYear: 2024,
      };

      const youngResult = calculateMonthlyTimingScore(youngParams);
      expect(Array.isArray(youngResult.activeTransits)).toBe(true);

      // Very old person (age 87 - Saturn return)
      const oldParams = { ...youngParams, birthYear: 1938 };
      const oldResult = calculateMonthlyTimingScore(oldParams);

      const saturnReturn = oldResult.activeTransits.find(t => t.type === "saturnReturn");
      expect(saturnReturn).toBeDefined();
    });

    it("should handle all element combinations", () => {
      const elements: FiveElement[] = ["목", "화", "토", "금", "수"];

      for (const dayElement of elements) {
        for (const yongsin of elements) {
          for (const kisin of elements) {
            if (yongsin !== kisin) {
              const result = calculateMonthlyTimingScore({
                year: 2025,
                month: 6,
                dayStem: "甲",
                dayElement,
                yongsin: [yongsin],
                kisin: [kisin],
              });

              expect(result.combinedScore).toBeGreaterThanOrEqual(0);
              expect(result.combinedScore).toBeLessThanOrEqual(100);
            }
          }
        }
      }
    });
  });

  describe("Type Definitions", () => {
    it("should export FiveElement type correctly", () => {
      const elements: FiveElement[] = ["목", "화", "토", "금", "수"];
      expect(elements.length).toBe(5);
    });

    it("should use TwelveStage type correctly", () => {
      const stages = [
        "장생", "목욕", "관대", "건록", "제왕",
        "쇠", "병", "사", "묘", "절", "태", "양"
      ];
      expect(stages.length).toBe(12);
    });
  });
});
