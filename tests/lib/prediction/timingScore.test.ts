/**
 * Timing Score Tests
 *
 * Tests for monthly timing score and prediction confidence system
 */


import type {
  FiveElement,
  TwelveStage,
  MonthlyTimingScore,
  TransitEffect,
  RetrogradeEffect,
  PredictionConfidence,
  ConfidenceFactor,
  YearlyPrediction,
  QuarterAnalysis,
} from "@/lib/prediction/timingScore";

describe("FiveElement type", () => {
  it("includes 목 (wood)", () => {
    const element: FiveElement = "목";
    expect(element).toBe("목");
  });

  it("includes 화 (fire)", () => {
    const element: FiveElement = "화";
    expect(element).toBe("화");
  });

  it("includes 토 (earth)", () => {
    const element: FiveElement = "토";
    expect(element).toBe("토");
  });

  it("includes 금 (metal)", () => {
    const element: FiveElement = "금";
    expect(element).toBe("금");
  });

  it("includes 수 (water)", () => {
    const element: FiveElement = "수";
    expect(element).toBe("수");
  });
});

describe("TwelveStage type", () => {
  const stages: TwelveStage[] = [
    "장생", "목욕", "관대", "건록", "제왕", "쇠",
    "병", "사", "묘", "절", "태", "양"
  ];

  it("has 12 stages", () => {
    expect(stages).toHaveLength(12);
  });

  it("includes 장생 (birth)", () => {
    expect(stages).toContain("장생");
  });

  it("includes 제왕 (peak)", () => {
    expect(stages).toContain("제왕");
  });

  it("includes 사 (death)", () => {
    expect(stages).toContain("사");
  });

  it("includes 절 (termination)", () => {
    expect(stages).toContain("절");
  });
});

describe("MonthlyTimingScore interface", () => {
  it("has year and month fields", () => {
    const score: Partial<MonthlyTimingScore> = {
      year: 2025,
      month: 6,
    };
    expect(score.year).toBe(2025);
    expect(score.month).toBe(6);
  });

  it("has eastern analysis fields", () => {
    const score: Partial<MonthlyTimingScore> = {
      easternScore: 75,
      monthlyElement: "화",
      twelveStage: "건록",
      stageEnergy: "peak",
    };
    expect(score.easternScore).toBe(75);
    expect(score.monthlyElement).toBe("화");
    expect(score.twelveStage).toBe("건록");
    expect(score.stageEnergy).toBe("peak");
  });

  it("has western analysis fields", () => {
    const score: Partial<MonthlyTimingScore> = {
      westernScore: 80,
      activeTransits: [],
      retrogradeEffects: [],
    };
    expect(score.westernScore).toBe(80);
    expect(Array.isArray(score.activeTransits)).toBe(true);
    expect(Array.isArray(score.retrogradeEffects)).toBe(true);
  });

  it("has combined score and confidence", () => {
    const score: Partial<MonthlyTimingScore> = {
      combinedScore: 77.5,
      confidence: 85,
      grade: "B+",
    };
    expect(score.combinedScore).toBe(77.5);
    expect(score.confidence).toBe(85);
    expect(score.grade).toBe("B+");
  });

  it("has interpretation fields", () => {
    const score: Partial<MonthlyTimingScore> = {
      themes: ["Career focus"],
      opportunities: ["Promotion possible"],
      cautions: ["Avoid conflicts"],
      bestDays: [5, 12, 20],
      avoidDays: [3, 17],
      advice: "Focus on career goals",
    };
    expect(score.themes).toContain("Career focus");
    expect(score.bestDays).toContain(12);
    expect(score.avoidDays).toContain(3);
  });
});

describe("Stage energy types", () => {
  const energyTypes = ["rising", "peak", "declining", "dormant"] as const;

  it("rising represents growth phase", () => {
    expect(energyTypes).toContain("rising");
  });

  it("peak represents maximum strength", () => {
    expect(energyTypes).toContain("peak");
  });

  it("declining represents waning phase", () => {
    expect(energyTypes).toContain("declining");
  });

  it("dormant represents resting phase", () => {
    expect(energyTypes).toContain("dormant");
  });
});

