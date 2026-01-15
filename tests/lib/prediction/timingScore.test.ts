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