describe("TransitEffect interface", () => {
  it("has all required fields", () => {
    const effect: TransitEffect = {
      type: "saturnReturn",
      planet: "Saturn",
      aspect: "conjunction",
      score: -20,
      description: "Saturn return period",
    };

    expect(effect.type).toBe("saturnReturn");
    expect(effect.planet).toBe("Saturn");
    expect(effect.aspect).toBe("conjunction");
    expect(effect.score).toBe(-20);
    expect(effect.description).toBeDefined();
  });

  it("score can be negative for challenging transits", () => {
    const challengingEffect: TransitEffect = {
      type: "saturnSquare",
      planet: "Saturn",
      aspect: "square",
      score: -15,
      description: "Challenging Saturn aspect",
    };
    expect(challengingEffect.score).toBeLessThan(0);
  });

  it("score can be positive for beneficial transits", () => {
    const beneficialEffect: TransitEffect = {
      type: "jupiterTrine",
      planet: "Jupiter",
      aspect: "trine",
      score: 25,
      description: "Beneficial Jupiter aspect",
    };
    expect(beneficialEffect.score).toBeGreaterThan(0);
  });
});

describe("RetrogradeEffect interface", () => {
  it("has all required fields", () => {
    const effect: RetrogradeEffect = {
      planet: "Mercury",
      isRetrograde: true,
      score: -10,
      advice: ["Avoid signing contracts", "Double-check communications"],
    };

    expect(effect.planet).toBe("Mercury");
    expect(effect.isRetrograde).toBe(true);
    expect(effect.score).toBe(-10);
    expect(effect.advice).toHaveLength(2);
  });

  it("non-retrograde has positive or zero score", () => {
    const directEffect: RetrogradeEffect = {
      planet: "Venus",
      isRetrograde: false,
      score: 0,
      advice: [],
    };
    expect(directEffect.isRetrograde).toBe(false);
    expect(directEffect.score).toBe(0);
  });
});

describe("PredictionConfidence interface", () => {
  it("has overall score between 0-100", () => {
    const confidence: Partial<PredictionConfidence> = {
      overall: 85,
    };
    expect(confidence.overall).toBeGreaterThanOrEqual(0);
    expect(confidence.overall).toBeLessThanOrEqual(100);
  });

  it("has component scores", () => {
    const confidence: Partial<PredictionConfidence> = {
      dataQuality: 90,
      methodAlignment: 75,
      cycleSynchrony: 80,
      historicalAccuracy: 70,
    };
    expect(confidence.dataQuality).toBe(90);
    expect(confidence.methodAlignment).toBe(75);
    expect(confidence.cycleSynchrony).toBe(80);
    expect(confidence.historicalAccuracy).toBe(70);
  });

  it("has factors array", () => {
    const confidence: Partial<PredictionConfidence> = {
      factors: [
        { name: "Birth time accuracy", score: 90, weight: 0.3, reason: "Exact time known" },
      ],
      limitations: ["Historical patterns may not predict future"],
    };
    expect(confidence.factors).toHaveLength(1);
    expect(confidence.limitations).toContain("Historical patterns may not predict future");
  });
});

describe("ConfidenceFactor interface", () => {
  it("has name, score, weight, and reason", () => {
    const factor: ConfidenceFactor = {
      name: "Data completeness",
      score: 95,
      weight: 0.25,
      reason: "All required birth data provided",
    };

    expect(factor.name).toBe("Data completeness");
    expect(factor.score).toBe(95);
    expect(factor.weight).toBe(0.25);
    expect(factor.reason).toBeDefined();
  });

  it("weight should be between 0 and 1", () => {
    const factor: ConfidenceFactor = {
      name: "Test",
      score: 50,
      weight: 0.5,
      reason: "Test reason",
    };
    expect(factor.weight).toBeGreaterThanOrEqual(0);
    expect(factor.weight).toBeLessThanOrEqual(1);
  });
});

describe("YearlyPrediction interface", () => {
  it("has year field", () => {
    const prediction: Partial<YearlyPrediction> = {
      year: 2025,
    };
    expect(prediction.year).toBe(2025);
  });

  it("has monthlyScores array", () => {
    const prediction: Partial<YearlyPrediction> = {
      monthlyScores: [],
    };
    expect(Array.isArray(prediction.monthlyScores)).toBe(true);
  });

  it("has yearly summary fields", () => {
    const prediction: Partial<YearlyPrediction> = {
      bestMonths: [3, 7, 11],
      challengingMonths: [1, 6],
      yearTheme: "Growth and expansion",
      daeunPhase: "Rising fire phase",
      annualElement: "화",
      annualTransits: ["Jupiter trine Sun"],
    };

    expect(prediction.bestMonths).toContain(7);
    expect(prediction.challengingMonths).toContain(6);
    expect(prediction.yearTheme).toBe("Growth and expansion");
    expect(prediction.annualElement).toBe("화");
  });

  it("has quarters array", () => {
    const prediction: Partial<YearlyPrediction> = {
      quarters: [],
    };
    expect(Array.isArray(prediction.quarters)).toBe(true);
  });
});

describe("QuarterAnalysis interface", () => {
  it("has quarter number (1-4)", () => {
    const q1: QuarterAnalysis = {
      quarter: 1,
      averageScore: 75,
      trend: "ascending",
      keyEvents: ["New beginnings"],
    };
    const q4: QuarterAnalysis = {
      quarter: 4,
      averageScore: 65,
      trend: "descending",
      keyEvents: ["Year-end review"],
    };

    expect(q1.quarter).toBe(1);
    expect(q4.quarter).toBe(4);
  });

  it("has trend value", () => {
    const trends = ["ascending", "descending", "stable", "volatile"] as const;

    const ascendingQuarter: QuarterAnalysis = {
      quarter: 1,
      averageScore: 80,
      trend: "ascending",
      keyEvents: [],
    };

    expect(trends).toContain(ascendingQuarter.trend);
  });

  it("has averageScore", () => {
    const quarter: QuarterAnalysis = {
      quarter: 2,
      averageScore: 72.5,
      trend: "stable",
      keyEvents: [],
    };
    expect(quarter.averageScore).toBe(72.5);
  });

  it("has keyEvents array", () => {
    const quarter: QuarterAnalysis = {
      quarter: 3,
      averageScore: 68,
      trend: "volatile",
      keyEvents: ["Career change", "Relationship milestone"],
    };
    expect(quarter.keyEvents).toHaveLength(2);
  });
});

describe("Prediction grades", () => {
  const grades = ["S", "A+", "A", "B+", "B", "C+", "C", "D+", "D", "F"];

  it("S is the highest grade", () => {
    expect(grades[0]).toBe("S");
  });

  it("F is the lowest grade", () => {
    expect(grades[grades.length - 1]).toBe("F");
  });

  it("has 10 grade levels", () => {
    expect(grades).toHaveLength(10);
  });
});

describe("Twelve stages energy mapping", () => {
  const stageEnergy: Record<TwelveStage, "rising" | "peak" | "declining" | "dormant"> = {
    장생: "rising",
    목욕: "rising",
    관대: "rising",
    건록: "peak",
    제왕: "peak",
    쇠: "declining",
    병: "declining",
    사: "declining",
    묘: "dormant",
    절: "dormant",
    태: "rising",
    양: "rising",
  };

  it("장생 is rising", () => {
    expect(stageEnergy["장생"]).toBe("rising");
  });

  it("제왕 is peak", () => {
    expect(stageEnergy["제왕"]).toBe("peak");
  });

  it("쇠 is declining", () => {
    expect(stageEnergy["쇠"]).toBe("declining");
  });

  it("절 is dormant", () => {
    expect(stageEnergy["절"]).toBe("dormant");
  });
});

// ============================================================
// Function Tests
// ============================================================

import {
  calculateMonthlyTimingScore,
  calculateDetailedConfidence,
  generateYearlyPrediction,
  generatePredictionPromptContext,
} from "@/lib/prediction/timingScore";

describe("calculateMonthlyTimingScore", () => {
  const baseParams = {
    year: 2024,
    month: 6,
    dayStem: "庚",
    dayElement: "금" as FiveElement,
    yongsin: ["수", "목"] as FiveElement[],
    kisin: ["화"] as FiveElement[],
  };

  describe("basic calculation", () => {
    it("returns monthly timing score object with all fields", () => {
      const result = calculateMonthlyTimingScore(baseParams);

      expect(result).toHaveProperty("year", 2024);
      expect(result).toHaveProperty("month", 6);
      expect(result).toHaveProperty("easternScore");
      expect(result).toHaveProperty("westernScore");
      expect(result).toHaveProperty("combinedScore");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("grade");
      expect(result).toHaveProperty("monthlyElement");
      expect(result).toHaveProperty("twelveStage");
      expect(result).toHaveProperty("stageEnergy");
    });

    it("returns scores within valid range 0-100", () => {
      const result = calculateMonthlyTimingScore(baseParams);

      expect(result.easternScore).toBeGreaterThanOrEqual(0);
      expect(result.easternScore).toBeLessThanOrEqual(100);
      expect(result.westernScore).toBeGreaterThanOrEqual(0);
      expect(result.westernScore).toBeLessThanOrEqual(100);
      expect(result.combinedScore).toBeGreaterThanOrEqual(0);
      expect(result.combinedScore).toBeLessThanOrEqual(100);
    });

    it("returns monthly element from five elements", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(["목", "화", "토", "금", "수"]).toContain(result.monthlyElement);
    });

    it("returns valid twelve stage", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      const validStages = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"];
      expect(validStages).toContain(result.twelveStage);
    });

    it("returns valid stage energy", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(["rising", "peak", "declining", "dormant"]).toContain(result.stageEnergy);
    });

    it("returns valid grade", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(["S", "A", "B", "C", "D", "F"]).toContain(result.grade);
    });
  });

  describe("yongsin/kisin effects", () => {
    it("yongsin match increases eastern score", () => {
      const paramsWithYongsinMatch = {
        ...baseParams,
        month: 2, // 목 month
        yongsin: ["목"] as FiveElement[],
        kisin: [] as FiveElement[],
      };

      const paramsWithKisinMatch = {
        ...baseParams,
        month: 2, // 목 month
        yongsin: [] as FiveElement[],
        kisin: ["목"] as FiveElement[],
      };

      const yongsinResult = calculateMonthlyTimingScore(paramsWithYongsinMatch);
      const kisinResult = calculateMonthlyTimingScore(paramsWithKisinMatch);

      expect(yongsinResult.easternScore).toBeGreaterThan(kisinResult.easternScore);
    });
  });

  describe("daeun effect", () => {
    it("processes daeun element when provided", () => {
      const paramsWithDaeun = {
        ...baseParams,
        currentDaeunElement: "수" as FiveElement,
      };

      const result = calculateMonthlyTimingScore(paramsWithDaeun);
      expect(result.easternScore).toBeDefined();
    });
  });

  describe("planetary return effects", () => {
    it("includes jupiter return for multiples of 12 years age", () => {
      const paramsWithBirthYear = {
        ...baseParams,
        year: 2024,
        birthYear: 2012, // age 12
      };

      const result = calculateMonthlyTimingScore(paramsWithBirthYear);
      const hasJupiterReturn = result.activeTransits.some(
        (t) => t.type === "jupiterReturn"
      );
      expect(hasJupiterReturn).toBe(true);
    });

    it("includes saturn return at age 29", () => {
      const paramsWithBirthYear = {
        ...baseParams,
        year: 2024,
        birthYear: 1995, // age 29
      };

      const result = calculateMonthlyTimingScore(paramsWithBirthYear);
      const hasSaturnReturn = result.activeTransits.some(
        (t) => t.type === "saturnReturn"
      );
      expect(hasSaturnReturn).toBe(true);
    });

    it("includes saturn return at age 58", () => {
      const paramsWithBirthYear = {
        ...baseParams,
        year: 2024,
        birthYear: 1966, // age 58
      };

      const result = calculateMonthlyTimingScore(paramsWithBirthYear);
      const hasSaturnReturn = result.activeTransits.some(
        (t) => t.type === "saturnReturn"
      );
      expect(hasSaturnReturn).toBe(true);
    });
  });

  describe("retrograde effects", () => {
    it("returns retrograde effects array", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(Array.isArray(result.retrogradeEffects)).toBe(true);
    });
  });

  describe("themes and advice", () => {
    it("returns themes array", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(Array.isArray(result.themes)).toBe(true);
      expect(result.themes.length).toBeGreaterThan(0);
    });

    it("returns opportunities array", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(Array.isArray(result.opportunities)).toBe(true);
    });

    it("returns cautions array", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(Array.isArray(result.cautions)).toBe(true);
    });

    it("returns advice string", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(typeof result.advice).toBe("string");
      expect(result.advice.length).toBeGreaterThan(0);
    });
  });

  describe("best/avoid days", () => {
    it("returns best days array", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(Array.isArray(result.bestDays)).toBe(true);
    });

    it("returns avoid days array", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      expect(Array.isArray(result.avoidDays)).toBe(true);
    });

    it("best days are within valid range", () => {
      const result = calculateMonthlyTimingScore(baseParams);
      for (const day of result.bestDays) {
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(31);
      }
    });
  });

  describe("all months calculation", () => {
    const elements: FiveElement[] = ["목", "화", "토", "금", "수"];

    for (let month = 1; month <= 12; month++) {
      it(`calculates correctly for month ${month}`, () => {
        const result = calculateMonthlyTimingScore({
          ...baseParams,
          month,
        });

        expect(result.month).toBe(month);
        expect(elements).toContain(result.monthlyElement);
      });
    }
  });

  describe("all day elements", () => {
    const elements: FiveElement[] = ["목", "화", "토", "금", "수"];

    for (const element of elements) {
      it(`calculates score for day element ${element}`, () => {
        const result = calculateMonthlyTimingScore({
          ...baseParams,
          dayElement: element,
        });

        expect(result.easternScore).toBeGreaterThanOrEqual(0);
        expect(result.easternScore).toBeLessThanOrEqual(100);
      });
    }
  });
});

describe("calculateDetailedConfidence", () => {
  const mockMonthlyScores: MonthlyTimingScore[] = [
    {
      year: 2024,
      month: 1,
      easternScore: 70,
      westernScore: 75,
      combinedScore: 72,
      monthlyElement: "토",
      twelveStage: "장생",
      stageEnergy: "rising",
      activeTransits: [],
      retrogradeEffects: [],
      confidence: 70,
      grade: "B",
      themes: ["테스트"],
      opportunities: ["기회"],
      cautions: ["주의"],
      bestDays: [1, 8],
      avoidDays: [],
      advice: "조언",
    },
  ];

  it("returns overall confidence within 0-100", () => {
    const result = calculateDetailedConfidence(mockMonthlyScores, true, true, true);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("returns data quality score", () => {
    const result = calculateDetailedConfidence(mockMonthlyScores, true, true, true);
    expect(result.dataQuality).toBeGreaterThanOrEqual(0);
    expect(result.dataQuality).toBeLessThanOrEqual(100);
  });

  it("returns method alignment score", () => {
    const result = calculateDetailedConfidence(mockMonthlyScores, true, true, true);
    expect(result.methodAlignment).toBeGreaterThanOrEqual(0);
    expect(result.methodAlignment).toBeLessThanOrEqual(100);
  });

  it("higher data quality with complete data", () => {
    const completeResult = calculateDetailedConfidence(mockMonthlyScores, true, true, true);
    const incompleteResult = calculateDetailedConfidence(mockMonthlyScores, false, false, false);

    expect(completeResult.dataQuality).toBeGreaterThan(incompleteResult.dataQuality);
  });

  it("returns factors array", () => {
    const result = calculateDetailedConfidence(mockMonthlyScores, true, true, true);
    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("includes limitation when data incomplete", () => {
    const result = calculateDetailedConfidence(mockMonthlyScores, false, false, false);
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it("handles empty monthly scores", () => {
    const result = calculateDetailedConfidence([], true, true, true);
    expect(result.overall).toBeDefined();
    expect(result.methodAlignment).toBe(50);
  });

  it("returns cycle synchrony", () => {
    const result = calculateDetailedConfidence(mockMonthlyScores, true, true, true);
    expect(result.cycleSynchrony).toBeDefined();
  });

  it("returns historical accuracy", () => {
    const result = calculateDetailedConfidence(mockMonthlyScores, true, true, true);
    expect(result.historicalAccuracy).toBeDefined();
  });
});

describe("generateYearlyPrediction", () => {
  const baseParams = {
    year: 2024,
    dayStem: "庚",
    dayElement: "금" as FiveElement,
    yongsin: ["수", "목"] as FiveElement[],
    kisin: ["화"] as FiveElement[],
  };

  it("returns yearly prediction with 12 monthly scores", () => {
    const result = generateYearlyPrediction(baseParams);

    expect(result.year).toBe(2024);
    expect(result.monthlyScores).toHaveLength(12);
  });

  it("returns confidence object", () => {
    const result = generateYearlyPrediction(baseParams);
    expect(result.confidence).toBeDefined();
    expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
  });

  it("returns 3 best months", () => {
    const result = generateYearlyPrediction(baseParams);
    expect(Array.isArray(result.bestMonths)).toBe(true);
    expect(result.bestMonths.length).toBe(3);
  });

  it("returns 3 challenging months", () => {
    const result = generateYearlyPrediction(baseParams);
    expect(Array.isArray(result.challengingMonths)).toBe(true);
    expect(result.challengingMonths.length).toBe(3);
  });

  it("returns year theme", () => {
    const result = generateYearlyPrediction(baseParams);
    expect(typeof result.yearTheme).toBe("string");
    expect(result.yearTheme.length).toBeGreaterThan(0);
  });

  it("returns annual element", () => {
    const result = generateYearlyPrediction(baseParams);
    expect(["목", "화", "토", "금", "수"]).toContain(result.annualElement);
  });

  it("returns 4 quarters analysis", () => {
    const result = generateYearlyPrediction(baseParams);
    expect(result.quarters).toHaveLength(4);

    for (const quarter of result.quarters) {
      expect([1, 2, 3, 4]).toContain(quarter.quarter);
      expect(quarter.averageScore).toBeGreaterThanOrEqual(0);
      expect(quarter.averageScore).toBeLessThanOrEqual(100);
      expect(["ascending", "descending", "stable", "volatile"]).toContain(quarter.trend);
      expect(typeof quarter.recommendation).toBe("string");
    }
  });

  it("returns default daeun phase when not provided", () => {
    const result = generateYearlyPrediction(baseParams);
    expect(result.daeunPhase).toBe("대운 정보 없음");
  });

  it("returns daeun phase when provided", () => {
    const resultWithDaeun = generateYearlyPrediction({
      ...baseParams,
      currentDaeunElement: "수" as FiveElement,
    });
    expect(resultWithDaeun.daeunPhase).toBe("수 대운");
  });

  it("monthly scores are ordered by month", () => {
    const result = generateYearlyPrediction(baseParams);

    for (let i = 0; i < 12; i++) {
      expect(result.monthlyScores[i].month).toBe(i + 1);
    }
  });

  it("returns annual transits", () => {
    const result = generateYearlyPrediction(baseParams);
    expect(Array.isArray(result.annualTransits)).toBe(true);
  });
});

describe("generatePredictionPromptContext", () => {
  const baseParams = {
    year: 2024,
    dayStem: "庚",
    dayElement: "금" as FiveElement,
    yongsin: ["수", "목"] as FiveElement[],
    kisin: ["화"] as FiveElement[],
  };

  it("generates Korean prompt context", () => {
    const yearly = generateYearlyPrediction(baseParams);
    const result = generatePredictionPromptContext(yearly, "ko");

    expect(typeof result).toBe("string");
    expect(result).toContain("2024년");
    expect(result).toContain("연간 테마");
    expect(result).toContain("월별 상세");
    expect(result).toContain("분기별 흐름");
  });

  it("generates English prompt context", () => {
    const yearly = generateYearlyPrediction(baseParams);
    const result = generatePredictionPromptContext(yearly, "en");

    expect(typeof result).toBe("string");
    expect(result).toContain("2024");
    expect(result).toContain("Year Theme");
    expect(result).toContain("Confidence");
  });

  it("includes all 12 months in Korean", () => {
    const yearly = generateYearlyPrediction(baseParams);
    const result = generatePredictionPromptContext(yearly, "ko");

    for (let i = 1; i <= 12; i++) {
      expect(result).toContain(`${i}월:`);
    }
  });

  it("includes quarterly summary in Korean", () => {
    const yearly = generateYearlyPrediction(baseParams);
    const result = generatePredictionPromptContext(yearly, "ko");

    expect(result).toContain("Q1:");
    expect(result).toContain("Q2:");
    expect(result).toContain("Q3:");
    expect(result).toContain("Q4:");
  });

  it("defaults to Korean when no language specified", () => {
    const yearly = generateYearlyPrediction(baseParams);
    const result = generatePredictionPromptContext(yearly);

    expect(result).toContain("연간 테마");
  });

  it("includes best and challenging months in Korean", () => {
    const yearly = generateYearlyPrediction(baseParams);
    const result = generatePredictionPromptContext(yearly, "ko");

    expect(result).toContain("최고의 달:");
    expect(result).toContain("도전의 달:");
  });
});
